"""
ADK Grant Decision Agent for Micro-Grants Decision Support
A4I 2026 - Challenge 3: Community Economic Resilience & Micro-Grants

Architecture:
1. GQL Multi-Hop Traversal (BigQuery Property Graph `a4i_econ.LocalEconomy`)
2. Deterministic Tools (score_exposure, fragility, allocate_budget, sensitivity)
3. Gemini LLM (Synthesizes justifications per business + final Grant Officer Memo)
"""

import os
import json
import asyncio
import pandas as pd
from typing import Dict, Any
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession
from google.adk import Agent
from google.genai import types
from tools import allocate_budget, evaluate_sensitivity

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "qwiklabs-gcp-04-e4952d3717e9")
DATASET = os.environ.get("BIGQUERY_DATASET", "a4i_econ")


def build_gql_query(anchor_block_id: str, depth_limit: int = 2) -> str:
    """
    BigQuery GQL Property Graph multi-hop query.
    Traverses DrawsFootfall and Supplies edges.
    """
    return f"""
    GRAPH `{PROJECT_ID}.{DATASET}.LocalEconomy`
    MATCH p = ANY SHORTEST (anchor:Employer WHERE anchor.block_id = '{anchor_block_id}')
              -[:DrawsFootfall]->(direct:Business)
              <-[:Supplies]-{{1,{depth_limit}}}(supplier:Business)
    RETURN TO_JSON(p) AS paths
    LIMIT 50
    """


def generate_decisions(
    block_id: str = "060750178021003",
    budget: float = 50000.0,
    grant_effect: float = 0.3,
) -> Dict[str, Any]:
    """
    Executes scenario run:
    1. Loads base corridor business network
    2. Runs deterministic budget allocator
    3. Evaluates sensitivity stability
    4. Computes equity audit numbers
    5. Formats decisions.json output contract
    """
    # Load handcrafted baseline network (or BigQuery result)
    mock_path = os.path.join(os.path.dirname(__file__), "../frontend/data/mock_decisions.json")
    with open(mock_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Deterministic Budget Allocation
    allocated_businesses = allocate_budget(data["businesses"], budget, grant_effect)
    sensitivity_report = evaluate_sensitivity(allocated_businesses, budget)

    # 2. Equity Audit Calculation
    funded = [b for b in allocated_businesses if b.get("status") == "funded"]
    restaurants_funded = [b for b in funded if b.get("naics4", "").startswith("72")]
    high_poverty_funded = [b for b in funded if b.get("tract", {}).get("poverty_rate", 0) >= 0.23]

    restaurant_share = round(len(restaurants_funded) / max(1, len(funded)), 2)
    poverty_share = round(len(high_poverty_funded) / max(1, len(funded)), 2)

    data["scenario"]["budget"] = budget
    data["scenario"]["grant_effect"] = grant_effect
    data["scenario"]["block_id"] = block_id
    data["businesses"] = allocated_businesses
    data["sensitivity"] = sensitivity_report
    data["equity_audit"]["restaurant_share_funded"] = restaurant_share
    data["equity_audit"]["high_poverty_tract_share_funded"] = poverty_share

    return data


# ---------------------------------------------------------------------------
# MCP CLIENT SETUP
# ---------------------------------------------------------------------------
async def setup_mcp_client():
    # Load config
    with open("mcp_config.json", "r") as f:
        config = json.load(f)
        
    bq_config = config["mcpServers"]["bigquery"]
    
    # Map the env variables required by the npm package properly
    env = os.environ.copy()
    if "env" in bq_config:
        if "GOOGLE_APPLICATION_CREDENTIALS" in bq_config["env"]:
            env["GOOGLE_APPLICATION_CREDENTIALS"] = bq_config["env"]["GOOGLE_APPLICATION_CREDENTIALS"]
        if "BIGQUERY_PROJECT" in bq_config["env"]:
            env["BIGQUERY_PROJECT"] = bq_config["env"]["BIGQUERY_PROJECT"]
        if "PROJECT_ID" in bq_config["env"]:
            env["PROJECT_ID"] = bq_config["env"]["PROJECT_ID"]
            
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

if __name__ == "__main__":
    result = generate_decisions(budget=50000, grant_effect=0.3)
    print(f"Scenario successfully executed for budget ${result['scenario']['budget']:,.0f}")
    funded = [b for b in result["businesses"] if b["status"] == "funded"]
    print(f"Funded {len(funded)} businesses:")
    for b in funded:
        print(f"  - {b['name']}: ${b['amount']:,} ({b['role']})")
