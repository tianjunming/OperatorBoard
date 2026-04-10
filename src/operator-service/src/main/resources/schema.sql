-- 权限管理表
SOURCE auth_schema.sql;

-- 聊天历史表
SOURCE chat_schema.sql;

-- 运营商信息表
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS operator_info;
CREATE TABLE operator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_name VARCHAR(100) NOT NULL COMMENT '运营商名称',
    country VARCHAR(50) COMMENT '国家名称',
    region VARCHAR(100) COMMENT '地区',
    network_type VARCHAR(50) COMMENT '网络类型 (4G/5G)',
    data_month VARCHAR(7) COMMENT '数据月份 (YYYY-MM)',
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营商信息表';

-- 站点信息表（宽表：每行一个运营商一个月）
DROP TABLE IF EXISTS site_info;
CREATE TABLE site_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '关联运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 (YYYY-MM)',
    -- LTE 700M 频段
    lte_700M_site INT DEFAULT 0 COMMENT 'LTE 700M 物理站点数',
    lte_700M_cell INT DEFAULT 0 COMMENT 'LTE 700M 物理小区数',
    -- LTE 800M 频段
    lte_800M_site INT DEFAULT 0 COMMENT 'LTE 800M 物理站点数',
    lte_800M_cell INT DEFAULT 0 COMMENT 'LTE 800M 物理小区数',
    -- LTE 900M 频段
    lte_900M_site INT DEFAULT 0 COMMENT 'LTE 900M 物理站点数',
    lte_900M_cell INT DEFAULT 0 COMMENT 'LTE 900M 物理小区数',
    -- LTE 1400M 频段
    lte_1400M_site INT DEFAULT 0 COMMENT 'LTE 1400M 物理站点数',
    lte_1400M_cell INT DEFAULT 0 COMMENT 'LTE 1400M 物理小区数',
    -- LTE 1800M 频段
    lte_1800M_site INT DEFAULT 0 COMMENT 'LTE 1800M 物理站点数',
    lte_1800M_cell INT DEFAULT 0 COMMENT 'LTE 1800M 物理小区数',
    -- LTE 2100M 频段
    lte_2100M_site INT DEFAULT 0 COMMENT 'LTE 2100M 物理站点数',
    lte_2100M_cell INT DEFAULT 0 COMMENT 'LTE 2100M 物理小区数',
    -- LTE 2600M 频段
    lte_2600M_site INT DEFAULT 0 COMMENT 'LTE 2600M 物理站点数',
    lte_2600M_cell INT DEFAULT 0 COMMENT 'LTE 2600M 物理小区数',
    -- NR 700M 频段
    nr_700M_site INT DEFAULT 0 COMMENT 'NR 700M 物理站点数',
    nr_700M_cell INT DEFAULT 0 COMMENT 'NR 700M 物理小区数',
    -- NR 800M 频段
    nr_800M_site INT DEFAULT 0 COMMENT 'NR 800M 物理站点数',
    nr_800M_cell INT DEFAULT 0 COMMENT 'NR 800M 物理小区数',
    -- NR 900M 频段
    nr_900M_site INT DEFAULT 0 COMMENT 'NR 900M 物理站点数',
    nr_900M_cell INT DEFAULT 0 COMMENT 'NR 900M 物理小区数',
    -- NR 1400M 频段
    nr_1400M_site INT DEFAULT 0 COMMENT 'NR 1400M 物理站点数',
    nr_1400M_cell INT DEFAULT 0 COMMENT 'NR 1400M 物理小区数',
    -- NR 1800M 频段
    nr_1800M_site INT DEFAULT 0 COMMENT 'NR 1800M 物理站点数',
    nr_1800M_cell INT DEFAULT 0 COMMENT 'NR 1800M 物理小区数',
    -- NR 2100M 频段
    nr_2100M_site INT DEFAULT 0 COMMENT 'NR 2100M 物理站点数',
    nr_2100M_cell INT DEFAULT 0 COMMENT 'NR 2100M 物理小区数',
    -- NR 2600M 频段
    nr_2600M_site INT DEFAULT 0 COMMENT 'NR 2600M 物理站点数',
    nr_2600M_cell INT DEFAULT 0 COMMENT 'NR 2600M 物理小区数',
    -- NR 3500M 频段
    nr_3500M_site INT DEFAULT 0 COMMENT 'NR 3500M 物理站点数',
    nr_3500M_cell INT DEFAULT 0 COMMENT 'NR 3500M 物理小区数',
    -- NR 4900M 频段
    nr_4900M_site INT DEFAULT 0 COMMENT 'NR 4900M 物理站点数',
    nr_4900M_cell INT DEFAULT 0 COMMENT 'NR 4900M 物理小区数',
    -- NR 2300M 频段
    nr_2300M_site INT DEFAULT 0 COMMENT 'NR 2300M 物理站点数',
    nr_2300M_cell INT DEFAULT 0 COMMENT 'NR 2300M 物理小区数',
    -- 汇总字段
    lte_total_site INT DEFAULT 0 COMMENT 'LTE物理站点总数',
    lte_total_cell INT GENERATED ALWAYS AS (lte_700M_cell + lte_800M_cell + lte_900M_cell + lte_1400M_cell + lte_1800M_cell + lte_2100M_cell + lte_2600M_cell) STORED COMMENT 'LTE物理小区总数',
    nr_total_site INT DEFAULT 0 COMMENT 'NR物理站点总数',
    nr_total_cell INT GENERATED ALWAYS AS (nr_700M_cell + nr_800M_cell + nr_900M_cell + nr_1400M_cell + nr_1800M_cell + nr_2100M_cell + nr_2600M_cell + nr_3500M_cell + nr_4900M_cell + nr_2300M_cell) STORED COMMENT 'NR物理小区总数',
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_operator_month (operator_id, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站点信息表';

-- 指标信息表（宽表：每行一个运营商一个月）
DROP TABLE IF EXISTS indicator_info;
CREATE TABLE indicator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '关联运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 (YYYY-MM)',
    -- LTE 700M 频段指标
    lte_700M_dl_rate DECIMAL(10,2) COMMENT 'LTE 700M 下行速率 (Mbps)',
    lte_700M_ul_rate DECIMAL(10,2) COMMENT 'LTE 700M 上行速率 (Mbps)',
    lte_700M_dl_prb DECIMAL(5,2) COMMENT 'LTE 700M 下行PRB利用率 (%)',
    lte_700M_ul_prb DECIMAL(5,2) COMMENT 'LTE 700M 上行PRB利用率 (%)',
    -- LTE 800M 频段指标
    lte_800M_dl_rate DECIMAL(10,2) COMMENT 'LTE 800M 下行速率 (Mbps)',
    lte_800M_ul_rate DECIMAL(10,2) COMMENT 'LTE 800M 上行速率 (Mbps)',
    lte_800M_dl_prb DECIMAL(5,2) COMMENT 'LTE 800M 下行PRB利用率 (%)',
    lte_800M_ul_prb DECIMAL(5,2) COMMENT 'LTE 800M 上行PRB利用率 (%)',
    -- LTE 900M 频段指标
    lte_900M_dl_rate DECIMAL(10,2) COMMENT 'LTE 900M 下行速率 (Mbps)',
    lte_900M_ul_rate DECIMAL(10,2) COMMENT 'LTE 900M 上行速率 (Mbps)',
    lte_900M_dl_prb DECIMAL(5,2) COMMENT 'LTE 900M 下行PRB利用率 (%)',
    lte_900M_ul_prb DECIMAL(5,2) COMMENT 'LTE 900M 上行PRB利用率 (%)',
    -- LTE 1400M 频段指标
    lte_1400M_dl_rate DECIMAL(10,2) COMMENT 'LTE 1400M 下行速率 (Mbps)',
    lte_1400M_ul_rate DECIMAL(10,2) COMMENT 'LTE 1400M 上行速率 (Mbps)',
    lte_1400M_dl_prb DECIMAL(5,2) COMMENT 'LTE 1400M 下行PRB利用率 (%)',
    lte_1400M_ul_prb DECIMAL(5,2) COMMENT 'LTE 1400M 上行PRB利用率 (%)',
    -- LTE 1800M 频段指标
    lte_1800M_dl_rate DECIMAL(10,2) COMMENT 'LTE 1800M 下行速率 (Mbps)',
    lte_1800M_ul_rate DECIMAL(10,2) COMMENT 'LTE 1800M 上行速率 (Mbps)',
    lte_1800M_dl_prb DECIMAL(5,2) COMMENT 'LTE 1800M 下行PRB利用率 (%)',
    lte_1800M_ul_prb DECIMAL(5,2) COMMENT 'LTE 1800M 上行PRB利用率 (%)',
    -- LTE 2100M 频段指标
    lte_2100M_dl_rate DECIMAL(10,2) COMMENT 'LTE 2100M 下行速率 (Mbps)',
    lte_2100M_ul_rate DECIMAL(10,2) COMMENT 'LTE 2100M 上行速率 (Mbps)',
    lte_2100M_dl_prb DECIMAL(5,2) COMMENT 'LTE 2100M 下行PRB利用率 (%)',
    lte_2100M_ul_prb DECIMAL(5,2) COMMENT 'LTE 2100M 上行PRB利用率 (%)',
    -- LTE 2600M 频段指标
    lte_2600M_dl_rate DECIMAL(10,2) COMMENT 'LTE 2600M 下行速率 (Mbps)',
    lte_2600M_ul_rate DECIMAL(10,2) COMMENT 'LTE 2600M 上行速率 (Mbps)',
    lte_2600M_dl_prb DECIMAL(5,2) COMMENT 'LTE 2600M 下行PRB利用率 (%)',
    lte_2600M_ul_prb DECIMAL(5,2) COMMENT 'LTE 2600M 上行PRB利用率 (%)',
    -- NR 700M 频段指标
    nr_700M_dl_rate DECIMAL(10,2) COMMENT 'NR 700M 下行速率 (Mbps)',
    nr_700M_ul_rate DECIMAL(10,2) COMMENT 'NR 700M 上行速率 (Mbps)',
    nr_700M_dl_prb DECIMAL(5,2) COMMENT 'NR 700M 下行PRB利用率 (%)',
    nr_700M_ul_prb DECIMAL(5,2) COMMENT 'NR 700M 上行PRB利用率 (%)',
    -- NR 800M 频段指标
    nr_800M_dl_rate DECIMAL(10,2) COMMENT 'NR 800M 下行速率 (Mbps)',
    nr_800M_ul_rate DECIMAL(10,2) COMMENT 'NR 800M 上行速率 (Mbps)',
    nr_800M_dl_prb DECIMAL(5,2) COMMENT 'NR 800M 下行PRB利用率 (%)',
    nr_800M_ul_prb DECIMAL(5,2) COMMENT 'NR 800M 上行PRB利用率 (%)',
    -- NR 900M 频段指标
    nr_900M_dl_rate DECIMAL(10,2) COMMENT 'NR 900M 下行速率 (Mbps)',
    nr_900M_ul_rate DECIMAL(10,2) COMMENT 'NR 900M 上行速率 (Mbps)',
    nr_900M_dl_prb DECIMAL(5,2) COMMENT 'NR 900M 下行PRB利用率 (%)',
    nr_900M_ul_prb DECIMAL(5,2) COMMENT 'NR 900M 上行PRB利用率 (%)',
    -- NR 1400M 频段指标
    nr_1400M_dl_rate DECIMAL(10,2) COMMENT 'NR 1400M 下行速率 (Mbps)',
    nr_1400M_ul_rate DECIMAL(10,2) COMMENT 'NR 1400M 上行速率 (Mbps)',
    nr_1400M_dl_prb DECIMAL(5,2) COMMENT 'NR 1400M 下行PRB利用率 (%)',
    nr_1400M_ul_prb DECIMAL(5,2) COMMENT 'NR 1400M 上行PRB利用率 (%)',
    -- NR 1800M 频段指标
    nr_1800M_dl_rate DECIMAL(10,2) COMMENT 'NR 1800M 下行速率 (Mbps)',
    nr_1800M_ul_rate DECIMAL(10,2) COMMENT 'NR 1800M 上行速率 (Mbps)',
    nr_1800M_dl_prb DECIMAL(5,2) COMMENT 'NR 1800M 下行PRB利用率 (%)',
    nr_1800M_ul_prb DECIMAL(5,2) COMMENT 'NR 1800M 上行PRB利用率 (%)',
    -- NR 2100M 频段指标
    nr_2100M_dl_rate DECIMAL(10,2) COMMENT 'NR 2100M 下行速率 (Mbps)',
    nr_2100M_ul_rate DECIMAL(10,2) COMMENT 'NR 2100M 上行速率 (Mbps)',
    nr_2100M_dl_prb DECIMAL(5,2) COMMENT 'NR 2100M 下行PRB利用率 (%)',
    nr_2100M_ul_prb DECIMAL(5,2) COMMENT 'NR 2100M 上行PRB利用率 (%)',
    -- NR 2600M 频段指标
    nr_2600M_dl_rate DECIMAL(10,2) COMMENT 'NR 2600M 下行速率 (Mbps)',
    nr_2600M_ul_rate DECIMAL(10,2) COMMENT 'NR 2600M 上行速率 (Mbps)',
    nr_2600M_dl_prb DECIMAL(5,2) COMMENT 'NR 2600M 下行PRB利用率 (%)',
    nr_2600M_ul_prb DECIMAL(5,2) COMMENT 'NR 2600M 上行PRB利用率 (%)',
    -- NR 3500M 频段指标
    nr_3500M_dl_rate DECIMAL(10,2) COMMENT 'NR 3500M 下行速率 (Mbps)',
    nr_3500M_ul_rate DECIMAL(10,2) COMMENT 'NR 3500M 上行速率 (Mbps)',
    nr_3500M_dl_prb DECIMAL(5,2) COMMENT 'NR 3500M 下行PRB利用率 (%)',
    nr_3500M_ul_prb DECIMAL(5,2) COMMENT 'NR 3500M 上行PRB利用率 (%)',
    -- NR 4900M 频段指标
    nr_4900M_dl_rate DECIMAL(10,2) COMMENT 'NR 4900M 下行速率 (Mbps)',
    nr_4900M_ul_rate DECIMAL(10,2) COMMENT 'NR 4900M 上行速率 (Mbps)',
    nr_4900M_dl_prb DECIMAL(5,2) COMMENT 'NR 4900M 下行PRB利用率 (%)',
    nr_4900M_ul_prb DECIMAL(5,2) COMMENT 'NR 4900M 上行PRB利用率 (%)',
    -- NR 2300M 频段指标
    nr_2300M_dl_rate DECIMAL(10,2) COMMENT 'NR 2300M 下行速率 (Mbps)',
    nr_2300M_ul_rate DECIMAL(10,2) COMMENT 'NR 2300M 上行速率 (Mbps)',
    nr_2300M_dl_prb DECIMAL(5,2) COMMENT 'NR 2300M 下行PRB利用率 (%)',
    nr_2300M_ul_prb DECIMAL(5,2) COMMENT 'NR 2300M 上行PRB利用率 (%)',

    lte_avg_dl_rate DECIMAL(10,2) COMMENT 'LTE 平均下行速率 (Mbps)',
    lte_avg_prb DECIMAL(5,2) COMMENT 'LTE 平均PRB利用率 (%)',
    nr_avg_dl_rate DECIMAL(10,2) COMMENT 'NR 平均下行速率 (Mbps)',
    nr_avg_prb DECIMAL(5,2) COMMENT 'NR 平均PRB利用率 (%)',
    
    traffic_ratio DECIMAL(5,2) COMMENT '分流比 (%)',
    traffic_campratio DECIMAL(5,2) COMMENT '流量驻留比 (%)',
    terminal_penetration DECIMAL(5,2) COMMENT '终端渗透率 (%)',
    duration_campratio DECIMAL(5,2) COMMENT '时长驻留比 (%)',
    fallback_ratio DECIMAL(5,2) COMMENT '回流比 (%)',
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_operator_month (operator_id, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标信息表';

-- ============================================================================
-- 全球运营商信息表数据 (按华为区域划分标准)
-- 区域划分: 亚太、欧洲、美洲、中东、非洲(北非、南非)
-- 总计: 180个运营商
-- ============================================================================

-- 亚太地区 (Asia Pacific) - 43个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 中国 (4个)
('中国移动', '中国', '亚太', '5G', '2026-03'),
('中国电信', '中国', '亚太', '5G', '2026-03'),
('中国联通', '中国', '亚太', '5G', '2026-03'),
('中国铁塔', '中国', '亚太', '5G', '2026-03'),
-- 日本 (3个)
('NTT DOCOMO', '日本', '亚太', '5G', '2026-03'),
('软银', '日本', '亚太', '5G', '2026-03'),
('KDDI', '日本', '亚太', '5G', '2026-03'),
-- 韩国 (3个)
('KT Corporation', '韩国', '亚太', '5G', '2026-03'),
('SK电讯', '韩国', '亚太', '5G', '2026-03'),
('LG Uplus', '韩国', '亚太', '5G', '2026-03'),
-- 新加坡 (3个)
('Singtel', '新加坡', '亚太', '5G', '2026-03'),
('StarHub', '新加坡', '亚太', '5G', '2026-03'),
('M1 Limited', '新加坡', '亚太', '5G', '2026-03'),
-- 泰国 (3个)
('AIS', '泰国', '亚太', '5G', '2026-03'),
('True Corporation', '泰国', '亚太', '5G', '2026-03'),
('DTAC', '泰国', '亚太', '5G', '2026-03'),
-- 菲律宾 (2个)
('Globe Telecom', '菲律宾', '亚太', '5G', '2026-03'),
('Smart Communications', '菲律宾', '亚太', '5G', '2026-03'),
-- 马来西亚 (2个)
('Celcom', '马来西亚', '亚太', '5G', '2026-03'),
('Digi.com', '马来西亚', '亚太', '5G', '2026-03'),
-- 印度尼西亚 (3个)
('Telkom Indonesia', '印度尼西亚', '亚太', '5G', '2026-03'),
('Indosat Ooredoo Hutchison', '印度尼西亚', '亚太', '5G', '2026-03'),
('XL Axiata', '印度尼西亚', '亚太', '5G', '2026-03'),
-- 越南 (3个)
('Viettel Group', '越南', '亚太', '5G', '2026-03'),
('VNPT', '越南', '亚太', '5G', '2026-03'),
('Mobifone', '越南', '亚太', '5G', '2026-03'),
-- 印度 (4个)
('Bharti Airtel', '印度', '亚太', '5G', '2026-03'),
('BSNL', '印度', '亚太', '4G', '2026-03'),
('Reliance Jio', '印度', '亚太', '5G', '2026-03'),
('Vodafone Idea', '印度', '亚太', '4G', '2026-03'),
-- 巴基斯坦 (2个)
('Telenor Pakistan', '巴基斯坦', '亚太', '4G', '2026-03'),
('Jazz', '巴基斯坦', '亚太', '4G', '2026-03'),
-- 孟加拉国 (2个)
('Grameenphone', '孟加拉国', '亚太', '4G', '2026-03'),
('Robi Axiata', '孟加拉国', '亚太', '4G', '2026-03'),
-- 澳大利亚 (3个)
('Telstra', '澳大利亚', '亚太', '5G', '2026-03'),
('Optus', '澳大利亚', '亚太', '5G', '2026-03'),
('TPG Telecom', '澳大利亚', '亚太', '5G', '2026-03'),
-- 新西兰 (2个)
('Spark New Zealand', '新西兰', '亚太', '5G', '2026-03'),
('Vodafone New Zealand', '新西兰', '亚太', '5G', '2026-03');

-- 欧洲地区 (Europe) - 40个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 德国 (3个)
('Deutsche Telekom', '德国', '欧洲', '5G', '2026-03'),
('Vodafone Germany', '德国', '欧洲', '5G', '2026-03'),
('O2 Germany', '德国', '欧洲', '5G', '2026-03'),
-- 西班牙 (3个)
('Telefonica', '西班牙', '欧洲', '5G', '2026-03'),
('Vodafone Spain', '西班牙', '欧洲', '5G', '2026-03'),
('Orange Spain', '西班牙', '欧洲', '5G', '2026-03'),
-- 法国 (3个)
('Orange France', '法国', '欧洲', '5G', '2026-03'),
('SFR', '法国', '欧洲', '5G', '2026-03'),
('Bouygues Telecom', '法国', '欧洲', '5G', '2026-03'),
-- 意大利 (3个)
('TIM', '意大利', '欧洲', '5G', '2026-03'),
('Vodafone Italy', '意大利', '欧洲', '5G', '2026-03'),
('Wind Tre', '意大利', '欧洲', '5G', '2026-03'),
-- 英国 (5个)
('BT Group', '英国', '欧洲', '5G', '2026-03'),
('Vodafone UK', '英国', '欧洲', '5G', '2026-03'),
('O2 UK', '英国', '欧洲', '5G', '2026-03'),
('EE', '英国', '欧洲', '5G', '2026-03'),
('Three UK', '英国', '欧洲', '5G', '2026-03'),
-- 荷兰 (2个)
('KPN', '荷兰', '欧洲', '5G', '2026-03'),
('Vodafone Netherlands', '荷兰', '欧洲', '5G', '2026-03'),
-- 比利时 (2个)
('Proximus', '比利时', '欧洲', '5G', '2026-03'),
('Orange Belgium', '比利时', '欧洲', '5G', '2026-03'),
-- 瑞士 (2个)
('Swisscom', '瑞士', '欧洲', '5G', '2026-03'),
('Sunrise Communications', '瑞士', '欧洲', '5G', '2026-03'),
-- 奥地利 (1个)
('A1 Telekom Austria', '奥地利', '欧洲', '5G', '2026-03'),
-- 俄罗斯 (4个)
('MTS', '俄罗斯', '欧洲', '5G', '2026-03'),
('Beeline', '俄罗斯', '欧洲', '5G', '2026-03'),
('MegaFon', '俄罗斯', '欧洲', '5G', '2026-03'),
('Tele2 Russia', '俄罗斯', '欧洲', '4G', '2026-03'),
-- 波兰 (3个)
('Play', '波兰', '欧洲', '5G', '2026-03'),
('Orange Polska', '波兰', '欧洲', '5G', '2026-03'),
('T-Mobile Polska', '波兰', '欧洲', '5G', '2026-03'),
-- 捷克 (2个)
('O2 Czech Republic', '捷克', '欧洲', '5G', '2026-03'),
('T-Mobile Czech Republic', '捷克', '欧洲', '5G', '2026-03'),
-- 匈牙利 (1个)
('Magyar Telekom', '匈牙利', '欧洲', '5G', '2026-03'),
-- 罗马尼亚 (2个)
('Orange Romania', '罗马尼亚', '欧洲', '5G', '2026-03'),
('Vodafone Romania', '罗马尼亚', '欧洲', '5G', '2026-03'),
-- 土耳其 (3个)
('Turkcell', '土耳其', '欧洲', '5G', '2026-03'),
('Turk Telekom', '土耳其', '欧洲', '5G', '2026-03'),
('Vodafone Turkey', '土耳其', '欧洲', '5G', '2026-03'),
-- 乌克兰 (2个)
('Kyivstar', '乌克兰', '欧洲', '5G', '2026-03'),
('Vodafone Ukraine', '乌克兰', '欧洲', '5G', '2026-03');

-- 美洲地区 (Americas) - 33个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 美国 (5个)
('AT&T', '美国', '美洲', '5G', '2026-03'),
('Verizon Communications', '美国', '美洲', '5G', '2026-03'),
('T-Mobile US', '美国', '美洲', '5G', '2026-03'),
('Sprint', '美国', '美洲', '5G', '2026-03'),
('US Cellular', '美国', '美洲', '5G', '2026-03'),
-- 加拿大 (4个)
('Bell Canada', '加拿大', '美洲', '5G', '2026-03'),
('Rogers Communications', '加拿大', '美洲', '5G', '2026-03'),
('Telus', '加拿大', '美洲', '5G', '2026-03'),
('Videotron', '加拿大', '美洲', '5G', '2026-03'),
-- 墨西哥 (3个)
('Telcel', '墨西哥', '美洲', '5G', '2026-03'),
('AT&T Mexico', '墨西哥', '美洲', '5G', '2026-03'),
('Movistar Mexico', '墨西哥', '美洲', '5G', '2026-03'),
-- 巴西 (4个)
('Vivo', '巴西', '美洲', '5G', '2026-03'),
('Claro Brazil', '巴西', '美洲', '5G', '2026-03'),
('TIM Brasil', '巴西', '美洲', '5G', '2026-03'),
('Oi', '巴西', '美洲', '4G', '2026-03'),
-- 阿根廷 (3个)
('Claro Argentina', '阿根廷', '美洲', '5G', '2026-03'),
('Movistar Argentina', '阿根廷', '美洲', '5G', '2026-03'),
('Personal', '阿根廷', '美洲', '5G', '2026-03'),
-- 智利 (3个)
('Entel Chile', '智利', '美洲', '5G', '2026-03'),
('Claro Chile', '智利', '美洲', '5G', '2026-03'),
('WOM Chile', '智利', '美洲', '5G', '2026-03'),
-- 哥伦比亚 (3个)
('Claro Colombia', '哥伦比亚', '美洲', '5G', '2026-03'),
('Movistar Colombia', '哥伦比亚', '美洲', '5G', '2026-03'),
('Tigo Colombia', '哥伦比亚', '美洲', '5G', '2026-03'),
-- 秘鲁 (3个)
('Claro Peru', '秘鲁', '美洲', '5G', '2026-03'),
('Entel Peru', '秘鲁', '美洲', '5G', '2026-03'),
('Movistar Peru', '秘鲁', '美洲', '5G', '2026-03'),
-- 其他拉美 (5个)
('Claro Ecuador', '厄瓜多尔', '美洲', '5G', '2026-03'),
('Movilnet', '委内瑞拉', '美洲', '4G', '2026-03'),
('CNT', '厄瓜多尔', '美洲', '5G', '2026-03'),
('Conecel', '厄瓜多尔', '美洲', '5G', '2026-03'),
('Bitel', '秘鲁', '美洲', '4G', '2026-03');

-- 中东地区 (Middle East) - 25个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 阿联酋 (2个)
('Etisalat UAE', '阿联酋', '中东', '5G', '2026-03'),
('du', '阿联酋', '中东', '5G', '2026-03'),
-- 沙特阿拉伯 (3个)
('STC', '沙特阿拉伯', '中东', '5G', '2026-03'),
('Mobily', '沙特阿拉伯', '中东', '5G', '2026-03'),
('Zain Saudi Arabia', '沙特阿拉伯', '中东', '5G', '2026-03'),
-- 卡塔尔 (2个)
('Ooredoo Qatar', '卡塔尔', '中东', '5G', '2026-03'),
('Vodafone Qatar', '卡塔尔', '中东', '5G', '2026-03'),
-- 科威特 (2个)
('Zain Kuwait', '科威特', '中东', '5G', '2026-03'),
('Ooredoo Kuwait', '科威特', '中东', '5G', '2026-03'),
-- 巴林 (1个)
('Batelco', '巴林', '中东', '5G', '2026-03'),
-- 阿曼 (2个)
('Omantel', '阿曼', '中东', '5G', '2026-03'),
('Ooredoo Oman', '阿曼', '中东', '5G', '2026-03'),
-- 以色列 (3个)
('Cellcom Israel', '以色列', '中东', '5G', '2026-03'),
('Partner Communications', '以色列', '中东', '5G', '2026-03'),
('Pelephone', '以色列', '中东', '5G', '2026-03'),
-- 伊朗 (2个)
('MCI', '伊朗', '中东', '5G', '2026-03'),
('Irancell', '伊朗', '中东', '5G', '2026-03'),
-- 伊拉克 (3个)
('Zain Iraq', '伊拉克', '中东', '5G', '2026-03'),
('Asiacell', '伊拉克', '中东', '5G', '2026-03'),
('Korek Telecom', '伊拉克', '中东', '4G', '2026-03'),
-- 约旦 (2个)
('Zain Jordan', '约旦', '中东', '5G', '2026-03'),
('Orange Jordan', '约旦', '中东', '5G', '2026-03'),
-- 黎巴嫩 (2个)
('Alfa', '黎巴嫩', '中东', '5G', '2026-03'),
('Touch', '黎巴嫩', '中东', '5G', '2026-03');

-- 非洲-北非地区 (North Africa) - 13个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 埃及 (4个)
('Orange Egypt', '埃及', '非洲-北非', '5G', '2026-03'),
('Vodafone Egypt', '埃及', '非洲-北非', '5G', '2026-03'),
('Etisalat Misr', '埃及', '非洲-北非', '5G', '2026-03'),
('WE', '埃及', '非洲-北非', '5G', '2026-03'),
-- 摩洛哥 (3个)
('Maroc Telecom', '摩洛哥', '非洲-北非', '5G', '2026-03'),
('Orange Morocco', '摩洛哥', '非洲-北非', '5G', '2026-03'),
('inwi', '摩洛哥', '非洲-北非', '5G', '2026-03'),
-- 阿尔及利亚 (3个)
('Djezzy', '阿尔及利亚', '非洲-北非', '5G', '2026-03'),
('Ooredoo Algeria', '阿尔及利亚', '非洲-北非', '5G', '2026-03'),
('Mobilis', '阿尔及利亚', '非洲-北非', '5G', '2026-03'),
-- 突尼斯 (2个)
('Orange Tunisia', '突尼斯', '非洲-北非', '5G', '2026-03'),
('Tunisiana', '突尼斯', '非洲-北非', '5G', '2026-03'),
-- 利比亚 (1个)
('Libya Tel', '利比亚', '非洲-北非', '4G', '2026-03');

-- 非洲-南非地区 (Sub-Saharan Africa) - 26个运营商
INSERT INTO operator_info (operator_name, country, region, network_type, data_month) VALUES
-- 南非 (3个)
('MTN South Africa', '南非', '非洲-南非', '5G', '2026-03'),
('Vodacom', '南非', '非洲-南非', '5G', '2026-03'),
('Cell C', '南非', '非洲-南非', '4G', '2026-03'),
-- 尼日利亚 (3个)
('MTN Nigeria', '尼日利亚', '非洲-南非', '5G', '2026-03'),
('Airtel Nigeria', '尼日利亚', '非洲-南非', '5G', '2026-03'),
('Globacom', '尼日利亚', '非洲-南非', '5G', '2026-03'),
-- 肯尼亚 (3个)
('Safaricom', '肯尼亚', '非洲-南非', '5G', '2026-03'),
('Airtel Kenya', '肯尼亚', '非洲-南非', '5G', '2026-03'),
('Telekom Kenya', '肯尼亚', '非洲-南非', '4G', '2026-03'),
-- 埃塞俄比亚 (1个)
('Ethio Telecom', '埃塞俄比亚', '非洲-南非', '4G', '2026-03'),
-- 坦桑尼亚 (3个)
('Vodacom Tanzania', '坦桑尼亚', '非洲-南非', '5G', '2026-03'),
('Airtel Tanzania', '坦桑尼亚', '非洲-南非', '5G', '2026-03'),
('Tigo Tanzania', '坦桑尼亚', '非洲-南非', '5G', '2026-03'),
-- 乌干达 (2个)
('MTN Uganda', '乌干达', '非洲-南非', '5G', '2026-03'),
('Airtel Uganda', '乌干达', '非洲-南非', '5G', '2026-03'),
-- 加纳 (3个)
('MTN Ghana', '加纳', '非洲-南非', '5G', '2026-03'),
('Vodafone Ghana', '加纳', '非洲-南非', '5G', '2026-03'),
('AirtelTigo', '加纳', '非洲-南非', '5G', '2026-03'),
-- 科特迪瓦 (2个)
('MTN Ivory Coast', '科特迪瓦', '非洲-南非', '5G', '2026-03'),
('Orange Ivory Coast', '科特迪瓦', '非洲-南非', '5G', '2026-03'),
-- 塞内加尔 (2个)
('Orange Senegal', '塞内加尔', '非洲-南非', '5G', '2026-03'),
('Tigo Senegal', '塞内加尔', '非洲-南非', '5G', '2026-03'),
-- 喀麦隆 (2个)
('MTN Cameroon', '喀麦隆', '非洲-南非', '5G', '2026-03'),
('Orange Cameroon', '喀麦隆', '非洲-南非', '5G', '2026-03'),
-- 刚果民主共和国 (2个)
('Airtel DRC', '刚果民主共和国', '非洲-南非', '5G', '2026-03'),
('Vodacom DRC', '刚果民主共和国', '非洲-南非', '5G', '2026-03');

-- 站点数据 (2026-03)
INSERT INTO site_info (operator_id, data_month, lte_700M_site, lte_700M_cell, lte_800M_site, lte_800M_cell, lte_900M_site, lte_900M_cell, lte_1400M_site, lte_1400M_cell, lte_1800M_site, lte_1800M_cell, lte_2100M_site, lte_2100M_cell, lte_2600M_site, lte_2600M_cell, nr_700M_site, nr_700M_cell, nr_800M_site, nr_800M_cell, nr_900M_site, nr_900M_cell, nr_1400M_site, nr_1400M_cell, nr_1800M_site, nr_1800M_cell, nr_2100M_site, nr_2100M_cell, nr_2600M_site, nr_2600M_cell, nr_3500M_site, nr_3500M_cell, nr_4900M_site, nr_4900M_cell, nr_2300M_site, nr_2300M_cell) VALUES
(1, '2026-03', 45, 120, 30, 80, 150, 450, 20, 60, 35, 80, 50, 150, 80, 200, 30, 80, 20, 50, 100, 300, 15, 40, 25, 55, 35, 100, 60, 150, 35, 85, 20, 40, 12, 30),
(2, '2026-03', 35, 90, 25, 60, 120, 320, 15, 45, 30, 150, 40, 100, 70, 180, 25, 65, 18, 45, 85, 220, 12, 35, 22, 100, 30, 75, 55, 140, 28, 65, 15, 25, 10, 25),
(3, '2026-03', 40, 100, 28, 70, 140, 380, 18, 55, 32, 120, 45, 80, 65, 150, 28, 72, 20, 52, 95, 260, 14, 42, 24, 85, 32, 65, 50, 120, 25, 55, 10, 18, 8, 20);

-- 站点数据 (2026-02)
INSERT INTO site_info (operator_id, data_month, lte_700M_site, lte_700M_cell, lte_800M_site, lte_800M_cell, lte_900M_site, lte_900M_cell, lte_1400M_site, lte_1400M_cell, lte_1800M_site, lte_1800M_cell, lte_2100M_site, lte_2100M_cell, lte_2600M_site, lte_2600M_cell, nr_700M_site, nr_700M_cell, nr_800M_site, nr_800M_cell, nr_900M_site, nr_900M_cell, nr_1400M_site, nr_1400M_cell, nr_1800M_site, nr_1800M_cell, nr_2100M_site, nr_2100M_cell, nr_2600M_site, nr_2600M_cell, nr_3500M_site, nr_3500M_cell, nr_4900M_site, nr_4900M_cell, nr_2300M_site, nr_2300M_cell) VALUES
(1, '2026-02', 42, 115, 28, 75, 145, 440, 18, 55, 32, 75, 48, 145, 75, 190, 28, 75, 18, 48, 95, 290, 12, 38, 22, 50, 32, 95, 55, 140, 30, 78, 18, 38, 10, 28),
(2, '2026-02', 32, 85, 22, 55, 115, 310, 12, 40, 28, 140, 38, 95, 65, 170, 22, 60, 15, 42, 80, 210, 10, 32, 20, 95, 28, 70, 50, 130, 25, 60, 12, 22, 8, 22),
(3, '2026-02', 38, 95, 25, 65, 135, 370, 15, 50, 30, 115, 42, 75, 60, 145, 25, 68, 18, 48, 90, 250, 12, 38, 22, 80, 30, 60, 45, 115, 22, 50, 8, 15, 6, 18);

-- 欧洲运营商站点数据 (2026-03)
INSERT INTO site_info (operator_id, data_month, lte_700M_site, lte_700M_cell, lte_800M_site, lte_800M_cell, lte_900M_site, lte_900M_cell, lte_1400M_site, lte_1400M_cell, lte_1800M_site, lte_1800M_cell, lte_2100M_site, lte_2100M_cell, lte_2600M_site, lte_2600M_cell, nr_700M_site, nr_700M_cell, nr_800M_site, nr_800M_cell, nr_900M_site, nr_900M_cell, nr_1400M_site, nr_1400M_cell, nr_1800M_site, nr_1800M_cell, nr_2100M_site, nr_2100M_cell, nr_2600M_site, nr_2600M_cell, nr_3500M_site, nr_3500M_cell, nr_4900M_site, nr_4900M_cell, nr_2300M_site, nr_2300M_cell) VALUES
-- Deutsche Telekom (Germany, 5G覆盖较广)
(4, '2026-03', 25, 65, 80, 220, 180, 520, 30, 85, 55, 150, 70, 200, 95, 280, 45, 120, 35, 95, 120, 350, 25, 70, 40, 110, 50, 140, 80, 220, 55, 150, 30, 85, 18, 48),
-- Vodafone (UK)
(5, '2026-03', 20, 50, 60, 170, 140, 400, 22, 65, 45, 120, 55, 160, 75, 210, 35, 95, 28, 75, 95, 280, 18, 50, 32, 90, 42, 115, 65, 180, 42, 115, 22, 60, 15, 40),
-- Orange (法国)
(6, '2026-03', 18, 45, 55, 150, 130, 370, 20, 58, 40, 110, 50, 145, 70, 195, 32, 88, 25, 68, 88, 255, 16, 45, 28, 80, 38, 105, 58, 160, 38, 105, 20, 55, 12, 32),
-- Telefonica (西班牙)
(7, '2026-03', 15, 40, 48, 135, 115, 330, 18, 52, 38, 100, 45, 130, 62, 175, 28, 78, 22, 60, 78, 225, 14, 40, 25, 70, 35, 95, 52, 145, 35, 95, 18, 48, 10, 28),
-- BT Group (英国)
(8, '2026-03', 12, 32, 40, 110, 95, 270, 15, 42, 30, 82, 38, 110, 52, 145, 24, 65, 18, 50, 65, 190, 12, 35, 20, 58, 28, 78, 45, 125, 30, 82, 15, 40, 8, 22);

-- 欧洲运营商站点数据 (2026-02)
INSERT INTO site_info (operator_id, data_month, lte_700M_site, lte_700M_cell, lte_800M_site, lte_800M_cell, lte_900M_site, lte_900M_cell, lte_1400M_site, lte_1400M_cell, lte_1800M_site, lte_1800M_cell, lte_2100M_site, lte_2100M_cell, lte_2600M_site, lte_2600M_cell, nr_700M_site, nr_700M_cell, nr_800M_site, nr_800M_cell, nr_900M_site, nr_900M_cell, nr_1400M_site, nr_1400M_cell, nr_1800M_site, nr_1800M_cell, nr_2100M_site, nr_2100M_cell, nr_2600M_site, nr_2600M_cell, nr_3500M_site, nr_3500M_cell, nr_4900M_site, nr_4900M_cell, nr_2300M_site, nr_2300M_cell) VALUES
(4, '2026-02', 22, 58, 75, 205, 170, 490, 28, 78, 50, 138, 65, 185, 88, 258, 40, 108, 30, 82, 110, 320, 22, 62, 35, 98, 45, 128, 72, 198, 48, 132, 25, 72, 15, 42),
(5, '2026-02', 18, 45, 55, 155, 130, 375, 20, 58, 42, 112, 50, 148, 68, 192, 30, 82, 24, 65, 85, 255, 15, 42, 28, 82, 38, 105, 58, 162, 38, 102, 18, 52, 12, 35),
(6, '2026-02', 15, 40, 50, 138, 120, 340, 18, 52, 36, 100, 45, 132, 65, 178, 28, 75, 22, 60, 80, 235, 14, 40, 25, 72, 35, 95, 52, 145, 32, 90, 16, 48, 10, 28),
(7, '2026-02', 12, 35, 42, 120, 105, 300, 15, 45, 34, 90, 40, 118, 55, 158, 24, 68, 18, 52, 70, 205, 12, 35, 22, 62, 32, 85, 48, 130, 30, 82, 15, 42, 8, 22),
(8, '2026-02', 10, 28, 35, 98, 85, 245, 12, 38, 28, 75, 35, 100, 48, 132, 20, 55, 15, 42, 58, 170, 10, 30, 18, 52, 25, 70, 40, 112, 26, 72, 12, 35, 6, 18);

-- 指标数据 (2026-03)
INSERT INTO indicator_info (operator_id, data_month, lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb, lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb, lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb, lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb, lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb, lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb, lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb, nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb, nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb, nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb, nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb, nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb, nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb, nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb, nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb, nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb, nr_2300M_dl_rate, nr_2300M_ul_rate, nr_2300M_dl_prb, nr_2300M_ul_prb, lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio) VALUES
(1, '2026-03', 45.50, 8.30, 22.50, 28.90, 55.20, 12.50, 28.80, 32.20, 120.60, 22.20, 38.30, 42.10, 90.30, 18.60, 32.50, 38.20, 180.40, 35.90, 42.20, 48.30, 150.30, 28.80, 38.40, 42.80, 280.80, 52.40, 52.30, 58.20, 85.50, 18.30, 32.50, 38.90, 95.20, 20.50, 35.80, 40.20, 180.60, 35.20, 48.30, 52.10, 150.30, 28.60, 42.50, 48.20, 320.40, 58.90, 55.20, 60.30, 280.30, 50.80, 52.40, 56.80, 450.80, 82.40, 62.30, 69.20, 680.90, 125.60, 75.80, 81.20, 520.30, 95.40, 65.80, 72.00, 285.60, 52.40, 55.80, 62.30, 131.87, 39.07, 318.52, 59.54, 65.20, 78.50, 45.80, 82.30, 12.50),
(2, '2026-03', 40.20, 7.80, 20.30, 25.70, 50.50, 11.80, 26.40, 30.50, 105.40, 20.60, 35.50, 40.20, 80.50, 16.20, 30.60, 35.80, 160.50, 32.30, 40.80, 45.40, 135.60, 26.20, 35.30, 40.60, 250.60, 48.90, 48.40, 52.10, 75.20, 15.80, 28.30, 32.70, 82.50, 17.80, 32.40, 36.50, 150.40, 28.60, 42.50, 46.20, 130.50, 25.20, 38.60, 44.80, 280.50, 52.30, 50.80, 55.40, 240.60, 45.20, 48.30, 52.60, 380.60, 68.90, 52.40, 58.10, 520.30, 95.40, 65.80, 72.00, 245.80, 45.60, 48.20, 55.80, 117.61, 35.66, 278.45, 52.88, 58.30, 72.80, 40.20, 75.60, 15.80),
(3, '2026-03', 48.10, 9.50, 25.20, 32.30, 58.30, 13.20, 30.50, 35.60, 115.80, 22.40, 38.60, 42.20, 95.80, 18.80, 35.50, 40.20, 175.50, 35.80, 45.40, 50.60, 148.30, 28.20, 38.20, 42.80, 265.50, 52.80, 50.10, 55.50, 90.10, 20.50, 35.20, 42.30, 98.30, 21.20, 38.50, 44.60, 170.80, 32.40, 45.60, 50.20, 145.80, 27.80, 40.50, 46.20, 300.50, 55.80, 53.40, 58.60, 260.30, 48.20, 50.20, 54.80, 420.50, 75.80, 58.10, 62.50, 650.20, 118.90, 70.50, 74.30, 268.50, 50.20, 52.80, 58.60, 129.76, 38.57, 311.28, 58.32, 62.50, 75.80, 43.50, 79.20, 14.20);

-- 指标数据 (2026-02)
INSERT INTO indicator_info (operator_id, data_month, lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb, lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb, lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb, lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb, lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb, lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb, lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb, nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb, nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb, nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb, nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb, nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb, nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb, nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb, nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb, nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb, nr_2300M_dl_rate, nr_2300M_ul_rate, nr_2300M_dl_prb, nr_2300M_ul_prb, lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio) VALUES
(1, '2026-02', 42.30, 7.50, 20.20, 25.00, 52.50, 11.80, 26.20, 30.50, 115.20, 21.80, 35.50, 40.60, 85.50, 17.20, 30.20, 35.80, 175.60, 34.40, 40.30, 45.80, 145.40, 27.50, 35.80, 40.30, 270.20, 52.60, 50.50, 55.50, 80.30, 16.50, 30.20, 34.00, 88.50, 18.80, 33.20, 37.50, 170.20, 32.80, 45.50, 48.60, 140.50, 26.20, 40.20, 45.80, 300.60, 55.40, 52.30, 56.80, 260.40, 48.50, 48.80, 52.30, 430.20, 78.60, 60.50, 64.50, 650.40, 118.20, 72.30, 78.30, 275.50, 50.80, 54.20, 60.80, 126.67, 37.36, 304.58, 57.42, 62.80, 75.20, 42.30, 78.50, 13.80),
(2, '2026-02', 38.80, 7.20, 18.80, 22.00, 48.80, 10.20, 24.50, 28.20, 100.30, 19.50, 32.20, 38.80, 75.30, 15.80, 28.20, 32.50, 150.50, 30.60, 38.50, 42.30, 125.40, 25.30, 32.60, 38.80, 235.50, 48.30, 45.20, 50.40, 70.80, 14.20, 26.80, 30.00, 76.80, 16.20, 30.50, 34.20, 140.30, 26.50, 40.20, 44.80, 120.30, 22.80, 36.20, 42.50, 260.50, 48.60, 48.50, 52.30, 220.40, 42.30, 45.60, 49.80, 360.50, 65.30, 50.20, 55.40, 500.80, 88.50, 62.30, 68.10, 235.50, 44.20, 46.50, 53.80, 110.66, 33.67, 265.52, 50.22, 55.80, 68.50, 38.20, 71.80, 17.20),
(3, '2026-02', 45.40, 8.90, 23.40, 28.80, 55.60, 12.80, 28.20, 32.30, 110.50, 21.20, 35.20, 40.60, 90.50, 17.60, 32.80, 38.20, 165.60, 34.40, 42.80, 48.30, 140.80, 27.60, 35.30, 40.20, 255.30, 52.10, 48.20, 52.80, 85.40, 18.90, 33.40, 37.80, 90.60, 19.80, 35.20, 40.30, 160.50, 30.20, 43.20, 48.60, 135.50, 25.60, 38.80, 44.20, 280.60, 52.40, 50.80, 55.30, 240.80, 45.60, 48.30, 52.20, 400.30, 72.10, 56.20, 60.80, 620.70, 112.30, 68.40, 71.80, 258.80, 48.60, 50.50, 56.80, 123.36, 36.59, 298.47, 56.78, 60.20, 72.80, 41.50, 76.30, 15.50);

-- 欧洲运营商指标数据 (2026-03)
INSERT INTO indicator_info (operator_id, data_month, lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb, lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb, lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb, lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb, lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb, lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb, lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb, nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb, nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb, nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb, nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb, nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb, nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb, nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb, nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb, nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb, nr_2300M_dl_rate, nr_2300M_ul_rate, nr_2300M_dl_prb, nr_2300M_ul_prb, lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio) VALUES
-- Deutsche Telekom (德国, 5G领先)
(4, '2026-03', 52.30, 10.20, 28.50, 35.80, 68.40, 15.80, 35.20, 40.50, 145.80, 28.60, 45.60, 50.20, 112.50, 24.20, 40.80, 46.50, 215.60, 45.80, 52.30, 58.40, 185.40, 38.50, 48.20, 54.60, 320.50, 65.80, 58.40, 65.30, 125.60, 28.40, 42.50, 48.20, 145.80, 32.60, 48.20, 54.80, 245.60, 52.80, 58.40, 64.20, 215.60, 45.80, 52.30, 58.50, 385.60, 78.50, 65.80, 72.40, 320.50, 62.40, 58.60, 65.20, 580.90, 115.60, 72.50, 78.80, 680.50, 128.40, 78.20, 84.50, 310.50, 58.60, 58.80, 65.50, 148.65, 44.28, 385.42, 66.85, 68.50, 82.30, 52.40, 88.50, 8.20),
(5, '2026-03', 48.20, 9.50, 25.80, 32.50, 62.50, 14.20, 32.40, 38.60, 135.40, 26.20, 42.30, 48.50, 105.60, 22.50, 38.50, 44.20, 198.40, 42.60, 48.80, 55.20, 172.50, 35.80, 45.60, 52.80, 295.80, 58.60, 55.20, 62.40, 115.40, 25.80, 38.80, 45.20, 135.60, 28.60, 45.20, 52.40, 225.40, 48.60, 54.80, 62.50, 195.40, 42.80, 48.50, 55.60, 355.40, 72.50, 62.40, 68.80, 520.80, 98.50, 68.80, 75.20, 0, 0, 0, 0, 455.60, 86.50, 65.20, 72.40, 280.50, 52.80, 54.50, 62.30, 138.42, 41.56, 342.58, 62.48, 62.80, 78.50, 48.20, 84.60, 10.50),
(6, '2026-03', 45.60, 8.90, 24.50, 30.80, 58.50, 13.50, 30.80, 36.50, 128.40, 24.80, 40.20, 46.50, 98.50, 21.20, 36.50, 42.80, 185.60, 39.50, 46.20, 52.80, 162.50, 33.50, 43.50, 50.20, 275.50, 55.20, 52.40, 59.80, 105.50, 23.80, 36.50, 42.80, 125.60, 26.50, 42.50, 49.20, 208.50, 45.20, 52.60, 60.50, 182.50, 40.20, 46.80, 54.20, 335.50, 68.50, 60.20, 66.80, 485.50, 92.50, 65.50, 72.50, 0, 0, 0, 0, 425.60, 80.50, 62.40, 68.80, 265.80, 50.20, 52.60, 59.80, 132.58, 39.82, 325.45, 60.28, 60.50, 75.20, 45.80, 82.30, 11.20),
(7, '2026-03', 42.80, 8.50, 23.50, 29.80, 55.50, 12.80, 29.50, 35.60, 120.50, 23.50, 38.50, 44.20, 92.50, 20.20, 35.20, 41.50, 175.50, 37.50, 44.50, 50.80, 155.40, 32.20, 42.20, 48.60, 265.50, 52.80, 50.50, 58.20, 98.50, 22.50, 35.20, 41.50, 118.50, 25.20, 40.50, 47.20, 195.50, 42.80, 50.20, 58.50, 175.50, 38.50, 45.20, 52.80, 315.50, 65.20, 58.50, 65.50, 465.50, 88.50, 62.80, 69.50, 0, 0, 0, 0, 395.50, 75.50, 60.20, 66.80, 245.60, 46.80, 50.20, 58.50, 128.36, 38.42, 308.58, 58.56, 58.20, 72.80, 43.50, 80.20, 12.80),
(8, '2026-03', 40.20, 8.20, 22.50, 28.50, 52.50, 12.20, 28.50, 34.50, 115.50, 22.50, 37.20, 42.80, 88.50, 19.20, 34.20, 40.50, 165.50, 35.80, 42.80, 48.50, 148.50, 30.80, 40.80, 47.20, 250.50, 50.20, 48.50, 56.20, 92.50, 21.50, 34.20, 40.20, 112.50, 24.20, 38.50, 45.20, 185.50, 40.50, 48.50, 56.20, 165.50, 36.50, 43.80, 50.80, 298.50, 62.50, 56.50, 63.50, 280.50, 52.60, 50.50, 55.50, 0, 0, 0, 0, 445.50, 85.50, 62.20, 68.50, 225.80, 42.50, 48.50, 55.80, 125.42, 37.28, 295.45, 56.48, 56.20, 70.50, 42.20, 78.50, 14.20);

-- 欧洲运营商指标数据 (2026-02)
INSERT INTO indicator_info (operator_id, data_month, lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb, lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb, lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb, lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb, lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb, lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb, lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb, nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb, nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb, nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb, nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb, nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb, nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb, nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb, nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb, nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb, nr_2300M_dl_rate, nr_2300M_ul_rate, nr_2300M_dl_prb, nr_2300M_ul_prb, lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio) VALUES
(4, '2026-02', 48.50, 9.50, 26.50, 33.50, 65.20, 14.80, 33.50, 38.50, 138.50, 27.20, 43.50, 48.50, 108.50, 23.20, 39.20, 45.20, 208.50, 44.20, 50.50, 56.50, 178.50, 37.20, 46.50, 52.80, 305.50, 62.80, 56.50, 63.50, 118.50, 26.80, 40.50, 46.50, 138.50, 30.80, 46.50, 52.80, 235.50, 50.50, 56.50, 62.50, 205.50, 43.80, 50.50, 56.50, 365.50, 75.50, 63.50, 70.20, 520.50, 98.50, 68.80, 75.20, 550.50, 108.50, 70.20, 76.50, 680.50, 128.40, 78.20, 84.50, 295.50, 56.20, 56.50, 63.20, 142.58, 42.85, 368.45, 64.28, 65.50, 80.20, 50.20, 86.50, 9.50),
(5, '2026-02', 45.50, 8.90, 24.50, 30.50, 58.50, 13.50, 30.50, 36.50, 128.50, 25.20, 40.50, 46.50, 98.50, 21.50, 36.50, 42.50, 188.50, 40.50, 46.50, 52.80, 165.50, 34.50, 44.20, 50.80, 280.50, 56.20, 53.50, 60.50, 108.50, 24.50, 37.20, 43.50, 128.50, 27.20, 43.50, 50.20, 215.50, 46.50, 52.80, 60.50, 185.50, 41.50, 46.80, 54.20, 335.50, 70.50, 60.50, 66.80, 455.50, 86.50, 65.20, 72.40, 520.80, 98.50, 68.80, 75.20, 680.50, 128.40, 78.20, 84.50, 268.50, 50.50, 52.30, 60.20, 132.45, 40.28, 328.45, 60.52, 60.50, 75.50, 46.20, 82.50, 11.80),
(6, '2026-02', 42.50, 8.50, 23.50, 29.50, 55.50, 12.80, 29.50, 35.50, 122.50, 23.80, 38.80, 44.50, 92.50, 20.50, 35.50, 41.50, 175.50, 38.20, 44.50, 50.50, 155.50, 32.50, 42.50, 48.80, 265.50, 53.50, 50.80, 58.20, 98.50, 22.80, 35.20, 41.50, 118.50, 25.50, 41.50, 48.20, 198.50, 43.80, 50.80, 58.50, 175.50, 39.50, 45.50, 52.80, 318.50, 66.50, 58.80, 65.50, 425.60, 80.50, 62.40, 68.80, 485.50, 92.50, 65.50, 72.50, 525.50, 102.50, 68.80, 75.20, 255.50, 48.20, 50.80, 58.20, 128.52, 38.58, 312.45, 58.85, 58.50, 72.50, 44.50, 80.50, 12.50),
(7, '2026-02', 40.50, 8.20, 22.50, 28.50, 52.50, 12.20, 28.50, 34.50, 115.50, 22.50, 37.20, 42.80, 88.50, 19.50, 34.20, 40.50, 165.50, 35.80, 42.80, 48.50, 148.50, 30.80, 40.80, 47.20, 250.50, 50.20, 48.50, 56.20, 92.50, 21.50, 34.20, 40.20, 112.50, 24.20, 38.50, 45.20, 185.50, 40.50, 48.50, 56.20, 165.50, 36.50, 43.80, 50.80, 298.50, 62.50, 56.50, 63.50, 395.50, 75.50, 60.20, 66.80, 465.50, 88.50, 62.80, 69.50, 505.50, 98.50, 68.80, 75.20, 235.50, 44.50, 48.50, 56.20, 122.35, 37.58, 295.58, 56.28, 56.20, 70.50, 42.20, 78.50, 14.20),
(8, '2026-02', 38.50, 7.80, 21.50, 27.50, 50.50, 11.80, 27.50, 33.50, 108.50, 21.50, 35.80, 41.50, 82.50, 18.50, 33.20, 39.50, 155.50, 34.50, 41.50, 47.20, 140.50, 29.50, 39.50, 45.80, 238.50, 48.50, 46.80, 54.20, 85.50, 20.50, 33.20, 39.50, 105.50, 23.20, 37.20, 43.80, 175.50, 38.50, 46.80, 54.20, 155.50, 35.50, 42.50, 49.50, 280.50, 52.60, 50.50, 55.50, 280.50, 52.60, 50.50, 55.50, 445.50, 85.50, 62.20, 68.50, 485.50, 92.50, 65.50, 72.50, 218.50, 40.50, 46.20, 53.80, 118.42, 36.28, 282.58, 54.48, 54.20, 68.50, 40.50, 76.50, 15.20);
