-- ============================================================================
-- Migration: Add aggregate avg fields to indicator_info table
-- Date: 2026-04-12
-- Description: 添加LTE/NR汇总指标字段(平均速率、平均PRB利用率、分流比等)
-- ============================================================================

-- 添加LTE汇总指标字段
ALTER TABLE indicator_info
    ADD COLUMN IF NOT EXISTS lte_avg_dl_rate DECIMAL(10,2) COMMENT 'LTE平均下行速率 Mbps' AFTER terminal_penetration_ratio,
    ADD COLUMN IF NOT EXISTS lte_avg_ul_rate DECIMAL(10,2) COMMENT 'LTE平均上行速率 Mbps' AFTER lte_avg_dl_rate,
    ADD COLUMN IF NOT EXISTS lte_avg_dl_prb DECIMAL(10,5) COMMENT 'LTE平均下行PRB利用率' AFTER lte_avg_ul_rate,
    ADD COLUMN IF NOT EXISTS lte_avg_ul_prb DECIMAL(10,5) COMMENT 'LTE平均上行PRB利用率' AFTER lte_avg_dl_prb;

-- 添加NR汇总指标字段
ALTER TABLE indicator_info
    ADD COLUMN IF NOT EXISTS nr_avg_dl_rate DECIMAL(10,2) COMMENT 'NR平均下行速率 Mbps' AFTER lte_avg_ul_prb,
    ADD COLUMN IF NOT EXISTS nr_avg_ul_rate DECIMAL(10,2) COMMENT 'NR平均上行速率 Mbps' AFTER nr_avg_dl_rate,
    ADD COLUMN IF NOT EXISTS nr_avg_dl_prb DECIMAL(10,5) COMMENT 'NR平均下行PRB利用率' AFTER nr_avg_ul_rate,
    ADD COLUMN IF NOT EXISTS nr_avg_ul_prb DECIMAL(10,5) COMMENT 'NR平均上行PRB利用率' AFTER nr_avg_dl_prb;

-- 添加分流/驻留指标字段
ALTER TABLE indicator_info
    ADD COLUMN IF NOT EXISTS traffic_ratio DECIMAL(10,4) COMMENT '流量分流比' AFTER nr_avg_ul_prb,
    ADD COLUMN IF NOT EXISTS duration_campratio DECIMAL(10,4) COMMENT '时长驻留比' AFTER traffic_ratio,
    ADD COLUMN IF NOT EXISTS fallback_ratio DECIMAL(10,4) COMMENT '回流比' AFTER duration_campratio;

-- ============================================================================
-- 回滚脚本 (如需回滚，执行以下SQL)
-- ============================================================================
/*
ALTER TABLE indicator_info
    DROP COLUMN IF EXISTS lte_avg_dl_rate,
    DROP COLUMN IF EXISTS lte_avg_ul_rate,
    DROP COLUMN IF EXISTS lte_avg_dl_prb,
    DROP COLUMN IF EXISTS lte_avg_ul_prb,
    DROP COLUMN IF EXISTS nr_avg_dl_rate,
    DROP COLUMN IF EXISTS nr_avg_ul_rate,
    DROP COLUMN IF EXISTS nr_avg_dl_prb,
    DROP COLUMN IF EXISTS nr_avg_ul_prb,
    DROP COLUMN IF EXISTS traffic_ratio,
    DROP COLUMN IF EXISTS duration_campratio,
    DROP COLUMN IF EXISTS fallback_ratio;
*/
