from mcp.server.fastmcp import FastMCP
import uvicorn

# Create an MCP server
mcp = FastMCP("Math Tools")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

# Expose the ASGI app for uvicorn
# FastMCP internally uses Starlette/SSE
# We need to find where the ASGI app object is.
# In recent versions, mcp objects might be directly runnable by uvicorn if they expose __call__ or similar?
# Let's try to find the underlying Starlette app.

if __name__ == "__main__":
    # Explicitly use uvicorn to run, binding to all interfaces
    # mcp.run() might be swallowing errors or binding to localhost only
    print("Starting MCP Server on port 3002...")
    mcp.run(transport="sse", port=3002, host="0.0.0.0")
