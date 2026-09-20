"""Alias-table lookup (spec: "Concept canonicalization" step 2).

Pure lookup against a pre-loaded index; the repository layer is responsible
for loading `{normalized_alias: concept_id}` for a course before calling
this.
"""

from uuid import UUID


def lookup_alias(normalized_name: str, alias_index: dict[str, UUID]) -> UUID | None:
    return alias_index.get(normalized_name)
