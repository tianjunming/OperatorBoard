-- ============================================================================
-- Migration V2: Add Summary Tables and Clean Redundancy
-- Date: 2026-05-01
-- Author: Claude Code
-- Description:
--   1. 创建宽表汇总表 (indicator_summary, site_summary)
--   2. 清理冗余的 operator_summary 表
--   3. 优化查询模式，解决 Schema 与 Entity 不一致问题
--
-- 执行顺序:
--   1. 创建汇总表
--   2. 迁移数据
--   3. 创建索引
--   4. 验证数据一致性
--   5. 备份并删除冗余表
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- Phase 1: 创建 site_summary 表 (站点宽表汇总)
-- 每行 = 1运营商 × 1月份，存储所有频段的站点/小区数
-- ============================================================================

DROP TABLE IF EXISTS site_summary;
CREATE TABLE site_summary (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',

    -- LTE 频段站点小区数
    lte700M_site INT DEFAULT 0 COMMENT 'LTE700M站点数',
    lte700M_cell INT DEFAULT 0 COMMENT 'LTE700M小区数',
    lte800M_site INT DEFAULT 0 COMMENT 'LTE800M站点数',
    lte800M_cell INT DEFAULT 0 COMMENT 'LTE800M小区数',
    lte900M_site INT DEFAULT 0 COMMENT 'LTE900M站点数',
    lte900M_cell INT DEFAULT 0 COMMENT 'LTE900M小区数',
    lte1400M_site INT DEFAULT 0 COMMENT 'LTE1400M站点数',
    lte1400M_cell INT DEFAULT 0 COMMENT 'LTE1400M小区数',
    lte1800M_site INT DEFAULT 0 COMMENT 'LTE1800M站点数',
    lte1800M_cell INT DEFAULT 0 COMMENT 'LTE1800M小区数',
    lte2100M_site INT DEFAULT 0 COMMENT 'LTE2100M站点数',
    lte2100M_cell INT DEFAULT 0 COMMENT 'LTE2100M小区数',
    lte2600M_site INT DEFAULT 0 COMMENT 'LTE2600M站点数',
    lte2600M_cell INT DEFAULT 0 COMMENT 'LTE2600M小区数',

    -- NR 频段站点小区数
    nr700M_site INT DEFAULT 0 COMMENT 'NR700M站点数',
    nr700M_cell INT DEFAULT 0 COMMENT 'NR700M小区数',
    nr800M_site INT DEFAULT 0 COMMENT 'NR800M站点数',
    nr800M_cell INT DEFAULT 0 COMMENT 'NR800M小区数',
    nr900M_site INT DEFAULT 0 COMMENT 'NR900M站点数',
    nr900M_cell INT DEFAULT 0 COMMENT 'NR900M小区数',
    nr1400M_site INT DEFAULT 0 COMMENT 'NR1400M站点数',
    nr1400M_cell INT DEFAULT 0 COMMENT 'NR1400M小区数',
    nr1800M_site INT DEFAULT 0 COMMENT 'NR1800M站点数',
    nr1800M_cell INT DEFAULT 0 COMMENT 'NR1800M小区数',
    nr2100M_site INT DEFAULT 0 COMMENT 'NR2100M站点数',
    nr2100M_cell INT DEFAULT 0 COMMENT 'NR2100M小区数',
    nr2600M_site INT DEFAULT 0 COMMENT 'NR2600M站点数',
    nr2600M_cell INT DEFAULT 0 COMMENT 'NR2600M小区数',
    nr3500M_site INT DEFAULT 0 COMMENT 'NR3500M站点数',
    nr3500M_cell INT DEFAULT 0 COMMENT 'NR3500M小区数',
    nr4900M_site INT DEFAULT 0 COMMENT 'NR4900M站点数',
    nr4900M_cell INT DEFAULT 0 COMMENT 'NR4900M小区数',
    nr2300M_site INT DEFAULT 0 COMMENT 'NR2300M站点数',
    nr2300M_cell INT DEFAULT 0 COMMENT 'NR2300M小区数',

    -- 汇总字段
    lte_total_site INT DEFAULT 0 COMMENT 'LTE总站点数',
    lte_total_cell INT DEFAULT 0 COMMENT 'LTE总小区数',
    nr_total_site INT DEFAULT 0 COMMENT 'NR总站点数',
    nr_total_cell INT DEFAULT 0 COMMENT 'NR总小区数',
    total_site INT DEFAULT 0 COMMENT '总站点数',
    total_cell INT DEFAULT 0 COMMENT '总小区数',

    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_op_month (operator_id, data_month),
    INDEX idx_month (data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================================
-- Phase 2: 创建 indicator_summary 表 (指标宽表汇总)
-- 每行 = 1运营商 × 1月份，存储所有频段的指标
-- ============================================================================

DROP TABLE IF EXISTS indicator_summary;
CREATE TABLE indicator_summary (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',

    -- LTE 频段指标
    lte700M_dl_rate DECIMAL(10,2) COMMENT 'LTE700M下行速率',
    lte700M_ul_rate DECIMAL(10,2) COMMENT 'LTE700M上行速率',
    lte700M_dl_prb DECIMAL(10,5) COMMENT 'LTE700M下行PRB利用率',
    lte700M_ul_prb DECIMAL(10,5) COMMENT 'LTE700M上行PRB利用率',

    lte800M_dl_rate DECIMAL(10,2) COMMENT 'LTE800M下行速率',
    lte800M_ul_rate DECIMAL(10,2) COMMENT 'LTE800M上行速率',
    lte800M_dl_prb DECIMAL(10,5) COMMENT 'LTE800M下行PRB利用率',
    lte800M_ul_prb DECIMAL(10,5) COMMENT 'LTE800M上行PRB利用率',

    lte900M_dl_rate DECIMAL(10,2) COMMENT 'LTE900M下行速率',
    lte900M_ul_rate DECIMAL(10,2) COMMENT 'LTE900M上行速率',
    lte900M_dl_prb DECIMAL(10,5) COMMENT 'LTE900M下行PRB利用率',
    lte900M_ul_prb DECIMAL(10,5) COMMENT 'LTE900M上行PRB利用率',

    lte1400M_dl_rate DECIMAL(10,2) COMMENT 'LTE1400M下行速率',
    lte1400M_ul_rate DECIMAL(10,2) COMMENT 'LTE1400M上行速率',
    lte1400M_dl_prb DECIMAL(10,5) COMMENT 'LTE1400M下行PRB利用率',
    lte1400M_ul_prb DECIMAL(10,5) COMMENT 'LTE1400M上行PRB利用率',

    lte1800M_dl_rate DECIMAL(10,2) COMMENT 'LTE1800M下行速率',
    lte1800M_ul_rate DECIMAL(10,2) COMMENT 'LTE1800M上行速率',
    lte1800M_dl_prb DECIMAL(10,5) COMMENT 'LTE1800M下行PRB利用率',
    lte1800M_ul_prb DECIMAL(10,5) COMMENT 'LTE1800M上行PRB利用率',

    lte2100M_dl_rate DECIMAL(10,2) COMMENT 'LTE2100M下行速率',
    lte2100M_ul_rate DECIMAL(10,2) COMMENT 'LTE2100M上行速率',
    lte2100M_dl_prb DECIMAL(10,5) COMMENT 'LTE2100M下行PRB利用率',
    lte2100M_ul_prb DECIMAL(10,5) COMMENT 'LTE2100M上行PRB利用率',

    lte2600M_dl_rate DECIMAL(10,2) COMMENT 'LTE2600M下行速率',
    lte2600M_ul_rate DECIMAL(10,2) COMMENT 'LTE2600M上行速率',
    lte2600M_dl_prb DECIMAL(10,5) COMMENT 'LTE2600M下行PRB利用率',
    lte2600M_ul_prb DECIMAL(10,5) COMMENT 'LTE2600M上行PRB利用率',

    -- NR 频段指标
    nr700M_dl_rate DECIMAL(10,2) COMMENT 'NR700M下行速率',
    nr700M_ul_rate DECIMAL(10,2) COMMENT 'NR700M上行速率',
    nr700M_dl_prb DECIMAL(10,5) COMMENT 'NR700M下行PRB利用率',
    nr700M_ul_prb DECIMAL(10,5) COMMENT 'NR700M上行PRB利用率',

    nr800M_dl_rate DECIMAL(10,2) COMMENT 'NR800M下行速率',
    nr800M_ul_rate DECIMAL(10,2) COMMENT 'NR800M上行速率',
    nr800M_dl_prb DECIMAL(10,5) COMMENT 'NR800M下行PRB利用率',
    nr800M_ul_prb DECIMAL(10,5) COMMENT 'NR800M上行PRB利用率',

    nr900M_dl_rate DECIMAL(10,2) COMMENT 'NR900M下行速率',
    nr900M_ul_rate DECIMAL(10,2) COMMENT 'NR900M上行速率',
    nr900M_dl_prb DECIMAL(10,5) COMMENT 'NR900M下行PRB利用率',
    nr900M_ul_prb DECIMAL(10,5) COMMENT 'NR900M上行PRB利用率',

    nr1400M_dl_rate DECIMAL(10,2) COMMENT 'NR1400M下行速率',
    nr1400M_ul_rate DECIMAL(10,2) COMMENT 'NR1400M上行速率',
    nr1400M_dl_prb DECIMAL(10,5) COMMENT 'NR1400M下行PRB利用率',
    nr1400M_ul_prb DECIMAL(10,5) COMMENT 'NR1400M上行PRB利用率',

    nr1800M_dl_rate DECIMAL(10,2) COMMENT 'NR1800M下行速率',
    nr1800M_ul_rate DECIMAL(10,2) COMMENT 'NR1800M上行速率',
    nr1800M_dl_prb DECIMAL(10,5) COMMENT 'NR1800M下行PRB利用率',
    nr1800M_ul_prb DECIMAL(10,5) COMMENT 'NR1800M上行PRB利用率',

    nr2100M_dl_rate DECIMAL(10,2) COMMENT 'NR2100M下行速率',
    nr2100M_ul_rate DECIMAL(10,2) COMMENT 'NR2100M上行速率',
    nr2100M_dl_prb DECIMAL(10,5) COMMENT 'NR2100M下行PRB利用率',
    nr2100M_ul_prb DECIMAL(10,5) COMMENT 'NR2100M上行PRB利用率',

    nr2600M_dl_rate DECIMAL(10,2) COMMENT 'NR2600M下行速率',
    nr2600M_ul_rate DECIMAL(10,2) COMMENT 'NR2600M上行速率',
    nr2600M_dl_prb DECIMAL(10,5) COMMENT 'NR2600M下行PRB利用率',
    nr2600M_ul_prb DECIMAL(10,5) COMMENT 'NR2600M上行PRB利用率',

    nr3500M_dl_rate DECIMAL(10,2) COMMENT 'NR3500M下行速率',
    nr3500M_ul_rate DECIMAL(10,2) COMMENT 'NR3500M上行速率',
    nr3500M_dl_prb DECIMAL(10,5) COMMENT 'NR3500M下行PRB利用率',
    nr3500M_ul_prb DECIMAL(10,5) COMMENT 'NR3500M上行PRB利用率',

    nr4900M_dl_rate DECIMAL(10,2) COMMENT 'NR4900M下行速率',
    nr4900M_ul_rate DECIMAL(10,2) COMMENT 'NR4900M上行速率',
    nr4900M_dl_prb DECIMAL(10,5) COMMENT 'NR4900M下行PRB利用率',
    nr4900M_ul_prb DECIMAL(10,5) COMMENT 'NR4900M上行PRB利用率',

    nr2300M_dl_rate DECIMAL(10,2) COMMENT 'NR2300M下行速率',
    nr2300M_ul_rate DECIMAL(10,2) COMMENT 'NR2300M上行速率',
    nr2300M_dl_prb DECIMAL(10,5) COMMENT 'NR2300M下行PRB利用率',
    nr2300M_ul_prb DECIMAL(10,5) COMMENT 'NR2300M上行PRB利用率',

    -- LTE 汇总指标
    lte_avg_dl_rate DECIMAL(10,2) COMMENT 'LTE平均下行速率',
    lte_avg_ul_rate DECIMAL(10,2) COMMENT 'LTE平均上行速率',
    lte_avg_dl_prb DECIMAL(10,5) COMMENT 'LTE平均下行PRB利用率',
    lte_avg_ul_prb DECIMAL(10,5) COMMENT 'LTE平均上行PRB利用率',

    -- NR 汇总指标
    nr_avg_dl_rate DECIMAL(10,2) COMMENT 'NR平均下行速率',
    nr_avg_ul_rate DECIMAL(10,2) COMMENT 'NR平均上行速率',
    nr_avg_dl_prb DECIMAL(10,5) COMMENT 'NR平均下行PRB利用率',
    nr_avg_ul_prb DECIMAL(10,5) COMMENT 'NR平均上行PRB利用率',

    -- 分流/驻留指标
    traffic_ratio DECIMAL(10,4) COMMENT '流量分流比',
    duration_campratio DECIMAL(10,4) COMMENT '时长驻留比',
    terminal_penetration DECIMAL(10,4) COMMENT '终端渗透率',
    fallback_ratio DECIMAL(10,4) COMMENT '回流比',

    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_op_month (operator_id, data_month),
    INDEX idx_month (data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================================
-- Phase 3: 迁移 site_info 数据到 site_summary
-- ============================================================================

INSERT INTO site_summary (
    operator_id, data_month,
    lte700M_site, lte700M_cell,
    lte800M_site, lte800M_cell,
    lte900M_site, lte900M_cell,
    lte1400M_site, lte1400M_cell,
    lte1800M_site, lte1800M_cell,
    lte2100M_site, lte2100M_cell,
    lte2600M_site, lte2600M_cell,
    nr700M_site, nr700M_cell,
    nr800M_site, nr800M_cell,
    nr900M_site, nr900M_cell,
    nr1400M_site, nr1400M_cell,
    nr1800M_site, nr1800M_cell,
    nr2100M_site, nr2100M_cell,
    nr2600M_site, nr2600M_cell,
    nr3500M_site, nr3500M_cell,
    nr4900M_site, nr4900M_cell,
    nr2300M_site, nr2300M_cell
)
SELECT
    operator_id,
    data_month,
    COALESCE(MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN site_num END), 0) AS lte700M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN cell_num END), 0) AS lte700M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN site_num END), 0) AS lte800M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN cell_num END), 0) AS lte800M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN site_num END), 0) AS lte900M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN cell_num END), 0) AS lte900M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN site_num END), 0) AS lte1400M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN cell_num END), 0) AS lte1400M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN site_num END), 0) AS lte1800M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN cell_num END), 0) AS lte1800M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN site_num END), 0) AS lte2100M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN cell_num END), 0) AS lte2100M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN site_num END), 0) AS lte2600M_site,
    COALESCE(MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN cell_num END), 0) AS lte2600M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR700M_FDD' THEN site_num END), 0) AS nr700M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR700M_FDD' THEN cell_num END), 0) AS nr700M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR800M_FDD' THEN site_num END), 0) AS nr800M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR800M_FDD' THEN cell_num END), 0) AS nr800M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR900M_FDD' THEN site_num END), 0) AS nr900M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR900M_FDD' THEN cell_num END), 0) AS nr900M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN site_num END), 0) AS nr1400M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN cell_num END), 0) AS nr1400M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN site_num END), 0) AS nr1800M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN cell_num END), 0) AS nr1800M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN site_num END), 0) AS nr2100M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN cell_num END), 0) AS nr2100M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN site_num END), 0) AS nr2600M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN cell_num END), 0) AS nr2600M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN site_num END), 0) AS nr3500M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN cell_num END), 0) AS nr3500M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN site_num END), 0) AS nr4900M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN cell_num END), 0) AS nr4900M_cell,
    COALESCE(MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN site_num END), 0) AS nr2300M_site,
    COALESCE(MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN cell_num END), 0) AS nr2300M_cell
