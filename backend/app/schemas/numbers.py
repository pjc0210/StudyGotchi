"""API-layer float rounding for values that round-trip through Postgres NUMERIC.

SQLAlchemy Numeric -> Python float often produces artifacts like
0.8500000000000001. Responses round to 6 decimal places, which is plenty
for mastery/confidence display and keeps JSON stable.
"""

from typing import Annotated, Any

from pydantic import BeforeValidator

API_FLOAT_DECIMALS = 6


def round_api_float(value: Any) -> Any:
    if value is None:
        return None
    return round(float(value), API_FLOAT_DECIMALS)


ApiFloat = Annotated[float, BeforeValidator(round_api_float)]
OptionalApiFloat = Annotated[float | None, BeforeValidator(round_api_float)]
