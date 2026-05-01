-- ============================================================================
-- Migration V5: Fill Cross-Technology Nulls in operator_summary
-- Date: 2026-05-01
-- Description:
--   operator_summary 表按 technology 分行 (LTE/NR)
--   LTE行缺少NR指标，NR行缺少LTE指标
--   通过 JOIN 同一运营商同月份的不同technology行来填充
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- Phase 1: LTE行填充NR指标
-- ============================================================================

UPDATE operator_summary lte
INNER JOIN operator_summary nr ON
    lte.operator_id = nr.operator_id AND
    lte.data_month = nr.data_month AND
    nr.technology = 'NR'
SET
    lte.nr_avg_dl_rate = nr.nr_avg_dl_rate,
    lte.nr_avg_ul_rate = nr.nr_avg_ul_rate,
    lte.nr_avg_dl_prb = nr.nr_avg_dl_prb,
    lte.nr_avg_ul_prb = nr.nr_avg_ul_prb
WHERE lte.technology = 'LTE'
    AND (lte.nr_avg_dl_rate IS NULL OR lte.nr_avg_ul_rate IS NULL);

-- ============================================================================
-- Phase 2: NR行填充LTE指标
-- ============================================================================

UPDATE operator_summary nr
INNER JOIN operator_summary lte ON
    nr.operator_id = lte.operator_id AND
    nr.data_month = lte.data_month AND
    lte.technology = 'LTE'
SET
    nr.lte_avg_dl_rate = lte.lte_avg_dl_rate,
    nr.lte_avg_ul_rate = lte.lte_avg_ul_rate,
    nr.lte_avg_dl_prb = lte.lte_avg_dl_prb,
    nr.lte_avg_ul_prb = lte.lte_avg_ul_prb
WHERE nr.technology = 'NR'
    AND (nr.lte_avg_dl_rate IS NULL OR nr.lte_avg_ul_rate IS NULL);

-- ============================================================================
-- Phase 3: 验证填充结果
-- ============================================================================

SELECT
    'operator_summary空值检查' AS check_name,
    SUM(CASE WHEN lte_avg_dl_rate IS NOT NULL THEN 1 ELSE 0 END) AS lte_dl_filled,
    SUM(CASE WHEN nr_avg_dl_rate IS NOT NULL THEN 1 ELSE 0 END) AS nr_dl_filled,
    COUNT(*) AS total_rows
FROM operator_summary;

-- ============================================================================
-- Phase 4: 示例数据验证
-- ============================================================================

SELECT
    o.operator_name,
    s.data_month,
    s.technology,
    s.total_site_num,
    s.lte_avg_dl_rate,
    s.nr_avg_dl_rate
FROM operator_summary s
JOIN operator_info o ON s.operator_id = o.id
WHERE s.data_month = '2026-03'
ORDER BY o.operator_name, s.technology
LIMIT 10;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- Migration V5 Complete
-- ============================================================================