"""
Permission Cache Module

In-memory cache for user permissions with TTL and invalidation support.
Reduces database queries by caching permissions for 5 minutes.
"""

import time
import threading
from typing import Optional, List, Dict, Set
from dataclasses import dataclass, field


@dataclass
class CachedPermissions:
    """Cached permission data for a user."""
    user_id: int
    permissions: List[str]
    roles: List[str]
    is_superuser: bool
    cached_at: float = field(default_factory=time.time)

    def is_expired(self, ttl_seconds: float = 300) -> bool:
        """Check if cache entry has expired."""
        return (time.time() - self.cached_at) > ttl_seconds


class PermissionCache:
    """
    Thread-safe in-memory permission cache.

    Features:
    - TTL-based expiration (default 5 minutes)
    - User-level invalidation
    - Role-level invalidation (all users with a role)
    """

    def __init__(self, ttl_seconds: float = 300):
        """
        Initialize permission cache.

        Args:
            ttl_seconds: Time-to-live for cache entries in seconds (default 5 minutes)
        """
        self._cache: Dict[int, CachedPermissions] = {}
        self._role_to_users: Dict[str, Set[int]] = {}  # role_code -> set of user_ids
        self._lock = threading.RLock()
        self._ttl = ttl_seconds

    def get(self, user_id: int) -> Optional[CachedPermissions]:
        """
        Get cached permissions for a user.

        Args:
            user_id: The user ID to look up

        Returns:
            CachedPermissions if found and not expired, None otherwise
        """
        with self._lock:
            cached = self._cache.get(user_id)
            if cached is None:
                return None
            if cached.is_expired(self._ttl):
                # Remove expired entry
                del self._cache[user_id]
                self._remove_user_from_role_index(user_id, cached.roles)
                return None
            return cached

    def set(self, user_id: int, permissions: List[str], roles: List[str],
            is_superuser: bool = False) -> None:
        """
        Cache permissions for a user.

        Args:
            user_id: The user ID
            permissions: List of permission codes
            roles: List of role codes
            is_superuser: Whether the user is a superuser
        """
        with self._lock:
            # Remove old role associations
            if user_id in self._cache:
                self._remove_user_from_role_index(user_id, self._cache[user_id].roles)

            cached = CachedPermissions(
                user_id=user_id,
                permissions=permissions,
                roles=roles,
                is_superuser=is_superuser
            )
            self._cache[user_id] = cached

            # Update role -> user index
            for role in roles:
                if role not in self._role_to_users:
                    self._role_to_users[role] = set()
                self._role_to_users[role].add(user_id)

    def invalidate_user(self, user_id: int) -> None:
        """
        Invalidate cache for a specific user.

        Args:
            user_id: The user ID to invalidate
        """
        with self._lock:
            if user_id in self._cache:
                cached = self._cache[user_id]
                self._remove_user_from_role_index(user_id, cached.roles)
                del self._cache[user_id]

    def invalidate_role(self, role_code: str) -> None:
        """
        Invalidate cache for all users with a specific role.

        Args:
            role_code: The role code whose users should be invalidated
        """
        with self._lock:
            if role_code in self._role_to_users:
                user_ids = self._role_to_users[role_code].copy()
                for user_id in user_ids:
                    self.invalidate_user(user_id)

    def invalidate_all(self) -> None:
        """Clear all cached permissions."""
        with self._lock:
            self._cache.clear()
            self._role_to_users.clear()

    def _remove_user_from_role_index(self, user_id: int, roles: List[str]) -> None:
        """Remove user from role-to-user index."""
        for role in roles:
            if role in self._role_to_users:
                self._role_to_users[role].discard(user_id)
                if not self._role_to_users[role]:
                    del self._role_to_users[role]

    def get_stats(self) -> Dict:
        """Get cache statistics for monitoring."""
        with self._lock:
            return {
                "total_cached_users": len(self._cache),
                "tracked_roles": len(self._role_to_users),
                "ttl_seconds": self._ttl
            }


# Global cache instance
_permission_cache: Optional[PermissionCache] = None


def get_permission_cache() -> PermissionCache:
    """Get the global permission cache instance."""
    global _permission_cache
    if _permission_cache is None:
        _permission_cache = PermissionCache()
    return _permission_cache


def invalidate_user_permissions(user_id: int) -> None:
    """Invalidate cached permissions for a specific user."""
    get_permission_cache().invalidate_user(user_id)


def invalidate_role_permissions(role_code: str) -> None:
    """Invalidate cached permissions for all users with a specific role."""
    get_permission_cache().invalidate_role(role_code)


def invalidate_all_permissions() -> None:
    """Clear the entire permission cache."""
    get_permission_cache().invalidate_all()
