-- Migration: Add user approval fields to auth_user table
-- Database: operator_db

-- Add approval-related columns to auth_user table
ALTER TABLE auth_user
ADD COLUMN is_approved BOOLEAN DEFAULT FALSE AFTER is_superuser,
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' AFTER is_approved,
ADD COLUMN approved_by INT NULL AFTER approval_status,
ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER approved_at;

-- Set existing admin user as approved
UPDATE auth_user SET is_approved = TRUE, approval_status = 'approved' WHERE username = 'admin';

-- Add foreign key constraint for approved_by (optional, requires auth_user table to exist)
-- This is commented out because the self-reference can cause issues
-- ALTER TABLE auth_user
-- ADD CONSTRAINT fk_auth_user_approver
-- FOREIGN KEY (approved_by) REFERENCES auth_user(id) ON DELETE SET NULL;
