-- =====================================================
-- OperatorBoard 权限管理数据库Schema
-- =====================================================

SET FOREIGN_KEY_CHECKS=0;

-- -----------------------------------------
-- 用户表
-- -----------------------------------------
DROP TABLE IF EXISTS auth_user_role;
DROP TABLE IF EXISTS auth_role_permission;
DROP TABLE IF EXISTS auth_user;
DROP TABLE IF EXISTS auth_role;
DROP TABLE IF EXISTS auth_permission;

CREATE TABLE auth_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) COMMENT '邮箱',
    full_name VARCHAR(100) COMMENT '全名',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    is_superuser TINYINT(1) DEFAULT 0 COMMENT '是否超级管理员',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login DATETIME COMMENT '最后登录时间',
    INDEX idx_username (username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- -----------------------------------------
-- 角色表
-- -----------------------------------------
CREATE TABLE auth_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    role_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码',
    role_name VARCHAR(100) NOT NULL COMMENT '角色名称',
    description VARCHAR(255) COMMENT '角色描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- -----------------------------------------
-- 权限表
-- -----------------------------------------
CREATE TABLE auth_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '权限ID',
    permission_code VARCHAR(100) NOT NULL UNIQUE COMMENT '权限代码',
    permission_name VARCHAR(100) NOT NULL COMMENT '权限名称',
    permission_type VARCHAR(20) DEFAULT 'menu' COMMENT '权限类型: menu/button/api',
    resource_path VARCHAR(255) COMMENT '资源路径',
    parent_id BIGINT DEFAULT 0 COMMENT '父权限ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_permission_code (permission_code),
    INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- -----------------------------------------
-- 用户角色关联表
-- -----------------------------------------
CREATE TABLE auth_user_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES auth_role(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- -----------------------------------------
-- 角色权限关联表
-- -----------------------------------------
CREATE TABLE auth_role_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL COMMENT '角色ID',
    permission_id BIGINT NOT NULL COMMENT '权限ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id),
    FOREIGN KEY (role_id) REFERENCES auth_role(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES auth_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入默认角色
INSERT INTO auth_role (role_code, role_name, description) VALUES
('admin', '超级管理员', '系统超级管理员，拥有所有权限'),
('analyst', '分析师', '数据分析师，可以查询和分析数据'),
('viewer', '只读用户', '只读用户，可以查看数据');

-- 插入权限数据
INSERT INTO auth_permission (permission_code, permission_name, permission_type, resource_path, parent_id, sort_order) VALUES
-- 系统管理模块
('system', '系统管理', 'menu', '/admin/system', 0, 100),
('system:user', '用户管理', 'menu', '/admin/system/users', 1, 101),
('system:user:list', '用户列表', 'button', '/admin/system/users', 2, 1),
('system:user:create', '创建用户', 'button', '/admin/system/users', 2, 2),
('system:user:update', '编辑用户', 'button', '/admin/system/users', 2, 3),
('system:user:delete', '删除用户', 'button', '/admin/system/users', 2, 4),
('system:user:assign-roles', '分配角色', 'button', '/admin/system/users', 2, 5),
('system:role', '角色管理', 'menu', '/admin/system/roles', 1, 102),
('system:role:list', '角色列表', 'button', '/admin/system/roles', 7, 1),
('system:role:create', '创建角色', 'button', '/admin/system/roles', 7, 2),
('system:role:update', '编辑角色', 'button', '/admin/system/roles', 7, 3),
('system:role:delete', '删除角色', 'button', '/admin/system/roles', 7, 4),
('system:role:assign-permissions', '分配权限', 'button', '/admin/system/roles', 7, 5),
('system:permission', '权限管理', 'menu', '/admin/system/permissions', 1, 103),
('system:permission:list', '权限列表', 'button', '/admin/system/permissions', 12, 1),
-- 数据查询模块
('data', '数据查询', 'menu', '/data', 0, 200),
('data:query', '数据查询', 'button', '/data', 14, 1),
('data:export', '数据导出', 'button', '/data', 14, 2),
-- 预测分析模块
('prediction', '预测分析', 'menu', '/prediction', 0, 300),
('prediction:analyze', '预测分析', 'button', '/prediction', 17, 1),
('prediction:simulate', '仿真调参', 'button', '/prediction', 17, 2);

-- 插入超级管理员用户 (密码: admin123，使用bcrypt加密)
-- bcrypt hash for 'admin123': $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYD2F0l1IqLq
INSERT INTO auth_user (username, password_hash, email, full_name, is_active, is_superuser) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYD2F0l1IqLq', 'admin@operatorboard.com', '系统管理员', 1, 1);

-- 为admin用户分配admin角色
INSERT INTO auth_user_role (user_id, role_id) VALUES (1, 1);

-- 为admin角色分配所有权限
INSERT INTO auth_role_permission (role_id, permission_id)
SELECT 1, id FROM auth_permission;

-- 为analyst角色分配数据和预测权限
INSERT INTO auth_role_permission (role_id, permission_id)
SELECT 2, id FROM auth_permission WHERE permission_code IN ('data', 'data:query', 'data:export', 'prediction', 'prediction:analyze', 'prediction:simulate');

-- 为viewer角色分配只读权限
INSERT INTO auth_role_permission (role_id, permission_id)
SELECT 3, id FROM auth_permission WHERE permission_code IN ('data', 'data:query');

SET FOREIGN_KEY_CHECKS=1;
