-- Database and Tables for Agent Data Service

CREATE DATABASE IF NOT EXISTS agent_data DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE agent_data;

-- 运营商信息表
CREATE TABLE IF NOT EXISTS carrier (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '运营商名称',
    code VARCHAR(50) NOT NULL UNIQUE COMMENT '运营商代码',
    type VARCHAR(20) COMMENT '运营商类型',
    contact VARCHAR(100) COMMENT '联系方式',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营商信息表';

-- 运营商数据表
CREATE TABLE IF NOT EXISTS carrier_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    carrier_id BIGINT NOT NULL,
    frequency_band VARCHAR(50) COMMENT '频段',
    site_name VARCHAR(100) COMMENT '站点名称',
    cell_id VARCHAR(100) COMMENT '小区ID',
    uplink_rate DECIMAL(10,2) COMMENT '上行速率(Mbps)',
    downlink_rate DECIMAL(10,2) COMMENT '下行速率(Mbps)',
    prb_utilization DECIMAL(5,2) COMMENT 'PRB利用率(%)',
    longitude DECIMAL(10,6) COMMENT '经度',
    latitude DECIMAL(10,6) COMMENT '纬度',
    location VARCHAR(200) COMMENT '位置',
    status TINYINT DEFAULT 1 COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carrier(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营商数据表';

-- 运营商数据历史记录表
CREATE TABLE IF NOT EXISTS carrier_data_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    carrier_id BIGINT NOT NULL,
    carrier_data_id BIGINT,
    data_description VARCHAR(500) COMMENT '数据描述',
    data_time TIMESTAMP NOT NULL COMMENT '数据时间',
    uplink_rate DECIMAL(10,2) COMMENT '上行速率(Mbps)',
    downlink_rate DECIMAL(10,2) COMMENT '下行速率(Mbps)',
    prb_utilization DECIMAL(5,2) COMMENT 'PRB利用率(%)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carrier(id) ON DELETE CASCADE,
    FOREIGN KEY (carrier_data_id) REFERENCES carrier_data(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营商数据历史记录表';

-- Sample Data
INSERT INTO carrier (name, code, type, contact) VALUES
('中国移动', 'CMCC', 'Mobile', '10086'),
('中国联通', 'CUCC', 'Mobile', '10010'),
('中国电信', 'CTCC', 'Mobile', '10000');

INSERT INTO carrier_data (carrier_id, frequency_band, site_name, cell_id, uplink_rate, downlink_rate, prb_utilization, longitude, latitude, location) VALUES
(1, 'D频段', '基站-A1', 'CELL_001', 50.5, 150.8, 65.5, 116.4074, 39.9042, '北京市朝阳区'),
(1, 'F频段', '基站-A2', 'CELL_002', 45.2, 140.3, 58.3, 116.4274, 39.9142, '北京市海淀区'),
(2, '1800MHz', '基站-B1', 'CELL_003', 35.8, 120.5, 45.2, 116.4174, 39.8942, '北京市东城区'),
(3, '2100MHz', '基站-C1', 'CELL_004', 40.3, 130.7, 52.8, 116.4374, 39.9242, '北京市西城区');

INSERT INTO carrier_data_history (carrier_id, carrier_data_id, data_description, data_time, uplink_rate, downlink_rate, prb_utilization) VALUES
(1, 1, '早高峰时段数据', '2024-01-15 08:00:00', 55.2, 145.6, 75.3),
(1, 1, '晚高峰时段数据', '2024-01-15 18:00:00', 58.8, 155.2, 85.6),
(1, 2, '正常工作日数据', '2024-01-15 14:00:00', 42.1, 138.5, 55.2),
(2, 3, '周末数据', '2024-01-13 14:00:00', 32.5, 115.3, 40.8),
(3, 4, '正常工作日数据', '2024-01-15 10:00:00', 38.6, 128.9, 48.5);
