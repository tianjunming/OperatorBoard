-- V1: Add role inheritance support
-- Adds parent_id to auth_role table to support hierarchical roles

ALTER TABLE auth_role ADD COLUMN parent_id INT DEFAULT NULL;

-- Add foreign key constraint with SET NULL on delete (parent role deleted, children become top-level)
ALTER TABLE auth_role ADD CONSTRAINT fk_auth_role_parent
    FOREIGN KEY (parent_id) REFERENCES auth_role(id) ON DELETE SET NULL;

-- Create index for parent_id lookup performance
CREATE INDEX idx_auth_role_parent_id ON auth_role(parent_id);