package com.operator.nl2sql.entity;

import lombok.Data;
import java.math.BigDecimal;

/**
 * 网络指标表
 * Star Schema: Network Indicator Table
 */
@Data
public class IndicatorInfo {
    private Long id;
    private Long operatorId;
    private Long bandId;
    private String bandName;   // 频段名称 如 LTE 700M FDD
    private String dataMonth;  // YYYY-MM
    private String technology;  // LTE/NR

    // PRB指标
    private BigDecimal dlPrb;  // 下行PRB利用率
    private BigDecimal ulPrb;  // 上行PRB利用率

    // 吞吐量指标
    private BigDecimal dlRate; // 下行速率 Mbps
    private BigDecimal ulRate; // 上行速率 Mbps

    // 流量指标
    private BigDecimal totalTraffic; // 总流量 MB
    private BigDecimal dlTraffic;    // 下行流量 MB
    private BigDecimal ulTraffic;    // 上行流量 MB

    // 用户指标
    private BigDecimal onlineUsers;   // 在线用户数
    private BigDecimal nrUsers;      // NR用户数

    // 终端指标
    private BigDecimal terminalPenetrationRatio; // 终端渗透率

    // 导航属性 (非数据库字段)
    private OperatorInfo operator;
    private BandInfo band;
}
