"""Clerk JWT verification: good tokens pass, bad issuer/azp/expiry do not."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.exceptions import InvalidTokenError

from app.auth.clerk import ClerkVerifier

ISSUER = "https://example.clerk.accounts.dev"
AZP = "http://localhost:3000"


class _Key:
    def __init__(self, key):
        self.key = key


class _FixedJwks:
    def __init__(self, public_key):
        self._public_key = public_key

    def get_signing_key_from_jwt(self, _token: str) -> _Key:
        return _Key(self._public_key)


@pytest.fixture
def rsa_pair():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private, private.public_key()


def _token(private_key, *, issuer=ISSUER, azp=AZP, exp_delta=timedelta(minutes=5), sub="user_abc"):
    now = datetime.now(UTC)
    claims = {
        "iss": issuer,
        "sub": sub,
        "azp": azp,
        "exp": now + exp_delta,
        "iat": now,
    }
    return jwt.encode(claims, private_key, algorithm="RS256")


def _verifier(public_key) -> ClerkVerifier:
    return ClerkVerifier(ISSUER, [AZP], jwks_client=_FixedJwks(public_key))


def test_good_token_returns_subject(rsa_pair):
    private, public = rsa_pair
    verifier = _verifier(public)

    assert verifier.verify(_token(private, sub="user_maya")) == "user_maya"


def test_wrong_issuer_is_rejected(rsa_pair):
    private, public = rsa_pair
    verifier = _verifier(public)

    with pytest.raises(InvalidTokenError):
        verifier.verify(_token(private, issuer="https://other.example"))


def test_wrong_azp_is_rejected(rsa_pair):
    private, public = rsa_pair
    verifier = _verifier(public)

    with pytest.raises(InvalidTokenError):
        verifier.verify(_token(private, azp="https://evil.example"))


def test_expired_token_is_rejected(rsa_pair):
    private, public = rsa_pair
    verifier = _verifier(public)

    with pytest.raises(InvalidTokenError):
        verifier.verify(_token(private, exp_delta=timedelta(minutes=-5)))