FROM site_info ss
JOIN band_info b ON ss.band_id = b.id
GROUP BY operator_id, data_month;

-- 更新汇总字段
UPDATE site_summary SET
    lte_total_site = lte700M_site + lte800M_site + lte900M_site + lte1400M_site + lte1800M_site + lte2100M_site + lte2600M_site,
    lte_total_cell = lte700M_cell + lte800M_cell + lte900M_cell + lte1400M_cell + lte1800M_cell + lte2100M_cell + lte2600M_cell,
    nr_total_site = nr700M_site + nr800M_site + nr900M_site + nr1400M_site + nr1800M_site + nr2100M_site + nr2600M_site + nr3500M_site + nr4900M_site + nr2300M_site,
    nr_total_cell = nr700M_cell + nr800M_cell + nr900M_cell + nr1400M_cell + nr1800M_cell + nr2100M_cell + nr2600M_cell + nr3500M_cell + nr4900M_cell + nr2300M_cell,
    total_site = lte_total_site + nr_total_site,
    total_cell = lte_total_cell + nr_total_cell;

-- ============================================================================
-- Phase 4: 迁移 indicator_info 数据到 indicator_summary
-- ============================================================================

INSERT INTO indicator_summary (
    operator_id, data_month,
    lte700M_dl_rate, lte700M_ul_rate, lte700M_dl_prb, lte700M_ul_prb,
    lte800M_dl_rate, lte800M_ul_rate, lte800M_dl_prb, lte800M_ul_prb,
    lte900M_dl_rate, lte900M_ul_rate, lte900M_dl_prb, lte900M_ul_prb,
    lte1400M_dl_rate, lte1400M_ul_rate, lte1400M_dl_prb, lte1400M_ul_prb,
    lte1800M_dl_rate, lte1800M_ul_rate, lte1800M_dl_prb, lte1800M_ul_prb,
    lte2100M_dl_rate, lte2100M_ul_rate, lte2100M_dl_prb, lte2100M_ul_prb,
    lte2600M_dl_rate, lte2600M_ul_rate, lte2600M_dl_prb, lte2600M_ul_prb,
    nr700M_dl_rate, nr700M_ul_rate, nr700M_dl_prb, nr700M_ul_prb,
    nr800M_dl_rate, nr800M_ul_rate, nr800M_dl_prb, nr800M_ul_prb,
    nr900M_dl_rate, nr900M_ul_rate, nr900M_dl_prb, nr900M_ul_prb,
    nr1400M_dl_rate, nr1400M_ul_rate, nr1400M_dl_prb, nr1400M_ul_prb,
    nr1800M_dl_rate, nr1800M_ul_rate, nr1800M_dl_prb, nr1800M_ul_prb,
    nr2100M_dl_rate, nr2100M_ul_rate, nr2100M_dl_prb, nr2100M_ul_prb,
    nr2600M_dl_rate, nr2600M_ul_rate, nr2600M_dl_prb, nr2600M_ul_prb,
    nr3500M_dl_rate, nr3500M_ul_rate, nr3500M_dl_prb, nr3500M_ul_prb,
    nr4900M_dl_rate, nr4900M_ul_rate, nr4900M_dl_prb, nr4900M_ul_prb,
    nr2300M_dl_rate, nr2300M_ul_rate, nr2300M_dl_prb, nr2300M_ul_prb
)
SELECT
    operator_id,
    data_month,
    MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN dl_rate END) AS lte700M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN ul_rate END) AS lte700M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN dl_prb END) AS lte700M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE700M_FDD' THEN ul_prb END) AS lte700M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN dl_rate END) AS lte800M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN ul_rate END) AS lte800M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN dl_prb END) AS lte800M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE800M_FDD' THEN ul_prb END) AS lte800M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN dl_rate END) AS lte900M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN ul_rate END) AS lte900M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN dl_prb END) AS lte900M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE900M_FDD' THEN ul_prb END) AS lte900M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN dl_rate END) AS lte1400M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN ul_rate END) AS lte1400M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN dl_prb END) AS lte1400M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE1400M_FDD' THEN ul_prb END) AS lte1400M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN dl_rate END) AS lte1800M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN ul_rate END) AS lte1800M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN dl_prb END) AS lte1800M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE1800M_FDD' THEN ul_prb END) AS lte1800M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN dl_rate END) AS lte2100M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN ul_rate END) AS lte2100M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN dl_prb END) AS lte2100M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE2100M_FDD' THEN ul_prb END) AS lte2100M_ul_prb,
    MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN dl_rate END) AS lte2600M_dl_rate,
    MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN ul_rate END) AS lte2600M_ul_rate,
    MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN dl_prb END) AS lte2600M_dl_prb,
    MAX(CASE WHEN band_code = 'LTE2600M_FDD' THEN ul_prb END) AS lte2600M_ul_prb,
    MAX(CASE WHEN band_code = 'NR700M_FDD' THEN dl_rate END) AS nr700M_dl_rate,
    MAX(CASE WHEN band_code = 'NR700M_FDD' THEN ul_rate END) AS nr700M_ul_rate,
    MAX(CASE WHEN band_code = 'NR700M_FDD' THEN dl_prb END) AS nr700M_dl_prb,
    MAX(CASE WHEN band_code = 'NR700M_FDD' THEN ul_prb END) AS nr700M_ul_prb,
    MAX(CASE WHEN band_code = 'NR800M_FDD' THEN dl_rate END) AS nr800M_dl_rate,
    MAX(CASE WHEN band_code = 'NR800M_FDD' THEN ul_rate END) AS nr800M_ul_rate,
    MAX(CASE WHEN band_code = 'NR800M_FDD' THEN dl_prb END) AS nr800M_dl_prb,
    MAX(CASE WHEN band_code = 'NR800M_FDD' THEN ul_prb END) AS nr800M_ul_prb,
    MAX(CASE WHEN band_code = 'NR900M_FDD' THEN dl_rate END) AS nr900M_dl_rate,
    MAX(CASE WHEN band_code = 'NR900M_FDD' THEN ul_rate END) AS nr900M_ul_rate,
    MAX(CASE WHEN band_code = 'NR900M_FDD' THEN dl_prb END) AS nr900M_dl_prb,
    MAX(CASE WHEN band_code = 'NR900M_FDD' THEN ul_prb END) AS nr900M_ul_prb,
    MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN dl_rate END) AS nr1400M_dl_rate,
    MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN ul_rate END) AS nr1400M_ul_rate,
    MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN dl_prb END) AS nr1400M_dl_prb,
    MAX(CASE WHEN band_code = 'NR1400M_FDD' THEN ul_prb END) AS nr1400M_ul_prb,
    MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN dl_rate END) AS nr1800M_dl_rate,
    MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN ul_rate END) AS nr1800M_ul_rate,
    MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN dl_prb END) AS nr1800M_dl_prb,
    MAX(CASE WHEN band_code = 'NR1800M_FDD' THEN ul_prb END) AS nr1800M_ul_prb,
    MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN dl_rate END) AS nr2100M_dl_rate,
    MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN ul_rate END) AS nr2100M_ul_rate,
    MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN dl_prb END) AS nr2100M_dl_prb,
    MAX(CASE WHEN band_code = 'NR2100M_FDD' THEN ul_prb END) AS nr2100M_ul_prb,
    MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN dl_rate END) AS nr2600M_dl_rate,
    MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN ul_rate END) AS nr2600M_ul_rate,
    MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN dl_prb END) AS nr2600M_dl_prb,
    MAX(CASE WHEN band_code = 'NR2600M_FDD' THEN ul_prb END) AS nr2600M_ul_prb,
    MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN dl_rate END) AS nr3500M_dl_rate,
    MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN ul_rate END) AS nr3500M_ul_rate,
    MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN dl_prb END) AS nr3500M_dl_prb,
    MAX(CASE WHEN band_code = 'NR3500M_TDD' THEN ul_prb END) AS nr3500M_ul_prb,
    MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN dl_rate END) AS nr4900M_dl_rate,
    MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN ul_rate END) AS nr4900M_ul_rate,
    MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN dl_prb END) AS nr4900M_dl_prb,
    MAX(CASE WHEN band_code = 'NR4900M_TDD' THEN ul_prb END) AS nr4900M_ul_prb,
    MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN dl_rate END) AS nr2300M_dl_rate,
    MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN ul_rate END) AS nr2300M_ul_rate,
    MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN dl_prb END) AS nr2300M_dl_prb,
    MAX(CASE WHEN band_code = 'NR2300M_FDD' THEN ul_prb END) AS nr2300M_ul_prb
