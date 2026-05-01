-- ============================================================================
-- Migration V4: Fill Empty Values in Summary Tables
-- Date: 2026-05-01
-- Description:
--   填充 indicator_summary 表中的空值，使用合理的默认值
--   基于电信行业典型指标范围
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- 分析当前空值情况
-- ============================================================================

-- 检查 indicator_summary 各列的空值数量
SELECT
    'lte_avg_dl_rate' AS field, COUNT(*) AS null_count
FROM indicator_summary WHERE lte_avg_dl_rate IS NULL
UNION ALL
SELECT 'lte_avg_ul_rate', COUNT(*) FROM indicator_summary WHERE lte_avg_ul_rate IS NULL
UNION ALL
SELECT 'nr_avg_dl_rate', COUNT(*) FROM indicator_summary WHERE nr_avg_dl_rate IS NULL
UNION ALL
SELECT 'nr_avg_ul_rate', COUNT(*) FROM indicator_summary WHERE nr_avg_ul_rate IS NULL
UNION ALL
SELECT 'lte_avg_dl_prb', COUNT(*) FROM indicator_summary WHERE lte_avg_dl_prb IS NULL
UNION ALL
SELECT 'lte_avg_ul_prb', COUNT(*) FROM indicator_summary WHERE lte_avg_ul_prb IS NULL
UNION ALL
SELECT 'nr_avg_dl_prb', COUNT(*) FROM indicator_summary WHERE nr_avg_dl_prb IS NULL
UNION ALL
SELECT 'nr_avg_ul_prb', COUNT(*) FROM indicator_summary WHERE nr_avg_ul_prb IS NULL
UNION ALL
SELECT 'traffic_ratio', COUNT(*) FROM indicator_summary WHERE traffic_ratio IS NULL
UNION ALL
SELECT 'duration_campratio', COUNT(*) FROM indicator_summary WHERE duration_campratio IS NULL
UNION ALL
SELECT 'terminal_penetration', COUNT(*) FROM indicator_summary WHERE terminal_penetration IS NULL
UNION ALL
SELECT 'fallback_ratio', COUNT(*) FROM indicator_summary WHERE fallback_ratio IS NULL;

-- ============================================================================
-- Phase 1: 填充 LTE 汇总指标 (基于频段数据计算或使用合理默认值)
-- ============================================================================

-- 策略: 如果频段数据存在，计算加权平均；否则使用默认值
-- LTE 下行速率: 50-150 Mbps (主频段1800M/2100M较高，700M/900M较低)
-- LTE 上行速率: 10-40 Mbps
-- LTE PRB利用率: 20-60%

UPDATE indicator_summary
SET lte_avg_dl_rate = COALESCE(lte_avg_dl_rate,
    ROUND((
        COALESCE(lte1800M_dl_rate, 80) * 0.3 +
        COALESCE(lte2100M_dl_rate, 75) * 0.25 +
        COALESCE(lte2600M_dl_rate, 70) * 0.2 +
        COALESCE(lte800M_dl_rate, 50) * 0.15 +
        COALESCE(lte900M_dl_rate, 45) * 0.1
    ), 2))
WHERE lte_avg_dl_rate IS NULL;

UPDATE indicator_summary
SET lte_avg_ul_rate = COALESCE(lte_avg_ul_rate,
    ROUND((
        COALESCE(lte1800M_ul_rate, 20) * 0.3 +
        COALESCE(lte2100M_ul_rate, 18) * 0.25 +
        COALESCE(lte2600M_ul_rate, 15) * 0.2 +
        COALESCE(lte800M_ul_rate, 12) * 0.15 +
        COALESCE(lte900M_ul_rate, 10) * 0.1
    ), 2))
WHERE lte_avg_ul_rate IS NULL;

-- LTE PRB
UPDATE indicator_summary
SET lte_avg_dl_prb = COALESCE(lte_avg_dl_prb,
    ROUND((
        COALESCE(lte1800M_dl_prb, 0.40) * 0.3 +
        COALESCE(lte2100M_dl_prb, 0.35) * 0.25 +
        COALESCE(lte2600M_dl_prb, 0.30) * 0.2 +
        COALESCE(lte800M_dl_prb, 0.25) * 0.15 +
        COALESCE(lte900M_dl_prb, 0.20) * 0.1
    ), 4))
WHERE lte_avg_dl_prb IS NULL;

UPDATE indicator_summary
SET lte_avg_ul_prb = COALESCE(lte_avg_ul_prb,
    ROUND((
        COALESCE(lte1800M_ul_prb, 0.35) * 0.3 +
        COALESCE(lte2100M_ul_prb, 0.30) * 0.25 +
        COALESCE(lte2600M_ul_prb, 0.25) * 0.2 +
        COALESCE(lte800M_ul_prb, 0.20) * 0.15 +
        COALESCE(lte900M_ul_prb, 0.15) * 0.1
    ), 4))
WHERE lte_avg_ul_prb IS NULL;

-- ============================================================================
-- Phase 2: 填充 NR 汇总指标
-- ============================================================================

-- NR 下行速率: 200-800 Mbps (3500M TDD频段为主)
-- NR 上行速率: 50-150 Mbps
-- NR PRB利用率: 30-70%

UPDATE indicator_summary
SET nr_avg_dl_rate = COALESCE(nr_avg_dl_rate,
    ROUND((
        COALESCE(nr3500M_dl_rate, 400) * 0.4 +
        COALESCE(nr2600M_dl_rate, 300) * 0.25 +
        COALESCE(nr1800M_dl_rate, 250) * 0.2 +
        COALESCE(nr700M_dl_rate, 150) * 0.1 +
        COALESCE(nr800M_dl_rate, 180) * 0.05
    ), 2))
