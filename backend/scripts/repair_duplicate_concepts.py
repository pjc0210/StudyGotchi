"""Repair already-ingested duplicate concepts using the fixed
canonicalization rules (spec: "Concept canonicalization"), without
re-running ingestion or losing evidence/provenance.

Usage: python -m scripts.repair_duplicate_concepts <course_id> [--dry-run]

For each cluster of concepts the FIXED `resolve_concept_candidate` would now
recognize as the same concept (shared alias, or a regular-plural variant of
the name/alias — see `app.domain.ontology.dedup_repair`), every non-survivor
concept in the cluster is merged into one survivor:

- its own name and aliases become aliases of the survivor
- every edge / resource link / assessment link / evidence event / world
  event / student state referencing it is repointed at the survivor,
  merging on conflict (keeping the higher-confidence / more-evidenced row)
  rather than raising a unique-constraint error or silently overwriting
- the non-survivor concept row itself is kept, marked
  status="merged" with concept_metadata.merged_into=<survivor_id> for
  provenance — it is never deleted, and its edge/resource-link history stays
  queryable by concept_id for anyone who still has that id.
"""

import argparse
import asyncio
from collections import defaultdict
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AssessmentItemConcept,
    Concept,
    ConceptAlias,
    ConceptEdge,
    ConceptResourceLink,
    EdgeEvidence,
    StudentConceptEdge,
    StudentConceptState,
    StudentEvidenceEvent,
    WorldEvent,
)
from app.db.session import async_session_factory, engine
from app.domain.ontology.dedup_repair import (
    ConceptLexicalProfile,
    choose_survivor,
    cluster_duplicate_concepts,
)
from app.pipelines.course_ingestion import _clean_up_prerequisite_graph
from app.pipelines.incremental_update import recompute_student_state


async def _load_profiles(
    session: AsyncSession, course_id: UUID
) -> list[ConceptLexicalProfile]:
    concepts = (
        (
            await session.execute(
                select(Concept).where(
                    Concept.course_id == course_id,
                    Concept.status == "active",
                    Concept.scope == "course",
                )
            )
        )
        .scalars()
        .all()
    )
    concept_ids = [c.id for c in concepts]
    if not concept_ids:
        return []

    aliases_by_concept: dict[UUID, list[str]] = defaultdict(list)
    for cid, alias in (
        await session.execute(
            select(ConceptAlias.concept_id, ConceptAlias.alias).where(
                ConceptAlias.concept_id.in_(concept_ids)
            )
        )
    ).all():
        aliases_by_concept[cid].append(alias)

    edge_counts: dict[UUID, int] = defaultdict(int)
    for source_id, target_id in (
        await session.execute(
            select(ConceptEdge.source_concept_id, ConceptEdge.target_concept_id).where(
                ConceptEdge.course_id == course_id
            )
        )
    ).all():
        edge_counts[source_id] += 1
        edge_counts[target_id] += 1

    ordinal_by_id = {
        c.id: i for i, c in enumerate(sorted(concepts, key=lambda c: c.created_at))
    }

    return [
        ConceptLexicalProfile(
            concept_id=c.id,
            canonical_name=c.canonical_name,
            aliases=aliases_by_concept.get(c.id, []),
            importance=float(c.importance),
            edge_count=edge_counts.get(c.id, 0),
            created_at_ordinal=ordinal_by_id[c.id],
        )
        for c in concepts
    ]


