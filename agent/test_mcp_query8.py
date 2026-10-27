import asyncio
from agent import setup_mcp_client
from mcp.client.session import ClientSession

async def run():
    gql_query = """
    GRAPH a4i_econ.LocalEconomy
    MATCH p = (anchor:Employer)
              -[:DrawsFootfall]->(retail:Business)
              <-[supply_edge:Supplies]-(supplier:Business)
    RETURN 
        retail.name AS retail_business,
        supplier.business_id AS supplier_id,
        supplier.name AS supplier_name,
        supply_edge.intensity AS intensity
    LIMIT 10
    """
    
    try:
        async with await setup_mcp_client() as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("execute_query", {"query": gql_query})
                print(result)
    except Exception as e:
        print(f"Error: {e}")
asyncio.run(run())
