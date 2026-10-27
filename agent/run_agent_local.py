import asyncio
import os
import json
import pandas as pd
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# MCP CLIENT SETUP
# This code parses the mcp_config.json, spins up the Node.js BigQuery MCP server
# via `npx`, and establishes a communication channel so we can send GQL queries.
# ---------------------------------------------------------------------------
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

async def setup_mcp_client():
    # Load config
    with open("mcp_config.json", "r") as f:
        config = json.load(f)
        
    bq_config = config["mcpServers"]["bigquery"]
    
    # Set the environment variable for Google Credentials so the npx process picks it up
    env = os.environ.copy()
    if "env" in bq_config and "GOOGLE_APPLICATION_CREDENTIALS" in bq_config["env"]:
        env["GOOGLE_APPLICATION_CREDENTIALS"] = bq_config["env"]["GOOGLE_APPLICATION_CREDENTIALS"]
        # Ensure we pass through the path if it's absolute
    
    server_params = StdioServerParameters(
        command=bq_config["command"],
        args=bq_config["args"],
        env=env
    )
    
    return stdio_client(server_params)


# =====================================================================
# THE CUSTOM TOOL (THE "SECRET SAUCE")
# =====================================================================
async def analyze_anchor_fallout_logic(employer_name: str) -> str:
    """Executes a 2-way graph traversal via MCP to find hidden vulnerability."""
    
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
                # Initialize connection
                await session.initialize()
                
                # Execute the BigQuery query tool provided by the MCP server
                # Note: The specific tool name might be 'execute_query' or 'query'. 
                # Check the @server/bigquery documentation if this errors.
                print(f"Executing Graph Query via MCP for {employer_name}...")
                result = await session.call_tool("bigquery", "query", {"query": gql_query})
                
                # Extract results
                # MCP responses format text/json inside the content array
                if not result.content:
                    return "No results found or error connecting to BigQuery."
                    
                # Assuming the MCP server returns JSON string in the first text block
                try:
                    raw_data = json.loads(result.content[0].text)
                except:
                    # If it returns raw text
                    raw_data = result.content[0].text
                    print(f"Raw query output: {raw_data[:200]}...")
                    return f"Raw query returned, needs parsing: {raw_data[:100]}..."
                
                if not raw_data:
                    return "No supply chain vulnerabilities found for this anchor."
                    
                df = pd.DataFrame(raw_data)
                
                # Calculate Total Exposure per supplier across ALL affected retail shops
                exposure_summary = df.groupby(['supplier_id', 'supplier_name'])['intensity'].sum().reset_index()
                exposure_summary.rename(columns={'intensity': 'total_exposure_intensity'}, inplace=True)
                
                # SECRETE SAUCE RULE: Filter out weak exposures (< 10%)
                vulnerable_suppliers = exposure_summary[exposure_summary['total_exposure_intensity'] >= 0.10]
                
                report = "### Vulnerability Analysis Report\n\n"
                if vulnerable_suppliers.empty:
                    return "No downstream wholesale suppliers have critical exposure (>10%) to this closure."
                    
                for _, row in vulnerable_suppliers.iterrows():
                    report += f"- **Supplier:** {row['supplier_name']}\n"
                    report += f"  - **Exposure Score:** {row['total_exposure_intensity'] * 100:.1f}%\n"
                    report += f"  - **Assessment:** CRITICAL. This business is a hidden linchpin.\n\n"
                    
                return report
                
    except Exception as e:
        print(f"MCP Connection Error: {e}")
        return f"Error executing graph query: {e}"

# Synchronous wrapper for Gemini to call
def analyze_anchor_fallout(employer_name: str) -> str:
    """Use this tool when an anchor employer is closing to find hidden supply-chain shockwaves."""
    return asyncio.run(analyze_anchor_fallout_logic(employer_name))

# =====================================================================
# AGENT CONFIGURATION
# =====================================================================
def main():
    # Make sure you have exported GEMINI_API_KEY in your terminal
    if "GEMINI_API_KEY" not in os.environ:
        print("ERROR: You must export GEMINI_API_KEY before running this.")
        return

    client = genai.Client()
    
    system_instruction = """
    You are a City Economic Development Officer. You have a $50k emergency micro-grant fund.
    You MUST ALWAYS use the `analyze_anchor_fallout` tool to evaluate the closure.
    Write a formal "Emergency Grant Recommendation Memo" defending a micro-grant allocation 
    to protect the "hidden linchpin" suppliers identified by the tool.
    """
    
    employer = "Mint Plaza Office Block"
    print(f"Starting ADK Agent Analysis for: {employer}\n")
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=f"The {employer} is closing in 90 days. Who should we give our emergency micro-grants to?",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[analyze_anchor_fallout],
            temperature=0.2,
        )
    )
    
    print("\n================ FINAL MEMO ================\n")
    print(response.text)

if __name__ == "__main__":
    main()
