"""JWT authentication and password hashing."""

import os
from datetime import datetime, timedelta
from typing import List, Optional

import bcrypt
import jwt
import yaml


def load_config() -> dict:
    """Load auth configuration."""
    config_paths = [
        "configs/defaults.yaml",
        "/app/configs/defaults.yaml",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "configs", "defaults.yaml"),
    ]

    for path in config_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
    return {}


class JWTManager:
    """JWT token manager."""

    def __init__(self, config: dict):
        """Initialize JWT manager."""
        jwt_config = config.get("jwt", {})
        self.secret_key = jwt_config.get("secret_key", "default-secret-key")
        self.algorithm = jwt_config.get("algorithm", "HS256")
        self.access_token_expire_minutes = jwt_config.get("access_token_expire_minutes", 15)
        self.refresh_token_expire_days = jwt_config.get("refresh_token_expire_days", 7)

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    def create_access_token(
        self,
        user_id: int,
        username: str,
        roles: List[str],
        is_superuser: bool,
    ) -> str:
        """Create an access token."""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        payload = {
            "sub": str(user_id),
            "username": username,
            "roles": roles,
            "is_superuser": is_superuser,
            "exp": expire,
            "type": "access",
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(
        self,
        user_id: int,
        username: str,
        roles: List[str],
        is_superuser: bool,
    ) -> str:
        """Create a refresh token."""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        payload = {
            "sub": str(user_id),
            "username": username,
            "roles": roles,
            "is_superuser": is_superuser,
            "exp": expire,
            "type": "refresh",
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> Optional[dict]:
        """Decode and verify a JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def verify_access_token(self, token: str) -> Optional[dict]:
        """Verify an access token."""
        payload = self.decode_token(token)
        if payload and payload.get("type") == "access":
            return payload
        return None

    def verify_refresh_token(self, token: str) -> Optional[dict]:
        """Verify a refresh token."""
        payload = self.decode_token(token)
        if payload and payload.get("type") == "refresh":
            return payload
        return None
