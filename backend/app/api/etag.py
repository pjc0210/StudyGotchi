"""Conditional GET for the two payloads the site polls.

The engine already stamps each payload with a content revision. Echo it as
the ETag and answer `If-None-Match` with an empty 304 so a poll that changed
nothing costs neither a body nor a render.
"""

from fastapi import Request, Response


def etag_matches(request: Request, version: str) -> bool:
    header = request.headers.get("if-none-match", "")
    tags = {tag.strip().strip("W/").strip('"') for tag in header.split(",") if tag.strip()}
    return version in tags


def set_etag(response: Response, version: str) -> None:
    response.headers["ETag"] = f'"{version}"'
    response.headers["Cache-Control"] = "private, no-cache"


def not_modified(version: str) -> Response:
    response = Response(status_code=304)
    set_etag(response, version)
    return response
