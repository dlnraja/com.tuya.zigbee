from typing import Any, Never

from homey.homey import Homey


async def get_something(
    *,
    homey: Homey,
    query: dict[str, str],
    params: dict[str, str],
    body: dict[Never, Never],  # Homey.API sends an empty body for GET requests
) -> Any:
    return "Hello from App"


async def add_something(
    *, homey: Homey, query: dict[str, str], params: dict[str, str], body: dict[str, Any]
) -> Any:
    return homey.app.add_something(body)


async def update_something(
    *, homey: Homey, query: dict[str, str], params: dict[str, str], body: dict[str, Any]
) -> Any:
    return homey.app.update_something(body)


async def delete_something(
    *,
    homey: Homey,
    query: dict[str, str],
    params: dict[str, str],
    body: dict[Never, Never],  # Homey.API sends an empty body for DELETE requests
) -> Any:
    return homey.app.delete_something(params["id"])


# Export these methods as endpoints
__all__ = ["get_something", "add_something", "update_something", "delete_something"]
