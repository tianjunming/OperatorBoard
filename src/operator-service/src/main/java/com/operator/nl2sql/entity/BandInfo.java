package com.operator.nl2sql.entity;

import lombok.Data;

/**
 * 频段维度表
 * Star Schema: Dimension Table for Frequency Bands
 */
@Data
public class BandInfo {
    private Long id;
    private String bandCode;        // 如 LTE700M_FDD
    private String bandName;        // 如 LTE 700M FDD
    private String technology;      // LTE/NR
    private Integer frequencyMhz;   // 中心频率
    private String duplexMode;      // FDD/TDD
    private String bandGroup;       // 700M/800M等
}
