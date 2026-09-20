"""Coercion helpers for untrusted structured-LLM payloads.

Providers must not silently drop fields, but they *should* tolerate the
messy-but-obvious variants models actually emit: enum case mismatches and
unit-interval floats that overshoot 0/1 by a hair.
"""

from enum import StrEnum
from typing import Annotated, Any, TypeVar

from pydantic import BeforeValidator, Field

from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType

E = TypeVar("E", bound=StrEnum)

_RESOURCE_LINK_TYPES = frozenset({"EXPLAINED_IN", "APPEARS_IN", "WORKED_EXAMPLE_IN"})


def clamp_unit_interval(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    if isinstance(value, str):
        try:
            return max(0.0, min(1.0, float(value.strip())))
        except ValueError:
            return value
    return value


UnitInterval = Annotated[float, BeforeValidator(clamp_unit_interval), Field(ge=0.0, le=1.0)]
OptionalUnitInterval = Annotated[
    float | None,
    BeforeValidator(lambda v: None if v is None else clamp_unit_interval(v)),
]


def none_to(default: Any):
    def _inner(value: Any) -> Any:
        return default if value is None else value

    return _inner


def none_to_empty_list(value: Any) -> Any:
    return [] if value is None else value


def coerce_str_enum(enum_cls: type[E]):
    def _coerce(value: Any) -> Any:
        if value is None or isinstance(value, enum_cls):
            return value
        if not isinstance(value, str):
            return value
        raw = value.strip()
        if not raw:
            return value
        for member in enum_cls:
            if raw == member.value or raw == member.name:
                return member
        normalized = raw.replace(" ", "_").replace("-", "_")
        lower = normalized.lower()
        for member in enum_cls:
            if member.value.lower() == lower or member.name.lower() == lower:
                return member
        return value

    return _coerce


def coerce_resource_link_type(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    key = value.strip().replace(" ", "_").replace("-", "_").upper()
    if key in _RESOURCE_LINK_TYPES:
        return key
    return value


ConceptKindField = Annotated[ConceptKind, BeforeValidator(coerce_str_enum(ConceptKind))]
GranularityField = Annotated[Granularity, BeforeValidator(coerce_str_enum(Granularity))]
ConceptEdgeTypeField = Annotated[ConceptEdgeType, BeforeValidator(coerce_str_enum(ConceptEdgeType))]
ResourceLinkTypeField = Annotated[str, BeforeValidator(coerce_resource_link_type)]
