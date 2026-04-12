-- ============================================================================
-- OperatorBoard 星型模型 (Star Schema)
-- 重构日期: 2026-04-11
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- 运营商维度表
-- ============================================================================
DROP TABLE IF EXISTS operator_info;
CREATE TABLE operator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_code VARCHAR(50) UNIQUE NOT NULL COMMENT '运营商代码',
    operator_name VARCHAR(255) NOT NULL COMMENT '运营商名称',
    alias_name VARCHAR(255) COMMENT '别名',
    country VARCHAR(100) NOT NULL COMMENT '国家',
    region VARCHAR(50) NOT NULL COMMENT '区域',
    network_type VARCHAR(20) COMMENT '网络类型 4G/5G',
    status TINYINT DEFAULT 1 COMMENT '状态 1-激活 0-停用',
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country (country),
    INDEX idx_region (region),
    INDEX idx_network_type (network_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================================
-- 频段维度表 (21个频段)
-- ============================================================================
DROP TABLE IF EXISTS band_info;
CREATE TABLE band_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    band_code VARCHAR(20) UNIQUE NOT NULL COMMENT '频段代码 如 LTE700M_FDD',
    band_name VARCHAR(50) NOT NULL COMMENT '频段名称 如 LTE 700M FDD',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR',
    frequency_mhz INT NOT NULL COMMENT '中心频率 MHz',
    duplex_mode VARCHAR(10) NOT NULL COMMENT '双工模式 FDD/TDD',
    band_group VARCHAR(20) COMMENT '频段组 700M/800M/900M等',
    INDEX idx_tech (technology),
    INDEX idx_duplex (duplex_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 插入21个频段数据
INSERT INTO band_info (band_code, band_name, technology, frequency_mhz, duplex_mode, band_group) VALUES
-- LTE 频段 (10个)
('LTE700M_FDD', 'LTE 700M FDD', 'LTE', 700, 'FDD', '700M'),
('LTE800M_FDD', 'LTE 800M FDD', 'LTE', 800, 'FDD', '800M'),
('LTE900M_FDD', 'LTE 900M FDD', 'LTE', 900, 'FDD', '900M'),
('LTE1400M_FDD', 'LTE 1400M FDD', 'LTE', 1400, 'FDD', '1400M'),
('LTE1800M_FDD', 'LTE 1800M FDD', 'LTE', 1800, 'FDD', '1800M'),
('LTE2100M_FDD', 'LTE 2100M FDD', 'LTE', 2100, 'FDD', '2100M'),
('LTE2300M_FDD', 'LTE 2300M FDD', 'LTE', 2300, 'FDD', '2300M'),
('LTE2300M_TDD', 'LTE 2300M TDD', 'LTE', 2300, 'TDD', '2300M'),
('LTE2600M_FDD', 'LTE 2600M FDD', 'LTE', 2600, 'FDD', '2600M'),
('LTE2600M_TDD', 'LTE 2600M TDD', 'LTE', 2600, 'TDD', '2600M'),
-- NR 频段 (11个)
('NR700M_FDD', 'NR 700M FDD', 'NR', 700, 'FDD', '700M'),
('NR800M_FDD', 'NR 800M FDD', 'NR', 800, 'FDD', '800M'),
('NR900M_FDD', 'NR 900M FDD', 'NR', 900, 'FDD', '900M'),
('NR1400M_FDD', 'NR 1400M FDD', 'NR', 1400, 'FDD', '1400M'),
('NR1800M_FDD', 'NR 1800M FDD', 'NR', 1800, 'FDD', '1800M'),
('NR2100M_FDD', 'NR 2100M FDD', 'NR', 2100, 'FDD', '2100M'),
('NR2300M_FDD', 'NR 2300M FDD', 'NR', 2300, 'FDD', '2300M'),
('NR2300M_TDD', 'NR 2300M TDD', 'NR', 2300, 'TDD', '2300M'),
('NR2600M_FDD', 'NR 2600M FDD', 'NR', 2600, 'FDD', '2600M'),
('NR2600M_TDD', 'NR 2600M TDD', 'NR', 2600, 'TDD', '2600M'),
('NR3500M_TDD', 'NR 3500M TDD', 'NR', 3500, 'TDD', '3500M'),
('NR4900M_TDD', 'NR 4900M TDD', 'NR', 4900, 'TDD', '4900M');

-- 从operator_info迁移数据到operator
INSERT INTO operator_info (operator_code, operator_name, country, region, network_type)
SELECT
    CONCAT('OP', LPAD(id, 3, '0')) as operator_code,
    operator_name,
    COALESCE(country, 'Unknown') as country,
    COALESCE(region, 'Unknown') as region,
    COALESCE(network_type, '4G/5G') as network_type
FROM operator_info
GROUP BY operator_name;

-- ============================================================================
-- 站点信息表
-- ============================================================================
DROP TABLE IF EXISTS site_info;
CREATE TABLE site_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    band_id BIGINT NOT NULL COMMENT '频段ID',
    band_name VARCHAR(50) NOT NULL COMMENT '频段名称 如 LTE 700M FDD',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    site_num INT DEFAULT 0 COMMENT '站点数量',
    cell_num INT DEFAULT 0 COMMENT '小区数量',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR',
    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    FOREIGN KEY (band_id) REFERENCES band_info(id),
    UNIQUE KEY uk_op_band_month (operator_id, band_id, data_month),
    INDEX idx_op_month (operator_id, data_month),
    INDEX idx_tech_month (technology, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================================
-- 网络指标表
-- ============================================================================
DROP TABLE IF EXISTS indicator_info;
CREATE TABLE indicator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    band_id BIGINT NOT NULL COMMENT '频段ID',
    band_name VARCHAR(50) NOT NULL COMMENT '频段名称 如 LTE 700M FDD',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR',

    -- PRB指标
    dl_prb DECIMAL(10,5) COMMENT '下行PRB利用率',
    ul_prb DECIMAL(10,5) COMMENT '上行PRB利用率',

    -- 吞吐量指标
    dl_rate DECIMAL(10,2) COMMENT '下行速率 Mbps',
    ul_rate DECIMAL(10,2) COMMENT '上行速率 Mbps',

    -- 流量指标
    total_traffic DECIMAL(15,2) COMMENT '总流量 MB',
    dl_traffic DECIMAL(15,2) COMMENT '下行流量 MB',
    ul_traffic DECIMAL(15,2) COMMENT '上行流量 MB',

    -- 用户指标
    online_users DECIMAL(10,2) COMMENT '在线用户数',
    nr_users DECIMAL(10,2) COMMENT 'NR用户数',

    -- 终端指标
    terminal_penetration_ratio DECIMAL(10,4) COMMENT '终端渗透率',

    -- 汇总指标 (按技术类型 LTE/NR 聚合)
    lte_avg_dl_rate DECIMAL(10,2) COMMENT 'LTE平均下行速率 Mbps',
    lte_avg_ul_rate DECIMAL(10,2) COMMENT 'LTE平均上行速率 Mbps',
    lte_avg_dl_prb DECIMAL(10,5) COMMENT 'LTE平均下行PRB利用率',
    lte_avg_ul_prb DECIMAL(10,5) COMMENT 'LTE平均上行PRB利用率',
    nr_avg_dl_rate DECIMAL(10,2) COMMENT 'NR平均下行速率 Mbps',
    nr_avg_ul_rate DECIMAL(10,2) COMMENT 'NR平均上行速率 Mbps',
    nr_avg_dl_prb DECIMAL(10,5) COMMENT 'NR平均下行PRB利用率',
    nr_avg_ul_prb DECIMAL(10,5) COMMENT 'NR平均上行PRB利用率',

    -- 分流/驻留指标
    traffic_ratio DECIMAL(10,4) COMMENT '流量分流比',
    duration_campratio DECIMAL(10,4) COMMENT '时长驻留比',
    fallback_ratio DECIMAL(10,4) COMMENT '回流比',

    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    FOREIGN KEY (band_id) REFERENCES band_info(id),
    UNIQUE KEY uk_op_band_month (operator_id, band_id, data_month),
    INDEX idx_op_month (operator_id, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================================
-- 运营商月度站点聚合表
-- ============================================================================
DROP TABLE IF EXISTS operator_total_site;
CREATE TABLE operator_total_site (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR/ALL',

    -- LTE和NR小区数（汇总）
    nr_physical_cell_num INT DEFAULT 0 COMMENT 'NR物理小区数',
    lte_physical_cell_num INT DEFAULT 0 COMMENT 'LTE物理小区数',

    -- LTE和NR物理站点（确定值，非汇总）
    lte_physical_site_num INT DEFAULT 0 COMMENT 'LTE物理站点数',
    nr_physical_site_num INT DEFAULT 0 COMMENT 'NR物理站点数',
    
    -- 总计
    total_site_num INT DEFAULT 0 COMMENT '总站点数',
    total_cell_num INT DEFAULT 0 COMMENT '总小区数',

    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_op_month_tech (operator_id, data_month, technology),
    INDEX idx_month (data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS=1;
