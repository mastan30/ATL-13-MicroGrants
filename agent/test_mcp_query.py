import asyncio
from agent import setup_mcp_client
from mcp.client.session import ClientSession

async def run():
    employer_name = "Mint Plaza Office Block"
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
        print("Testing MCP client setup...")
        async with await setup_mcp_client() as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("Executing query...")
                result = await session.call_tool("execute_query", {"query": gql_query})
                print("RESULT:")
                print(result)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(run())
