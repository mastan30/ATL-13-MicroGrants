from google.adk import Agent

def my_tool(x: str) -> str:
    """This is a test tool."""
    return x

agent = Agent(
    name='test',
    instruction='test',
    model='gemini-2.5-pro',
    tools=[my_tool]
)
print("SUCCESS!")
