package com.operator.nl2sql.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SiteCellSummary {
    private Long id;
    private Long operatorId;
    private String dataMonth;

    // LTE 频段站点小区数
    private Integer lte700MSite;
    private Integer lte700MCell;
    private Integer lte800MSite;
    private Integer lte800MCell;
    private Integer lte900MSite;
    private Integer lte900MCell;
    private Integer lte1400MSite;
    private Integer lte1400MCell;
    private Integer lte1800MSite;
    private Integer lte1800MCell;
    private Integer lte2100MSite;
    private Integer lte2100MCell;
    private Integer lte2600MSite;
    private Integer lte2600MCell;

    // NR 频段站点小区数
    private Integer nr700MSite;
    private Integer nr700MCell;
    private Integer nr800MSite;
    private Integer nr800MCell;
    private Integer nr900MSite;
    private Integer nr900MCell;
    private Integer nr1400MSite;
    private Integer nr1400MCell;
    private Integer nr1800MSite;
    private Integer nr1800MCell;
    private Integer nr2100MSite;
    private Integer nr2100MCell;
    private Integer nr2600MSite;
    private Integer nr2600MCell;
    private Integer nr3500MSite;
    private Integer nr3500MCell;
    private Integer nr4900MSite;
    private Integer nr4900MCell;
    private Integer nr2300MSite;
    private Integer nr2300MCell;

    // 汇总字段
    private Integer lteTotalSite;
    private Integer lteTotalCell;
    private Integer nrTotalSite;
    private Integer nrTotalCell;

    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}