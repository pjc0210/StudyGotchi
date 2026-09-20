"""Fast-phase rules: matching chunks to known concepts and turning matches into exposure evidence."""

import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from app.domain.mastery.evidence import EvidenceType
from app.domain.resources.matching import (
    MATCH_CERTAINTY,
    exposure_events_for_matches,
    match_chunks_to_concepts,
)
from app.pipelines.batching import gather_bounded

NOW = datetime(2026, 9, 19, tzinfo=timezone.utc)


def unit(i: int, dim: int = 4) -> list[float]:
    v = [0.0] * dim
    v[i] = 1.0
    return v


def test_match_keeps_only_concepts_above_threshold_and_orders_best_first():
    a, b, c = uuid4(), uuid4(), uuid4()
    concepts = {a: unit(0), b: unit(1), c: [0.8, 0.6, 0.0, 0.0]}

    matches = match_chunks_to_concepts([unit(0)], concepts, threshold=0.75)

    assert [(m.concept_id, round(m.similarity, 2)) for m in matches] == [(a, 1.0), (c, 0.8)]
    assert all(m.chunk_index == 0 for m in matches)


def test_match_respects_top_k_per_chunk():
    concepts = {uuid4(): [1.0, 0.1 * i, 0.0, 0.0] for i in range(6)}

    matches = match_chunks_to_concepts([unit(0), unit(0)], concepts, threshold=0.5, top_k=2)

    assert [m.chunk_index for m in matches] == [0, 0, 1, 1]


def test_no_match_below_threshold():
    assert match_chunks_to_concepts([unit(0)], {uuid4(): unit(1)}, threshold=0.8) == []


def test_relative_floor_keeps_only_the_chunks_close_concepts():
    best, weak = uuid4(), uuid4()
    # best scores 0.6, weak scores 0.3: the absolute floor lets both through, the relative floor does not
    concepts = {best: [0.6, 0.8, 0.0, 0.0], weak: [0.3, 0.0, 0.95, 0.0]}

    matches = match_chunks_to_concepts([unit(0)], concepts, threshold=0.2)

    assert [m.concept_id for m in matches] == [best]


def test_exposure_events_are_one_per_concept_without_outcome():
    a, b = uuid4(), uuid4()
    student, resource = uuid4(), uuid4()
    matches = match_chunks_to_concepts([unit(0), [0.9, 0.9, 0.0, 0.0]], {a: unit(0), b: unit(1)}, threshold=0.6)

    events = exposure_events_for_matches(
        matches, student_id=student, resource_id=resource, evidence_type=EvidenceType.STUDENT_NOTES, occurred_at=NOW
    )

    by_concept = {e.concept_id: e for e in events}
    assert set(by_concept) == {a, b}
    assert all(e.outcome is None for e in events)
    assert all(e.certainty == MATCH_CERTAINTY for e in events)
    assert all(e.evidence_type == EvidenceType.STUDENT_NOTES for e in events)
    assert all(e.resource_id == resource and e.student_id == student for e in events)
    # a owned chunk 0 alone (share 1.0) and split chunk 1 (share 0.5); the best share wins
    assert by_concept[a].concept_relevance == 1.0
    assert by_concept[b].concept_relevance == 0.5


def test_gather_bounded_limits_concurrency_and_keeps_order():
    in_flight = 0
    peak = 0

    async def work(i: int) -> int:
        nonlocal in_flight, peak
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        in_flight -= 1
        return i

    results = asyncio.run(gather_bounded((work(i) for i in range(10)), limit=3))

    assert results == list(range(10))
    assert peak == 3
