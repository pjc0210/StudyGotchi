"""Offline Clerk session JWT verification against the instance JWKS."""

from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from app.config import get_settings


class ClerkVerifier:
    def __init__(
        self,
        issuer: str,
        authorized_parties: list[str],
        *,
        jwks_client: Any | None = None,
    ) -> None:
        self._issuer = issuer
        self._parties = set(authorized_parties)
        self._jwks = jwks_client or PyJWKClient(
            f"{issuer}/.well-known/jwks.json",
            cache_keys=True,
        )

    def verify(self, token: str) -> str:
        key = self._jwks.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=self._issuer,
            options={"require": ["exp", "sub"]},
        )
        azp = claims.get("azp")
        if self._parties and azp not in self._parties:
            raise InvalidTokenError("azp not authorized")
        return claims["sub"]


@lru_cache
def get_verifier() -> ClerkVerifier:
    settings = get_settings()
    if not settings.clerk_issuer:
        raise RuntimeError("CLERK_ISSUER is required when AUTH_MODE=clerk")
    return ClerkVerifier(settings.clerk_issuer, settings.clerk_authorized_parties_list)