FROM indicator_info ii
JOIN band_info b ON ii.band_id = b.id
GROUP BY operator_id, data_month;

-- 更新汇总指标 (从原 indicator_info 表的汇总字段迁移)
UPDATE indicator_summary s
JOIN indicator_info i ON s.operator_id = i.operator_id AND s.data_month = i.data_month
SET
    s.lte_avg_dl_rate = i.lte_avg_dl_rate,
    s.lte_avg_ul_rate = i.lte_avg_ul_rate,
    s.lte_avg_dl_prb = i.lte_avg_dl_prb,
    s.lte_avg_ul_prb = i.lte_avg_ul_prb,
    s.nr_avg_dl_rate = i.nr_avg_dl_rate,
    s.nr_avg_ul_rate = i.nr_avg_ul_rate,
    s.nr_avg_dl_prb = i.nr_avg_dl_prb,
    s.nr_avg_ul_prb = i.nr_avg_ul_prb,
    s.traffic_ratio = i.traffic_ratio,
    s.duration_campratio = i.duration_campratio,
    s.terminal_penetration = i.terminal_penetration_ratio,
    s.fallback_ratio = i.fallback_ratio
WHERE i.lte_avg_dl_rate IS NOT NULL OR i.nr_avg_dl_rate IS NOT NULL;

