from uuid import uuid4

from app.domain.gaps.scoring import GapAction
from app.schemas.api import GapOut
from app.schemas.numbers import round_api_float


def test_round_api_float_trims_numeric_artifacts():
    assert round_api_float(0.61030174987553220677938270455342717468738555908203125) == 0.610302
    assert round_api_float(None) is None


def test_gap_out_serializes_rounded_floats():
    payload = GapOut(
        concept_id=uuid4(),
        name="Linear Algebra",
        mastery=0.8500000000000001,
        confidence=0.3333333333333333,
        priority=0.12500000000000003,
        action=GapAction.REVIEW,
        reason="test",
    )
    dumped = payload.model_dump()
    assert dumped["mastery"] == 0.85
    assert dumped["confidence"] == 0.333333
    assert dumped["priority"] == 0.125
