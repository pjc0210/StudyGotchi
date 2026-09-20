from datetime import datetime, timedelta, timezone

from app.domain.personal_graph.concept_state import ConceptState, classify_concept_state
from app.domain.personal_graph.discovery import DiscoveryState


def _classify(**overrides):
    kwargs = {
        "discovery_state": DiscoveryState.ACTIVE,
        "mastery": 0.6,
        "confidence": 0.7,
        "fragility": 0.1,
    }
    kwargs.update(overrides)
    return classify_concept_state(**kwargs)


def test_frontier_when_discovery_is_frontier():
    assert _classify(discovery_state=DiscoveryState.FRONTIER) is ConceptState.FRONTIER


def test_frontier_when_mastery_is_unavailable():
    # No evidence yet is not the same as evidence of failure.
    assert _classify(mastery=None) is ConceptState.FRONTIER


def test_fragility_outranks_a_good_mastery_score():
    assert _classify(mastery=0.9, fragility=0.72) is ConceptState.FRAGILE


def test_low_mastery_with_high_confidence_is_struggling():
    assert _classify(mastery=0.31, confidence=0.78) is ConceptState.STRUGGLING


def test_low_mastery_with_low_confidence_is_only_exposed():
    assert _classify(mastery=0.31, confidence=0.2) is ConceptState.EXPOSED


def test_adequate_mastery_with_low_confidence_is_uncertain():
    assert _classify(mastery=0.68, confidence=0.3) is ConceptState.UNCERTAIN


def test_mastery_bands():
    assert _classify(mastery=0.92) is ConceptState.MASTERED
    assert _classify(mastery=0.75) is ConceptState.STRONG
    assert _classify(mastery=0.55) is ConceptState.DEVELOPING


def test_stale_when_not_practised_recently():
    old = datetime.now(timezone.utc) - timedelta(days=90)
    assert _classify(mastery=0.6, last_practiced_at=old) is ConceptState.STALE


def test_recent_practice_is_not_stale():
    recent = datetime.now(timezone.utc) - timedelta(days=2)
    assert _classify(mastery=0.6, last_practiced_at=recent) is ConceptState.DEVELOPING
