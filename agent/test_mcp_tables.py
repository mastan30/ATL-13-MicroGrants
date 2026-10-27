import asyncio
from agent import setup_mcp_client
from mcp.client.session import ClientSession

async def run():
    try:
        async with await setup_mcp_client() as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("list_tables", {})
                print(result)
    except Exception as e:
        print(f"Error: {e}")
asyncio.run(run())
