import asyncio
from agent import setup_mcp_client
from mcp.client.session import ClientSession

async def run():
    gql_query = """
    GRAPH a4i_econ.LocalEconomy
    MATCH (b:Business)
    WHERE b.name LIKE '%Mint Plaza%' OR b.name LIKE '%Office Block%'
    RETURN b.name LIMIT 10
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
