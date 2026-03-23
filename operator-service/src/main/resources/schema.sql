-- 运营商信息表
CREATE TABLE IF NOT EXISTS operator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_name VARCHAR(100) NOT NULL COMMENT '运营商名称',
    region VARCHAR(100) COMMENT '地区',
    network_type VARCHAR(50) COMMENT '网络类型 (4G/5G)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营商信息表';

-- 基站信息表
CREATE TABLE IF NOT EXISTS site_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '关联运营商ID',
    site_name VARCHAR(200) NOT NULL COMMENT '基站名称',
    site_code VARCHAR(100) NOT NULL UNIQUE COMMENT '基站编码',
    longitude DECIMAL(10,6) COMMENT '经度',
    latitude DECIMAL(10,6) COMMENT '纬度',
    band VARCHAR(50) COMMENT '频段 (700MHz/2.6GHz/3.5GHz)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (operator_id) REFERENCES operator_info(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='基站信息表';

-- 指标信息表
CREATE TABLE IF NOT EXISTS indicator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    site_id BIGINT NOT NULL COMMENT '关联基站ID',
    cell_id VARCHAR(100) NOT NULL COMMENT '小区ID',
    cell_name VARCHAR(200) COMMENT '小区名称',
    frequency_band VARCHAR(50) COMMENT '频段',
    dl_rate DECIMAL(10,2) COMMENT '下行速率 (Mbps)',
    ul_rate DECIMAL(10,2) COMMENT '上行速率 (Mbps)',
    prb_usage DECIMAL(5,2) COMMENT 'PRB利用率 (%)',
    split_ratio DECIMAL(5,2) COMMENT '分流比 (%)',
    main_ratio DECIMAL(5,2) COMMENT '主流比 (%)',
    data_time DATETIME COMMENT '数据时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (site_id) REFERENCES site_info(id),
    INDEX idx_cell_id (cell_id),
    INDEX idx_frequency_band (frequency_band),
    INDEX idx_data_time (data_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标信息表';

-- 样例数据
INSERT INTO operator_info (operator_name, region, network_type) VALUES
('中国移动', '北京', '5G'),
('中国联通', '上海', '5G'),
('中国电信', '广州', '5G');

INSERT INTO site_info (operator_id, site_name, site_code, longitude, latitude, band) VALUES
(1, '北京朝阳基站A', 'BJ-CY-001', 116.407526, 39.904555, '2.6GHz'),
(1, '北京海淀基站B', 'BJ-HD-002', 116.312534, 39.963142, '700MHz'),
(2, '上海浦东基站A', 'SH-PD-001', 121.544112, 31.221452, '3.5GHz'),
(3, '广州天河基站A', 'GZ-TH-001', 113.361594, 23.126709, '2.6GHz');

INSERT INTO indicator_info (site_id, cell_id, cell_name, frequency_band, dl_rate, ul_rate, prb_usage, split_ratio, main_ratio, data_time) VALUES
(1, 'CELL-001', '北京朝阳小区1', '2.6GHz', 450.50, 80.25, 65.30, 45.20, 54.80, '2026-03-22 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 180.30, 35.60, 35.50, 30.10, 69.90, '2026-03-22 10:00:00'),
(3, 'CELL-003', '上海浦东小区1', '3.5GHz', 680.75, 120.45, 78.90, 55.30, 44.70, '2026-03-22 10:00:00'),
(4, 'CELL-004', '广州天河小区1', '2.6GHz', 520.60, 95.80, 58.40, 48.90, 51.10, '2026-03-22 10:00:00');

-- 历史数据 - 2026-03-21
INSERT INTO indicator_info (site_id, cell_id, cell_name, frequency_band, dl_rate, ul_rate, prb_usage, split_ratio, main_ratio, data_time) VALUES
(1, 'CELL-001', '北京朝阳小区1', '2.6GHz', 420.30, 75.10, 60.20, 42.50, 57.50, '2026-03-21 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 165.80, 32.40, 30.10, 28.30, 71.70, '2026-03-21 10:00:00'),
(3, 'CELL-003', '上海浦东小区1', '3.5GHz', 650.20, 115.30, 72.50, 52.80, 47.20, '2026-03-21 10:00:00'),
(4, 'CELL-004', '广州天河小区1', '2.6GHz', 480.90, 88.20, 52.30, 45.60, 54.40, '2026-03-21 10:00:00');

-- 历史数据 - 2026-03-20
INSERT INTO indicator_info (site_id, cell_id, cell_name, frequency_band, dl_rate, ul_rate, prb_usage, split_ratio, main_ratio, data_time) VALUES
(1, 'CELL-001', '北京朝阳小区1', '2.6GHz', 380.50, 70.20, 55.80, 40.30, 59.70, '2026-03-20 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 150.20, 30.50, 28.40, 25.80, 74.20, '2026-03-20 10:00:00'),
(3, 'CELL-003', '上海浦东小区1', '3.5GHz', 620.80, 108.90, 68.20, 50.50, 49.50, '2026-03-20 10:00:00'),
(4, 'CELL-004', '广州天河小区1', '2.6GHz', 450.30, 82.10, 48.90, 43.20, 56.80, '2026-03-20 10:00:00');

-- 历史数据 - 2026-03-19
INSERT INTO indicator_info (site_id, cell_id, cell_name, frequency_band, dl_rate, ul_rate, prb_usage, split_ratio, main_ratio, data_time) VALUES
(1, 'CELL-001', '北京朝阳小区1', '2.6GHz', 350.20, 65.80, 50.30, 38.90, 61.10, '2026-03-19 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 140.50, 28.60, 25.20, 24.10, 75.90, '2026-03-19 10:00:00'),
(3, 'CELL-003', '上海浦东小区1', '3.5GHz', 590.30, 102.40, 62.80, 48.30, 51.70, '2026-03-19 10:00:00'),
(4, 'CELL-004', '广州天河小区1', '2.6GHz', 420.80, 76.50, 45.60, 41.80, 58.20, '2026-03-19 10:00:00');

-- 同一基站不同时期的数据（站点2 - 700MHz频段变化趋势）
INSERT INTO indicator_info (site_id, cell_id, cell_name, frequency_band, dl_rate, ul_rate, prb_usage, split_ratio, main_ratio, data_time) VALUES
(2, 'CELL-002', '北京海淀小区1', '700MHz', 155.30, 31.20, 26.80, 26.50, 73.50, '2026-03-18 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 148.90, 29.80, 24.50, 25.20, 74.80, '2026-03-17 10:00:00'),
(2, 'CELL-002', '北京海淀小区1', '700MHz', 142.30, 28.10, 22.30, 24.00, 76.00, '2026-03-16 10:00:00');
