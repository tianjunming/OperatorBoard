"""
Audit Log Service

Records security-sensitive operations for compliance and monitoring.

Note: This service uses raw SQL for audit log operations as the table
is created via migration. The AuditLog class is not used as ORM model.
"""


# Singleton audit service
_audit_service: Optional["AuditService"] = None


class AuditService:
    """Audit logging service."""

    # Action constants
    ACTION_LOGIN = "auth:login"
    ACTION_LOGOUT = "auth:logout"
    ACTION_LOGIN_FAILED = "auth:login_failed"
    ACTION_USER_CREATE = "user:create"
    ACTION_USER_UPDATE = "user:update"
    ACTION_USER_DELETE = "user:delete"
    ACTION_USER_ASSIGN_ROLES = "user:assign-roles"
    ACTION_ROLE_CREATE = "role:create"
    ACTION_ROLE_UPDATE = "role:update"
    ACTION_ROLE_DELETE = "role:delete"
    ACTION_ROLE_ASSIGN_PERMISSIONS = "role:assign-permissions"
    ACTION_PERMISSION_CREATE = "permission:create"
    ACTION_PERMISSION_UPDATE = "permission:update"
    ACTION_PERMISSION_DELETE = "permission:delete"
    ACTION_ACCESS_DENIED = "access:denied"
    ACTION_VALIDATION_ERROR = "validation:error"

    def __init__(self, db: Session):
        """Initialize audit service."""
        self.db = db

    def log(
        self,
        action: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_body: Optional[str] = None,
        response_status: Optional[int] = None,
        detail: Optional[str] = None,
    ) -> None:
        """
        Write an audit log entry.

        Args:
            action: The action performed (e.g., "user:create")
            user_id: ID of the user performing the action
            username: Username for cases when user_id might be deleted
            resource_type: Type of resource affected (e.g., "user", "role")
            resource_id: ID of the affected resource
            ip_address: Client IP address
            user_agent: Client user agent string
            request_method: HTTP method (GET, POST, etc.)
            request_path: Request path URL
            request_body: Request body (sanitized, no passwords)
            response_status: HTTP response status code
            detail: Additional details about the action
        """
        # Import here to avoid circular dependency
        from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger

        # Build the log entry as a dictionary for insertion
        log_entry = {
            "user_id": user_id,
            "username": username,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_method": request_method,
            "request_path": request_path,
            "request_body": request_body,
            "response_status": response_status,
            "detail": detail,
            "created_at": datetime.now(),
        }

        # Insert directly using raw SQL for the audit log table
        # This avoids needing to define the full table schema in ORM
        sql = """
            INSERT INTO auth_audit_log (
                user_id, username, action, resource_type, resource_id,
                ip_address, user_agent, request_method, request_path,
                request_body, response_status, detail, created_at
            ) VALUES (
                :user_id, :username, :action, :resource_type, :resource_id,
                :ip_address, :user_agent, :request_method, :request_path,
                :request_body, :response_status, :detail, :created_at
            )
        """
        self.db.execute(sql, log_entry)
        self.db.commit()

    def log_login(self, user_id: int, username: str, ip_address: str = None, success: bool = True) -> None:
        """Log a login attempt."""
        action = self.ACTION_LOGIN if success else self.ACTION_LOGIN_FAILED
        self.log(
            action=action,
            user_id=user_id if success else None,
            username=username,
            ip_address=ip_address,
            response_status=200 if success else 401,
            detail="Login successful" if success else "Invalid credentials",
        )

    def log_logout(self, user_id: int, username: str, ip_address: str = None) -> None:
        """Log a logout."""
        self.log(
            action=self.ACTION_LOGOUT,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            response_status=200,
            detail="User logged out",
        )

    def log_access_denied(
        self,
        user_id: int,
        username: str,
        action: str,
        ip_address: str = None,
    ) -> None:
        """Log an access denied event."""
        self.log(
            action=self.ACTION_ACCESS_DENIED,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            response_status=403,
            detail=f"Access denied for action: {action}",
        )

    def log_user_action(
        self,
        action: str,
        user_id: int,
        username: str,
        target_resource_type: str,
        target_resource_id: str,
        ip_address: str = None,
        detail: str = None,
    ) -> None:
        """Log a user management action."""
        self.log(
            action=action,
            user_id=user_id,
            username=username,
            resource_type=target_resource_type,
            resource_id=target_resource_id,
            ip_address=ip_address,
            detail=detail,
        )

    def get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple:
        """Query audit logs with filters."""
        sql = "SELECT * FROM auth_audit_log WHERE 1=1"
        params = {}

        if user_id is not None:
            sql += " AND user_id = :user_id"
            params["user_id"] = user_id

        if action:
            sql += " AND action = :action"
            params["action"] = action

        if start_date:
            sql += " AND created_at >= :start_date"
            params["start_date"] = start_date

        if end_date:
            sql += " AND created_at <= :end_date"
            params["end_date"] = end_date

        # Get total count
        count_sql = sql.replace("SELECT *", "SELECT COUNT(*)")
        result = self.db.execute(count_sql, params)
        total = result.scalar() or 0

        # Get paginated results
        sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
        params["limit"] = limit
        params["skip"] = skip

        result = self.db.execute(sql, params)
        rows = result.fetchall()

        # Convert to dict format
        columns = [
            "id", "user_id", "username", "action", "resource_type", "resource_id",
            "ip_address", "user_agent", "request_method", "request_path",
            "request_body", "response_status", "detail", "created_at"
        ]
        logs = [dict(zip(columns, row)) for row in rows]

        return logs, total


def get_audit_service(db: Session) -> AuditService:
    """Get audit service instance."""
    return AuditService(db)