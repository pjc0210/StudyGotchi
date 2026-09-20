"""JSON-schema + payload validation shared by Anthropic and OpenAI providers.

Tool APIs are picky: they want `$defs` or inlined objects, `anyOf`+null for
optional fields, explicit `enum` lists, and (for OpenAI strict function
calling) `additionalProperties: false` with every property listed in
`required`. Validating the tool payload goes through the same Pydantic
models the rest of the pipeline uses, so enum/float coercion lives in one
place rather than per-provider.
"""

from __future__ import annotations

import copy
from typing import Any

from pydantic import BaseModel, ValidationError

from app.providers.llm.base import SchemaT

_STRIP_KEYS = frozenset({"title", "default", "examples"})


def model_tool_schema(schema: type[BaseModel], *, strict: bool = False) -> dict[str, Any]:
    """JSON Schema suitable for Anthropic `input_schema` / OpenAI function `parameters`."""

    raw = schema.model_json_schema()
    defs = raw.pop("$defs", None) or raw.pop("definitions", None) or {}
    inlined = _inline_refs(raw, defs)
    inlined.pop("$schema", None)
    inlined.pop("$defs", None)
    inlined.pop("definitions", None)
    cleaned = _strip_unsupported(inlined)
    if strict:
        return _strictify(cleaned, original_required=_as_set(cleaned.get("required")))
    return cleaned


def validate_structured(schema: type[SchemaT], payload: Any) -> SchemaT:
    """Validate (and coerce) a tool-call payload into `schema`.

    Raises `RuntimeError` with a compact validation summary rather than a
    raw Pydantic traceback, so provider failures are diagnosable in logs
    without dumping the whole document.
    """

    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        raise RuntimeError(
            f"Structured LLM output failed {schema.__name__} validation: {exc.error_count()} error(s). "
            f"{exc.errors()[:8]}"
        ) from exc


def _as_set(value: Any) -> set[str]:
    if not value:
        return set()
    return {str(v) for v in value}


def _inline_refs(node: Any, defs: dict[str, Any], *, stack: tuple[str, ...] = ()) -> Any:
    if isinstance(node, list):
        return [_inline_refs(item, defs, stack=stack) for item in node]
    if not isinstance(node, dict):
        return node
    ref = node.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/"):
        name = ref.rsplit("/", 1)[-1]
        if name in stack:
            # Cycle: leave a shallow object rather than recursing forever.
            return {"type": "object", "additionalProperties": True}
        resolved = defs.get(name)
        if resolved is None:
            return {k: _inline_refs(v, defs, stack=stack) for k, v in node.items() if k != "$ref"}
        merged = copy.deepcopy(resolved)
        extras = {k: v for k, v in node.items() if k != "$ref"}
        if extras:
            merged.update(extras)
        return _inline_refs(merged, defs, stack=(*stack, name))
    return {k: _inline_refs(v, defs, stack=stack) for k, v in node.items()}


def _strip_unsupported(node: Any) -> Any:
    if isinstance(node, list):
        return [_strip_unsupported(item) for item in node]
    if not isinstance(node, dict):
        return node
    return {k: _strip_unsupported(v) for k, v in node.items() if k not in _STRIP_KEYS}


def _nullable(schema: dict[str, Any]) -> dict[str, Any]:
    if schema.get("type") == "null":
        return schema
    if "anyOf" in schema:
        options = list(schema["anyOf"])
        if any(isinstance(opt, dict) and opt.get("type") == "null" for opt in options):
            return schema
        return {**schema, "anyOf": [*options, {"type": "null"}]}
    return {"anyOf": [schema, {"type": "null"}]}


def _strictify(node: Any, *, original_required: set[str] | None = None) -> Any:
    if isinstance(node, list):
        return [_strictify(item) for item in node]
    if not isinstance(node, dict):
        return node

    result = {k: v for k, v in node.items()}
    if "anyOf" in result:
        result["anyOf"] = [_strictify(opt) for opt in result["anyOf"]]
        return result
    if "oneOf" in result:
        result["oneOf"] = [_strictify(opt) for opt in result["oneOf"]]
        return result
    if "items" in result:
        result["items"] = _strictify(result["items"])

    if "properties" in result:
        props = result["properties"]
        orig_required = original_required if original_required is not None else _as_set(result.get("required"))
        new_props: dict[str, Any] = {}
        for name, subschema in props.items():
            strict_sub = _strictify(subschema)
            if name not in orig_required:
                if not (isinstance(strict_sub, dict) and "anyOf" in strict_sub):
                    strict_sub = _nullable(strict_sub)
            new_props[name] = strict_sub
        result["type"] = "object"
        result["properties"] = new_props
        result["additionalProperties"] = False
        result["required"] = list(new_props.keys())
    return result