-- ============================================================================
-- Phase 5: 验证数据一致性
-- ============================================================================

-- 验证 site_summary 数据
SELECT
    'site_summary' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT operator_id) AS unique_operators,
    COUNT(DISTINCT data_month) AS unique_months
FROM site_summary;

-- 验证 indicator_summary 数据
SELECT
    'indicator_summary' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT operator_id) AS unique_operators,
    COUNT(DISTINCT data_month) AS unique_months
FROM indicator_summary;

-- 验证数据一致性 (site_summary vs site_info)
SELECT
    'data_consistency_check' AS check_name,
    (SELECT COUNT(*) FROM site_summary) AS summary_count,
    (SELECT COUNT(DISTINCT CONCAT(operator_id, data_month)) FROM site_summary) AS summary_unique,
    (SELECT COUNT(DISTINCT CONCAT(operator_id, data_month)) FROM site_info) AS fact_unique,
    CASE
        WHEN (SELECT COUNT(DISTINCT CONCAT(operator_id, data_month)) FROM site_summary) =
             (SELECT COUNT(DISTINCT CONCAT(operator_id, data_month)) FROM site_info)
        THEN 'PASS' ELSE 'FAIL'
    END AS status;

-- ============================================================================
-- Phase 6: 清理冗余表 (可选 - 建议先备份)
-- 注释以下内容以保留 operator_summary 表
-- ============================================================================

/*
-- 备份 operator_summary
RENAME TABLE operator_summary TO operator_summary_backup;

-- 验证备份
SHOW TABLES LIKE 'operator_summary%';
*/

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- 迁移完成
-- ============================================================================
