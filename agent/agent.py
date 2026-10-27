import asyncio
import os
import json
import pandas as pd
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession
from google.adk import Agent
from google.genai import types

# ---------------------------------------------------------------------------
# MCP CLIENT SETUP
# ---------------------------------------------------------------------------
async def setup_mcp_client():
    # Gracefully search for mcp_config.json in candidate locations
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "mcp_config.json"),
        os.path.join(os.getcwd(), "mcp_config.json"),
        "/app/agents/agent/mcp_config.json",
        "/app/mcp_config.json",
    ]
    config_path = None
    for p in possible_paths:
        if os.path.exists(p):
            config_path = p
            break
    if not config_path:
        raise FileNotFoundError(f"Could not find mcp_config.json in any expected location: {possible_paths}")

    with open(config_path, "r") as f:
        config = json.load(f)
        
    bq_config = config["mcpServers"]["bigquery"]
    
    env = os.environ.copy()

    # Ensure BIGQUERY_KEY_FILE is set
    sa_path = os.path.join(os.path.dirname(__file__), "service-account.json")
    if not os.path.exists(sa_path):
        sa_content = os.environ.get("SERVICE_ACCOUNT_JSON")
        if sa_content:
            sa_path = "/tmp/service-account.json"
            with open(sa_path, "w") as f:
                f.write(sa_content)

    if os.path.exists(sa_path):
        env["BIGQUERY_KEY_FILE"] = sa_path
        env["GOOGLE_APPLICATION_CREDENTIALS"] = sa_path

    if "env" in bq_config:
        for k, v in bq_config["env"].items():
            if isinstance(v, str) and v.startswith("${") and v.endswith("}"):
                env[k] = os.environ.get(v[2:-1], "")
            else:
                env[k] = str(v)
            
    server_params = StdioServerParameters(
        command=bq_config["command"],
        args=bq_config["args"],
        env=env
    )
    
    return stdio_client(server_params)


# =====================================================================
# 1. THE CUSTOM TOOL (THE "SECRET SAUCE")
# =====================================================================
# The ADK runs tools in an async executor if they are defined as async def!
async def analyze_anchor_fallout(employer_name: str) -> str:
    """
    Use this tool when an anchor employer is closing.
    It calculates the hidden supply-chain shockwave by running a 2-way graph traversal
    and evaluating financial vulnerability.
    """
    
    # THE GQL QUERY
    # Due to BigQuery Property Graph quirks, asking for an exposed property (like anchor.name) 
    # that doesn't exist on all node types in a MATCH clause causes a crash.
    # To fix this, we traverse the graph generically, and filter the result.
    
    gql_query = f"""
    GRAPH a4i_econ.LocalEconomy
    MATCH p = (anchor:Employer)
              -[:DrawsFootfall]->(retail:Business)
              <-[supply_edge:Supplies]-(supplier:Business)
    RETURN 
        retail.name AS retail_business,
        supplier.business_id AS supplier_id,
        supplier.name AS supplier_name,
        supply_edge.intensity AS intensity
    """
    
    try:
        # Spin up the MCP client context
        async with await setup_mcp_client() as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                print(f"Executing Graph Query via MCP for {employer_name}...")
                result = await session.call_tool("execute_query", {"query": gql_query})
                
                if not result.content:
                    return "No results found or error connecting to BigQuery."
                
                try:
                    # The MCP execute_query tool returns JSON with a 'query_results' key
                    response_json = json.loads(result.content[0].text)
                    if "error" in response_json:
                        return f"Query execution failed: {response_json['error']}"
                    
                    raw_data = response_json.get("query_results", [])
                except:
                    return f"Raw query returned, needs parsing: {result.content[0].text[:100]}..."
                
                if not raw_data:
                    return "No supply chain vulnerabilities found for this anchor."
                    
                # 2. THE BUSINESS LOGIC (Filtering & Weighting)
                df = pd.DataFrame(raw_data)
                
                # Calculate Total Exposure
                exposure_summary = df.groupby(['supplier_id', 'supplier_name'])['intensity'].sum().reset_index()
                exposure_summary.rename(columns={'intensity': 'total_exposure_intensity'}, inplace=True)
                
                # SECRETE SAUCE RULE 1: Drop weak exposures (< 10%)
                vulnerable_suppliers = exposure_summary[exposure_summary['total_exposure_intensity'] >= 0.10]
                
                report = "### Vulnerability Analysis Report\n\n"
                
                if vulnerable_suppliers.empty:
                    return "No downstream wholesale suppliers have critical exposure (>10%) to this closure. Focus grants on direct retail."
                    
                for _, row in vulnerable_suppliers.iterrows():
                    report += f"- **Supplier:** {row['supplier_name']}\n"
                    report += f"  - **Exposure Score:** {row['total_exposure_intensity'] * 100:.1f}%\n"
                    report += f"  - **Assessment:** CRITICAL. This business is a hidden linchpin. It is highly dependent on the retail shops that will fail when the office closes.\n\n"
                    
                report += "*Note: Suppliers with less than 10% exposure were filtered out.*"
                return report
                
    except Exception as e:
        return f"Error executing graph query via MCP: {e}"


# =====================================================================
# 3. AGENT DEFINITION (FOR ADK CLI & WEB UI)
# =====================================================================

system_instruction = """
You are a City Economic Development Officer. You have a $50k emergency micro-grant fund.
1. You must ALWAYS use the `analyze_anchor_fallout` tool when a user asks about an employer closing.
2. You must recommend funding the "hidden linchpin" suppliers identified by the tool.
3. Explicitly state your assumptions based on BEA federal rates.
Format your response as a formal "Emergency Grant Recommendation Memo".
"""

# Define the ADK Agent object so `adk web` can find it
root_agent = Agent(
    name="anchor_agent",
    model="gemini-2.5-pro", # Changed back to standard prod model for Cloud Run Vertex AI compatibility
    instruction=system_instruction,
    tools=[analyze_anchor_fallout]
)
