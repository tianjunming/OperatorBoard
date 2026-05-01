-- ============================================================================
-- Migration V3: Rename operator_total_site to operator_summary
--              and migrate extra fields from indicator_info
-- Date: 2026-05-01
--
-- Status: ALREADY APPLIED - operator_summary already existed with extended columns
--         indicator_info extra columns were dropped
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- Phase 1: Rename operator_total_site to operator_summary (skipped - already exists)
-- ============================================================================

-- RENAME TABLE operator_total_site TO operator_summary;

-- ============================================================================
-- Phase 2: Add extra columns to operator_summary (skipped - already has them)
-- ============================================================================

-- ALTER TABLE operator_summary
--     ADD COLUMN online_users ... (already exists)

-- ============================================================================
-- Phase 3: Migrate data from indicator_info to operator_summary (skipped - data exists)
-- ============================================================================

-- Data already migrated in previous V1 migration

-- ============================================================================
-- Phase 4: Remove extra columns from indicator_info
-- ============================================================================

ALTER TABLE indicator_info
    DROP COLUMN online_users,
    DROP COLUMN nr_users,
    DROP COLUMN terminal_penetration_ratio,
    DROP COLUMN lte_avg_dl_rate,
    DROP COLUMN lte_avg_ul_rate,
    DROP COLUMN lte_avg_dl_prb,
    DROP COLUMN lte_avg_ul_prb,
    DROP COLUMN nr_avg_dl_rate,
    DROP COLUMN nr_avg_ul_rate,
    DROP COLUMN nr_avg_dl_prb,
    DROP COLUMN nr_avg_ul_prb,
    DROP COLUMN traffic_ratio,
    DROP COLUMN duration_campratio,
    DROP COLUMN fallback_ratio;

-- ============================================================================
-- Phase 5: Verification
-- ============================================================================

SELECT 'operator_summary' as tbl, COUNT(*) as rows FROM operator_summary
UNION ALL
SELECT 'indicator_info', COUNT(*) FROM indicator_info;

-- Verify columns in operator_summary
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'operator_db' AND table_name = 'operator_summary'
ORDER BY ordinal_position;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- Migration V3 Complete
-- ============================================================================