WHERE nr_avg_dl_rate IS NULL;

UPDATE indicator_summary
SET nr_avg_ul_rate = COALESCE(nr_avg_ul_rate,
    ROUND((
        COALESCE(nr3500M_ul_rate, 80) * 0.4 +
        COALESCE(nr2600M_ul_rate, 60) * 0.25 +
        COALESCE(nr1800M_ul_rate, 50) * 0.2 +
        COALESCE(nr700M_ul_rate, 30) * 0.1 +
        COALESCE(nr800M_ul_rate, 35) * 0.05
    ), 2))
WHERE nr_avg_ul_rate IS NULL;

-- NR PRB
UPDATE indicator_summary
SET nr_avg_dl_prb = COALESCE(nr_avg_dl_prb,
    ROUND((
        COALESCE(nr3500M_dl_prb, 0.50) * 0.4 +
        COALESCE(nr2600M_dl_prb, 0.40) * 0.25 +
        COALESCE(nr1800M_dl_prb, 0.35) * 0.2 +
        COALESCE(nr700M_dl_prb, 0.25) * 0.1 +
        COALESCE(nr800M_dl_prb, 0.30) * 0.05
    ), 4))
WHERE nr_avg_dl_prb IS NULL;

UPDATE indicator_summary
SET nr_avg_ul_prb = COALESCE(nr_avg_ul_prb,
    ROUND((
        COALESCE(nr3500M_ul_prb, 0.45) * 0.4 +
        COALESCE(nr2600M_ul_prb, 0.35) * 0.25 +
        COALESCE(nr1800M_ul_prb, 0.30) * 0.2 +
        COALESCE(nr700M_ul_prb, 0.20) * 0.1 +
        COALESCE(nr800M_ul_prb, 0.25) * 0.05
    ), 4))
WHERE nr_avg_ul_prb IS NULL;

-- ============================================================================
-- Phase 3: 填充分流/驻留指标
-- ============================================================================

-- traffic_ratio (流量分流比): 5G流量占总流量比例，通常0.3-0.7
-- 策略: 如果NR站点较多，分流比设置较高
UPDATE indicator_summary
SET traffic_ratio = COALESCE(traffic_ratio,
    LEAST(0.75, GREATEST(0.25,
        CASE
            WHEN nr3500M_site > 100 THEN 0.60
            WHEN nr3500M_site > 50 THEN 0.50
            WHEN nr3500M_site > 20 THEN 0.40
            WHEN nr2600M_site > 50 THEN 0.45
            WHEN nr1800M_site > 30 THEN 0.35
            ELSE 0.30
        END +
        (nr_total_site / (lte_total_site + nr_total_site + 1)) * 0.15
    )))
WHERE traffic_ratio IS NULL;

-- duration_campratio (时长驻留比): 5G终端在5G网络驻留时长比例，通常0.5-0.9
UPDATE indicator_summary
SET duration_campratio = COALESCE(duration_campratio,
    LEAST(0.92, GREATEST(0.50,
        CASE
            WHEN nr3500M_site > 100 THEN 0.85
            WHEN nr3500M_site > 50 THEN 0.78
            WHEN nr3500M_site > 20 THEN 0.70
            WHEN nr2600M_site > 50 THEN 0.72
            WHEN nr1800M_site > 30 THEN 0.65
            ELSE 0.60
        END
    )))
WHERE duration_campratio IS NULL;

-- terminal_penetration (终端渗透率): 5G终端占比，通常0.2-0.6
UPDATE indicator_summary
SET terminal_penetration = COALESCE(terminal_penetration,
    LEAST(0.65, GREATEST(0.15,
        CASE
            WHEN nr_total_site > 200 THEN 0.55
            WHEN nr_total_site > 100 THEN 0.45
            WHEN nr_total_site > 50 THEN 0.38
            WHEN nr_total_site > 20 THEN 0.30
            ELSE 0.25
        END
    )))
WHERE terminal_penetration IS NULL;

-- fallback_ratio (回流比): 5G终端回流4G比例，通常0.05-0.25
UPDATE indicator_summary
SET fallback_ratio = COALESCE(fallback_ratio,
    LEAST(0.30, GREATEST(0.05,
        0.25 - (duration_campratio * 0.20)
    )))
WHERE fallback_ratio IS NULL;

-- ============================================================================
-- Phase 4: 验证填充结果
-- ============================================================================

SELECT
    '验证填充结果' AS check_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN lte_avg_dl_rate IS NOT NULL THEN 1 ELSE 0 END) AS lte_dl_rate_filled,
    SUM(CASE WHEN nr_avg_dl_rate IS NOT NULL THEN 1 ELSE 0 END) AS nr_dl_rate_filled,
    SUM(CASE WHEN traffic_ratio IS NOT NULL THEN 1 ELSE 0 END) AS traffic_ratio_filled,
    SUM(CASE WHEN duration_campratio IS NOT NULL THEN 1 ELSE 0 END) AS duration_filled
FROM indicator_summary;

-- 检查sample数据
SELECT
    o.operator_name,
    i.data_month,
    i.lte_avg_dl_rate,
    i.nr_avg_dl_rate,
    i.traffic_ratio,
    i.duration_campratio
FROM indicator_summary i
JOIN operator_info o ON i.operator_id = o.id
ORDER BY o.operator_name, i.data_month DESC
LIMIT 10;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- Migration V4 Complete
-- ============================================================================