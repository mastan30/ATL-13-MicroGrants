import asyncio
import json
import pandas as pd
from typing import Dict, Any, List
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Note to Agent Lead: 
# This file requires the `mcp` python package to interact with the BigQuery server.
# In a real environment, you would use mcp.client.stdio.stdio_client to spin up 
# the server defined in mcp_config.json.
# 
# For this hackathon template, we define the tool logic that would wrap the MCP call.
# ---------------------------------------------------------------------------

# =====================================================================
# 1. THE CUSTOM TOOL (THE "SECRET SAUCE")
# =====================================================================
# The README states: "Consuming only prebuilt generic tools and calling that 
# your design does not count... The more valuable one holds the logic that is 
# not a single query: deciding what counts as exposure, weighting a path."

async def analyze_anchor_fallout_logic(employer_name: str, mcp_client=None) -> str:
    """
    Core business logic tool for the Anchor Closure track.
    Executes a 2-way graph traversal and calculates actual financial vulnerability
    rather than just listing connected nodes.
    """
    
    # 1. THE GQL QUERY (Provided by Data Lead)
    # This goes FORWARD from Employer to Retail (DrawsFootfall)
    # Then BACKWARD from Retail to Wholesale Supplier (Supplies)
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
    
    # Simulate executing the query via MCP Server
    # raw_results = await mcp_client.call_tool("bigquery", "execute_query", {"query": gql_query})
    
    # Simulated response from the MCP BigQuery server for demonstration
    simulated_results = [
        {"retail_business": "Sixth St Cafe", "supplier_id": "S1", "supplier_name": "Golden Grain Bakery", "intensity": 0.45},
        {"retail_business": "Yerba Deli", "supplier_id": "S1", "supplier_name": "Golden Grain Bakery", "intensity": 0.30},
        {"retail_business": "Sixth St Cafe", "supplier_id": "S2", "supplier_name": "Bayside Roasters", "intensity": 0.05},
        {"retail_business": "Kearny Kitchen", "supplier_id": "S3", "supplier_name": "Acme Restaurant Supply", "intensity": 0.02}
    ]
    
    # 2. THE BUSINESS LOGIC (Filtering & Weighting)
    df = pd.DataFrame(simulated_results)
    
    # Calculate Total Exposure per supplier across ALL affected retail shops
    exposure_summary = df.groupby(['supplier_id', 'supplier_name'])['intensity'].sum().reset_index()
    exposure_summary.rename(columns={'intensity': 'total_exposure_intensity'}, inplace=True)
    
    # SECRETE SAUCE RULE 1: Drop weak exposures. 
    # If a supplier's total exposure to the affected retail zone is less than 10% (0.10),
    # they are robust enough to survive the shock without our grant money.
    vulnerable_suppliers = exposure_summary[exposure_summary['total_exposure_intensity'] >= 0.10]
    
    # SECRETE SAUCE RULE 2: Formatting the output to highlight "Linchpins"
    # We inform the LLM exactly why this business matters.
    report = "### Vulnerability Analysis Report\n\n"
    
    if vulnerable_suppliers.empty:
        return "No downstream wholesale suppliers have critical exposure (>10%) to this closure. Focus grants on direct retail."
        
    for _, row in vulnerable_suppliers.iterrows():
        report += f"- **Supplier:** {row['supplier_name']}\n"
        report += f"  - **Exposure Score:** {row['total_exposure_intensity'] * 100:.1f}%\n"
        report += f"  - **Assessment:** CRITICAL. This business is a hidden linchpin. It is highly dependent on the retail shops that will fail when the office closes. If this supplier fails, the shockwave spreads to other unaffected parts of the city.\n\n"
        
    # We drop Bayside Roasters and Acme from the report because their exposure is < 10%
    report += "*Note: Suppliers with less than 10% exposure were filtered out as they are deemed financially resilient to this specific geographic shock.*"
    
    return report

# =====================================================================
# 2. ADK TOOL DEFINITION
# =====================================================================
# We wrap the logic above so the Gemini model can call it natively.

def analyze_anchor_fallout(employer_name: str) -> str:
    """
    Use this tool when an anchor employer (like a large office building) is closing.
    It calculates the hidden supply-chain shockwave and identifies vulnerable wholesale suppliers.
    
    Args:
        employer_name: The name of the closing office/employer (e.g., 'Mint Plaza Office Block')
    """
    # In a real async environment, we would await this.
    return asyncio.run(analyze_anchor_fallout_logic(employer_name))

# =====================================================================
# 3. AGENT CONFIGURATION & HANDOFF API
# =====================================================================

def run_agent(employer_name: str) -> str:
    """
    Entry point for the Front-End Lead to call.
    Instantiates the Gemini Agent, equips it with the MCP-powered custom tool,
    and returns the Grant Memo.
    """
    
    # Initialize the ADK Agent via the standard GenAI SDK
    client = genai.Client()
    
    # The System Prompt tells the agent who it is and how to use the tool
    system_instruction = """
    You are a City Economic Development Officer. You have a $50k emergency micro-grant fund.
    You evaluate economic shockwaves when major employers close.
    
    CRITICAL INSTRUCTIONS:
    1. You must ALWAYS use the `analyze_anchor_fallout` tool to evaluate the closure.
    2. DO NOT just recommend funding the retail shops right next door. Look at the output of the tool.
    3. You must recommend funding the "hidden linchpin" suppliers identified by the tool, as saving them protects the broader supply chain.
    4. Explicitly state your assumptions: Note that the supply links are based on BEA federal rates, not literal invoices.
    
    Format your response as a formal "Emergency Grant Recommendation Memo".
    """
    
    print(f"Agent is analyzing the closure of: {employer_name}...")
    
    # Run the model
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=f"The {employer_name} is closing in 90 days. Who should we give our emergency micro-grants to?",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[analyze_anchor_fallout],
            temperature=0.2, # Low temperature for analytical consistency
        )
    )
    
    return response.text

if __name__ == "__main__":
    # Test the agent locally
    print(run_agent("Mint Plaza Office Block"))
