"""
Data Scope Service

Provides row-level data filtering based on user's permission scope.
"""

from enum import Enum
from typing import List, Optional

from sqlalchemy.orm import Session

from .schemas import AuthUser, AuthRole


class ScopeType(str, Enum):
    """Data scope types."""
    OWN = "own"      # Only own data
    DEPT = "dept"    # Department data (future)
    ALL = "all"      # All data


class DataScopeService:
    """Service for handling data-level permissions."""

    def __init__(self, db: Session):
        """Initialize data scope service."""
        self.db = db

    def get_user_data_scope(self, user_id: int) -> str:
        """
        Get the data scope type for a user.

        Returns:
            ScopeType string: 'own', 'dept', or 'all'
        """
        # Superusers have access to all data
        user = self.db.query(AuthUser).filter(AuthUser.id == user_id).first()
        if not user:
            return ScopeType.OWN

        if user.is_superuser:
            return ScopeType.ALL

        # Check user's roles for data scope
        for role in user.roles:
            # Query role's data scope from auth_role_data_scope table
            sql = """
                SELECT ds.scope_type FROM auth_data_scope ds
                JOIN auth_role_data_scope rds ON ds.id = rds.data_scope_id
                WHERE rds.role_id = :role_id AND ds.scope_type = 'all'
                LIMIT 1
            """
            result = self.db.execute(sql, {"role_id": role.id})
            if result.fetchone():
                return ScopeType.ALL

        return ScopeType.OWN

    def apply_data_scope_filter(
        self,
        user_id: int,
        table_alias: str = None,
        owner_column: str = "user_id",
    ) -> Optional[str]:
        """
        Generate SQL filter clause for data scope.

        Args:
            user_id: The user ID to generate filter for
            table_alias: Optional table alias (e.g., "t" for "t.user_id")
            owner_column: Column name that holds the owner user_id

        Returns:
            SQL WHERE clause string or None if no filter needed (superuser/all scope)
        """
        scope = self.get_user_data_scope(user_id)

        if scope == ScopeType.ALL:
            return None  # No filter needed

        # For 'own' scope, filter by user_id
        col = f"{table_alias}." if table_alias else ""
        return f"{col}{owner_column} = :data_scope_user_id"

    def get_filter_params(self, user_id: int) -> dict:
        """
        Get parameters for data scope filter.

        Returns:
            Dict with 'data_scope_user_id' key for SQL params
        """
        scope = self.get_user_data_scope(user_id)

        if scope == ScopeType.ALL:
            return {}

        return {"data_scope_user_id": user_id}


def get_data_scope_service(db: Session) -> DataScopeService:
    """Get data scope service instance."""
    return DataScopeService(db)