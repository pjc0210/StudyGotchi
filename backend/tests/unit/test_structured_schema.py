from app.providers.llm.structured import model_tool_schema, validate_structured
from app.schemas.extraction import ResourceExtractionResult


def test_strict_tool_schema_inlines_defs_and_requires_every_property():
    schema = model_tool_schema(ResourceExtractionResult, strict=True)
    assert "$defs" not in schema
    assert "$ref" not in str(schema)
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(schema["properties"])
    candidates = schema["properties"]["concept_candidates"]
    assert candidates["type"] == "array"
    item = candidates["items"]
    assert item["additionalProperties"] is False
    assert "concept_kind" in item["required"]
    kind = item["properties"]["concept_kind"]
    assert "enum" in kind or "anyOf" in kind


def test_validate_structured_reports_schema_name_on_failure():
    try:
        validate_structured(ResourceExtractionResult, {"document_type": 123})
    except RuntimeError as exc:
        assert "ResourceExtractionResult" in str(exc)
        assert "error" in str(exc).lower()
    else:
        raise AssertionError("expected RuntimeError")
