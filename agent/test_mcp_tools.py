import asyncio
from agent import setup_mcp_client
from mcp.client.session import ClientSession

async def run():
    try:
        print("Testing MCP client tools...")
        async with await setup_mcp_client() as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("Getting tools...")
                result = await session.list_tools()
                print("TOOLS:")
                print(result)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(run())
