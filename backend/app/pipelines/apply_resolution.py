"""Turn extracted concept candidates into concept rows, once, for both ingest paths.

`resolve_concept_candidate` decides whether a candidate is an existing concept
or a new one. Everything after that decision (creating the row, writing
aliases, keeping the alias and embedding indexes current, linking the resource,
remembering the name for later relationships) used to be repeated in the course
and student pipelines. It lives here behind one interface; a policy says what
differs: the scope of new concepts, who owns them, whether the ambiguous band
gets a model adjudication, and how the resource link is typed.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.ontology.concepts import ConceptCandidate, ConceptScope
from app.repositories.concepts import add_alias, create_concept, create_resource_link
from app.resolution.merge import ResolutionAction, finalize_adjudication, resolve_concept_candidate
from app.resolution.normalize import normalize_concept_name
from app.resolution.semantic_match import EmbeddingMatch
from app.schemas.extraction import ConceptCandidateOut

# Given the candidate and the near matches, answer with the matched concept id or None.
Adjudicator = Callable[[ConceptCandidate, list[EmbeddingMatch]], Awaitable[UUID | None]]


@dataclass(frozen=True)
class ResolutionPolicy:
    scope: ConceptScope
    owner_student_id: UUID | None
    link_type: str
    # None: the ambiguous band never merges, it becomes a new concept in `scope`.
    adjudicate: Adjudicator | None = None


@dataclass
class ResolutionContext:
    """What the student or course can already see. Mutated as concepts are created."""

    alias_index: dict[str, UUID]
    embeddings: dict[UUID, list[float]]
    names_by_id: dict[UUID, str] = field(default_factory=dict)
    definitions_by_id: dict[UUID, str | None] = field(default_factory=dict)


@dataclass
class AppliedCandidate:
    concept_id: UUID
    created: bool


def as_candidate(out: ConceptCandidateOut) -> ConceptCandidate:
    return ConceptCandidate(
        name=out.name,
        normalized_name=normalize_concept_name(out.name),
        definition=out.definition,
        concept_kind=out.concept_kind,
        granularity=out.granularity,
        importance_in_resource=out.importance_in_resource,
        aliases=out.aliases,
    )


def name_resolver(name_map: dict[str, UUID], context: ResolutionContext) -> Callable[[str], UUID | None]:
    """Names in the same extraction, then anything the caller can see by alias."""

    def resolve(name: str) -> UUID | None:
        normalized = normalize_concept_name(name)
        return name_map.get(name) or name_map.get(normalized) or context.alias_index.get(normalized)

    return resolve


async def apply_candidate(
    session: AsyncSession,
    *,
    course_id: UUID,
    resource_id: UUID,
    chunk_id: UUID | None,
    candidate_out: ConceptCandidateOut,
    embedding: list[float],
    context: ResolutionContext,
    policy: ResolutionPolicy,
    name_map: dict[str, UUID],
) -> AppliedCandidate:
    settings = get_settings()
    candidate = as_candidate(candidate_out)
    resolution = resolve_concept_candidate(
        candidate,
        alias_index=context.alias_index,
        existing_concept_embeddings=context.embeddings,
        candidate_embedding=embedding,
        merge_threshold=settings.concept_merge_threshold,
        adjudicate_threshold=settings.concept_adjudicate_threshold,
    )

    if resolution.action == ResolutionAction.NEEDS_ADJUDICATION and policy.adjudicate is not None:
        matched = await policy.adjudicate(candidate, resolution.adjudication_candidates)
        resolution = finalize_adjudication(resolution, llm_says_same_concept=matched is not None, matched_concept_id=matched)

    if resolution.action in (ResolutionAction.MERGE_EXACT_ALIAS, ResolutionAction.MERGE_HIGH_SIMILARITY):
        concept_id = resolution.matched_concept_id
        assert concept_id is not None
        created = False
    else:
        node = await create_concept(
            session,
            course_id=course_id,
            canonical_name=candidate.name,
            short_definition=candidate.definition,
            concept_kind=candidate.concept_kind,
            granularity=candidate.granularity,
            importance=candidate.importance_in_resource,
            embedding=embedding,
            scope=policy.scope,
            owner_student_id=policy.owner_student_id,
            created_from_resource_id=resource_id,
        )
        concept_id = node.id
        created = True
        context.embeddings[concept_id] = embedding
        context.alias_index[candidate.normalized_name] = concept_id
        context.names_by_id[concept_id] = candidate.name
        context.definitions_by_id[concept_id] = candidate.definition

    for alias in candidate.aliases:
        await add_alias(session, concept_id=concept_id, alias=alias, source_resource_id=resource_id)
        context.alias_index[normalize_concept_name(alias)] = concept_id

    name_map[candidate_out.name] = concept_id
    name_map[candidate.normalized_name] = concept_id

    await create_resource_link(
        session,
        concept_id=concept_id,
        resource_id=resource_id,
        chunk_id=chunk_id,
        link_type=policy.link_type,
        depth_score=candidate.importance_in_resource,
        confidence=0.7,
    )
    return AppliedCandidate(concept_id=concept_id, created=created)
