import asyncio
import os
import json
import pandas as pd
from google import genai
from google.genai import types
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

# ---------------------------------------------------------------------------
# MCP CLIENT SETUP
# ---------------------------------------------------------------------------
async def setup_mcp_client():
    # Load config
    with open("mcp_config.json", "r") as f:
        config = json.load(f)
        
    bq_config = config["mcpServers"]["bigquery"]
    
    # Set the environment variable for Google Credentials
    env = os.environ.copy()
    if "env" in bq_config and "GOOGLE_APPLICATION_CREDENTIALS" in bq_config["env"]:
        env["GOOGLE_APPLICATION_CREDENTIALS"] = bq_config["env"]["GOOGLE_APPLICATION_CREDENTIALS"]
    
    server_params = StdioServerParameters(
        command=bq_config["command"],
        args=bq_config["args"],
        env=env
    )
    
    return stdio_client(server_params)


# =====================================================================
# 1. THE CUSTOM TOOL (THE "SECRET SAUCE")
# =====================================================================
async def analyze_anchor_fallout_logic(employer_name: str) -> str:
    """
    Core business logic tool for the Anchor Closure track.
    Executes a 2-way graph traversal and calculates actual financial vulnerability.
    """
    
    # THE GQL QUERY
    gql_query = f"""
    GRAPH a4i_econ.LocalEconomy
    MATCH p = (anchor:Employer WHERE anchor.name = '{employer_name}')
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
                result = await session.call_tool("bigquery", "query", {"query": gql_query})
                
                if not result.content:
                    return "No results found or error connecting to BigQuery."
                    
                try:
                    raw_data = json.loads(result.content[0].text)
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
# 2. ADK TOOL DEFINITION
# =====================================================================
def analyze_anchor_fallout(employer_name: str) -> str:
    """
    Use this tool when an anchor employer is closing.
    It calculates the hidden supply-chain shockwave.
    """
    return asyncio.run(analyze_anchor_fallout_logic(employer_name))

# =====================================================================
# 3. AGENT CONFIGURATION & HANDOFF API
# =====================================================================
def run_agent(employer_name: str) -> str:
    """Entry point for the Front-End Lead to call."""
    
    if "GEMINI_API_KEY" not in os.environ:
        return "ERROR: You must export GEMINI_API_KEY before running this."

    client = genai.Client()
    
    system_instruction = """
    You are a City Economic Development Officer. You have a $50k emergency micro-grant fund.
    1. You must ALWAYS use the `analyze_anchor_fallout` tool.
    2. You must recommend funding the "hidden linchpin" suppliers identified by the tool.
    3. Explicitly state your assumptions based on BEA federal rates.
    Format your response as a formal "Emergency Grant Recommendation Memo".
    """
    
    print(f"Agent is analyzing the closure of: {employer_name}...")
    
    # Use Chats API as recommended by the new GenAI SDK, and upgrade model version
    chat = client.chats.create(
        model='gemini-3.1-pro-preview',
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[analyze_anchor_fallout],
            temperature=0.2,
        )
    )
    
    response = chat.send_message(f"The {employer_name} is closing in 90 days. Who should we give our emergency micro-grants to?")
    return response.text

if __name__ == "__main__":
    print(run_agent("Mint Plaza Office Block"))
