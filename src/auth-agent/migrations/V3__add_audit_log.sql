-- V3: Add audit log support
-- Creates auth_audit_log table for tracking security-sensitive operations

CREATE TABLE auth_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    username VARCHAR(100) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) DEFAULT NULL,
    resource_id VARCHAR(100) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    request_method VARCHAR(10) DEFAULT NULL,
    request_path VARCHAR(255) DEFAULT NULL,
    request_body TEXT DEFAULT NULL,
    response_status INT DEFAULT NULL,
    detail TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for common queries
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at),
    INDEX idx_audit_resource (resource_type, resource_id),

    -- Foreign key to auth_user (keep username for cases when user is deleted)
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE SET NULL
);

-- Record types for action field
-- Login: auth:login, auth:logout
-- User management: user:create, user:update, user:delete, user:assign-roles
-- Role management: role:create, role:update, role:delete, role:assign-permissions
-- Permission changes: permission:create, permission:update, permission:delete
-- Sensitive operations: *:access-denied, *:validation-error