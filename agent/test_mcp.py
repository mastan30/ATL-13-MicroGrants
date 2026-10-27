import asyncio
from agent import setup_mcp_client

async def run():
    try:
        print("Testing MCP client setup...")
        async with await setup_mcp_client() as (read, write):
            print("Successfully started stdio_client.")
    except Exception as e:
        print(f"Error starting MCP: {e}")

asyncio.run(run())