async def _merge_aliases(
    session: AsyncSession, old_id: UUID, survivor_id: UUID
) -> None:
    rows = (
        (
            await session.execute(
                select(ConceptAlias).where(ConceptAlias.concept_id == old_id)
            )
        )
        .scalars()
        .all()
    )
    for row in rows:
        existing = (
            (
                await session.execute(
                    select(ConceptAlias).where(
                        ConceptAlias.concept_id == survivor_id,
                        ConceptAlias.normalized_alias == row.normalized_alias,
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing is not None:
            await session.delete(row)
        else:
            row.concept_id = survivor_id
    await session.flush()


async def _merge_course_edges(
    session: AsyncSession, course_id: UUID, old_id: UUID, survivor_id: UUID
) -> None:
    for own_attr, other_attr in (
        ("source_concept_id", "target_concept_id"),
        ("target_concept_id", "source_concept_id"),
    ):
        rows = (
            (
                await session.execute(
                    select(ConceptEdge).where(
                        ConceptEdge.course_id == course_id,
                        getattr(ConceptEdge, own_attr) == old_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            other_id = getattr(row, other_attr)
            new_source = survivor_id if own_attr == "source_concept_id" else other_id
            new_target = other_id if own_attr == "source_concept_id" else survivor_id
            if new_source == new_target:
                # old_id and survivor_id were directly connected to each
                # other -- that edge would become a self-loop, so drop it
                # (a concept cannot be its own prerequisite).
                await session.execute(
                    delete(EdgeEvidence).where(EdgeEvidence.edge_id == row.id)
                )
                await session.delete(row)
                continue
            existing = (
                (
                    await session.execute(
                        select(ConceptEdge).where(
                            ConceptEdge.course_id == course_id,
                            ConceptEdge.source_concept_id == new_source,
                            ConceptEdge.target_concept_id == new_target,
                            ConceptEdge.edge_type == row.edge_type,
                        )
                    )
                )
                .scalars()
                .first()
            )
            if existing is not None and existing.id != row.id:
                existing.confidence = max(existing.confidence, row.confidence)
                existing.authority_weight = max(
                    existing.authority_weight, row.authority_weight
                )
                await session.execute(
                    update(EdgeEvidence)
                    .where(EdgeEvidence.edge_id == row.id)
                    .values(edge_id=existing.id)
                )
                await session.delete(row)
            else:
                row.source_concept_id = new_source
                row.target_concept_id = new_target
        await session.flush()


async def _merge_student_concept_edges(
    session: AsyncSession, old_id: UUID, survivor_id: UUID
) -> None:
    for own_attr, other_attr in (
        ("source_concept_id", "target_concept_id"),
        ("target_concept_id", "source_concept_id"),
    ):
        rows = (
            (
                await session.execute(
                    select(StudentConceptEdge).where(
                        getattr(StudentConceptEdge, own_attr) == old_id
                    )
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            other_id = getattr(row, other_attr)
            new_source = survivor_id if own_attr == "source_concept_id" else other_id
            new_target = other_id if own_attr == "source_concept_id" else survivor_id
            if new_source == new_target:
                await session.delete(row)
                continue
            existing = (
                (
                    await session.execute(
                        select(StudentConceptEdge).where(
                            StudentConceptEdge.student_id == row.student_id,
                            StudentConceptEdge.source_concept_id == new_source,
                            StudentConceptEdge.target_concept_id == new_target,
                            StudentConceptEdge.edge_type == row.edge_type,
                        )
                    )
                )
                .scalars()
                .first()
            )
            if existing is not None and existing.id != row.id:
                existing.confidence = max(existing.confidence, row.confidence)
                await session.delete(row)
            else:
                row.source_concept_id = new_source
                row.target_concept_id = new_target
        await session.flush()


async def _merge_assessment_links(
    session: AsyncSession, old_id: UUID, survivor_id: UUID
) -> None:
    rows = (
        (
            await session.execute(
                select(AssessmentItemConcept).where(
                    AssessmentItemConcept.concept_id == old_id
                )
            )
        )
        .scalars()
        .all()
    )
    for row in rows:
        existing = (
            (
                await session.execute(
                    select(AssessmentItemConcept).where(
                        AssessmentItemConcept.assessment_item_id
                        == row.assessment_item_id,
                        AssessmentItemConcept.concept_id == survivor_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing is not None:
            existing.relevance_weight = max(
                existing.relevance_weight, row.relevance_weight
            )
            await session.delete(row)
        else:
            await session.execute(
                delete(AssessmentItemConcept).where(
                    AssessmentItemConcept.assessment_item_id == row.assessment_item_id,
                    AssessmentItemConcept.concept_id == row.concept_id,
                )
            )
            session.add(
                AssessmentItemConcept(
                    assessment_item_id=row.assessment_item_id,
                    concept_id=survivor_id,
                    relevance_weight=row.relevance_weight,
                )
            )
    await session.flush()


async def _merge_student_states(
    session: AsyncSession, old_id: UUID, survivor_id: UUID
) -> None:
    rows = (
        (
            await session.execute(
                select(StudentConceptState).where(
                    StudentConceptState.concept_id == old_id
                )
            )
        )
        .scalars()
        .all()
    )
    for row in rows:
        existing = (
            (
                await session.execute(
                    select(StudentConceptState).where(
                        StudentConceptState.student_id == row.student_id,
                        StudentConceptState.concept_id == survivor_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing is not None:
            # Both concepts already have state for this student (rare: the
            # student was matched inconsistently across resources before the
            # fix). Keep whichever is better-evidenced; the loser's raw
            # evidence events are NOT deleted, only its aggregate state row,
            # so a future recompute over all events for the survivor
            # concept can still take both into account once evidence events
            # are repointed below.
            existing_evidence = existing.positive_evidence + existing.negative_evidence
            row_evidence = row.positive_evidence + row.negative_evidence
            if row_evidence > existing_evidence:
                for field in (
                    "discovery_state",
                    "understanding",
                    "personal_relevance",
                    "positive_evidence",
                    "negative_evidence",
                    "last_evidence_at",
                    "last_practiced_at",
                ):
                    setattr(existing, field, getattr(row, field))
            await session.delete(row)
        else:
            await session.execute(
                delete(StudentConceptState).where(
                    StudentConceptState.student_id == row.student_id,
                    StudentConceptState.concept_id == row.concept_id,
                )
            )
            session.add(
                StudentConceptState(
                    student_id=row.student_id,
                    concept_id=survivor_id,
                    course_id=row.course_id,
                    discovery_state=row.discovery_state,
                    understanding=row.understanding,
                    personal_relevance=row.personal_relevance,
                    last_evidence_at=row.last_evidence_at,
                    last_practiced_at=row.last_practiced_at,
                    positive_evidence=row.positive_evidence,
                    negative_evidence=row.negative_evidence,
                    state_metadata=row.state_metadata,
                    updated_at=row.updated_at,
                )
            )
    await session.flush()


async def repair_course(
    session: AsyncSession,
    course_id: UUID,
    *,
    dry_run: bool,
    approved_survivors: set[UUID] | None = None,
) -> dict:
    profiles = await _load_profiles(session, course_id)
    profiles_by_id = {p.concept_id: p for p in profiles}
    clusters = cluster_duplicate_concepts(profiles)
    if approved_survivors is not None:
        clusters = [
            cluster
            for cluster in clusters
            if choose_survivor(cluster, profiles_by_id) in approved_survivors
        ]

    report = []
    for cluster in clusters:
        survivor_id = choose_survivor(cluster, profiles_by_id)
        losers = [cid for cid in cluster if cid != survivor_id]
        report.append(
            {
                "survivor": str(survivor_id),
                "survivor_name": profiles_by_id[survivor_id].canonical_name,
                "merged": [
                    {"id": str(cid), "name": profiles_by_id[cid].canonical_name}
                    for cid in losers
                ],
            }
        )
        if dry_run:
            continue

        for old_id in losers:
            old_row = await session.get(Concept, old_id)
            await _merge_aliases(session, old_id, survivor_id)
            await _merge_course_edges(session, course_id, old_id, survivor_id)
            await _merge_student_concept_edges(session, old_id, survivor_id)
            await _merge_assessment_links(session, old_id, survivor_id)
            await _merge_student_states(session, old_id, survivor_id)
            await session.execute(
                update(ConceptResourceLink)
                .where(ConceptResourceLink.concept_id == old_id)
                .values(concept_id=survivor_id)
            )
            await session.execute(
                update(StudentEvidenceEvent)
                .where(StudentEvidenceEvent.concept_id == old_id)
                .values(concept_id=survivor_id)
            )
            await session.execute(
                update(WorldEvent)
                .where(WorldEvent.concept_id == old_id)
                .values(concept_id=survivor_id)
            )
            await session.execute(
                update(Concept)
                .where(Concept.canonical_parent_concept_id == old_id)
                .values(canonical_parent_concept_id=survivor_id)
            )
            old_row.status = "merged"
            old_row.concept_metadata = {
                **old_row.concept_metadata,
                "merged_into": str(survivor_id),
                "merge_reason": "duplicate canonicalization repair",
            }
        await session.flush()

    if dry_run:
        return {
            "course_id": str(course_id),
            "clusters_merged": len(clusters),
            "clusters": report,
        }

    # Collapsing vertices can introduce cycles and change transitive paths.
    if clusters:
        await _clean_up_prerequisite_graph(session, course_id)

    # Raw evidence events for every loser now live under their survivor
    # (see the StudentEvidenceEvent repoint above), but each survivor's
    # *stored* understanding/discovery_state was computed from only one
    # side of the merge. Recompute every affected (student, survivor) pair
    # so the combined evidence is actually reflected.
    survivor_ids = {choose_survivor(c, profiles_by_id) for c in clusters}
    for survivor_id in survivor_ids:
        student_ids = (
            (
                await session.execute(
                    select(StudentEvidenceEvent.student_id)
                    .where(StudentEvidenceEvent.concept_id == survivor_id)
                    .distinct()
                )
            )
            .scalars()
            .all()
        )
        for student_id in student_ids:
            await recompute_student_state(
                session,
                course_id=course_id,
                student_id=student_id,
                touched_concept_ids={survivor_id},
            )

    await session.commit()
    return {
        "course_id": str(course_id),
        "clusters_merged": len(clusters),
        "clusters": report,
    }


async def main(course_id: UUID, *, dry_run: bool, approved_survivors=None) -> None:
    async with async_session_factory() as session:
        result = await repair_course(
            session, course_id, dry_run=dry_run, approved_survivors=approved_survivors
        )
    import json

    print(json.dumps(result, indent=2))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course_id", type=UUID)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--survivor",
        type=UUID,
        action="append",
        help="Repair only a reviewed cluster with this survivor; repeat for multiple clusters.",
    )
    args = parser.parse_args()
    asyncio.run(
        main(
            args.course_id,
            dry_run=args.dry_run,
            approved_survivors=set(args.survivor) if args.survivor else None,
        )
    )
