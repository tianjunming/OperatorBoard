-- V2: Add data scope support
-- Creates auth_data_scope table for row-level permission control

CREATE TABLE auth_data_scope (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope_code VARCHAR(50) NOT NULL UNIQUE,
    scope_name VARCHAR(100) NOT NULL,
    scope_type ENUM('own', 'dept', 'all') NOT NULL DEFAULT 'own',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Link data scopes to roles (many-to-many)
CREATE TABLE auth_role_data_scope (
    role_id INT NOT NULL,
    data_scope_id INT NOT NULL,
    PRIMARY KEY (role_id, data_scope_id),
    FOREIGN KEY (role_id) REFERENCES auth_role(id) ON DELETE CASCADE,
    FOREIGN KEY (data_scope_id) REFERENCES auth_data_scope(id) ON DELETE CASCADE
);

-- Link data scopes to users (for personal data scope overrides)
CREATE TABLE auth_user_data_scope (
    user_id INT NOT NULL,
    data_scope_id INT NOT NULL,
    PRIMARY KEY (user_id, data_scope_id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE,
    FOREIGN KEY (data_scope_id) REFERENCES auth_data_scope(id) ON DELETE CASCADE
);

-- Prepopulate with basic scopes
INSERT INTO auth_data_scope (scope_code, scope_name, scope_type) VALUES
    ('own', 'Own Data Only', 'own'),
    ('all', 'All Data', 'all');