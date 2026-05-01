package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.IndicatorSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 指标汇总表 Mapper
 * 对应 indicator_summary 表，提供高效的汇总查询
 */
@Mapper
public interface IndicatorSummaryMapper {

    /**
     * 获取所有运营商最新指标汇总
     */
    List<IndicatorSummary> findAllLatest();

    /**
     * 获取指定运营商最新指标汇总
     */
    IndicatorSummary findLatestByOperatorId(@Param("operatorId") Long operatorId);

    /**
     * 获取指定运营商的历史指标汇总
     */
    List<IndicatorSummary> findHistoryByOperatorId(@Param("operatorId") Long operatorId);

    /**
     * 获取指定月份的所有运营商指标汇总
     */
    List<IndicatorSummary> findByDataMonth(@Param("dataMonth") String dataMonth);

    /**
     * 获取指定运营商和月份的指标汇总
     */
    IndicatorSummary findByOperatorIdAndMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    /**
     * 获取所有运营商最新汇总指标（分流比、驻留比等）
     */
    List<IndicatorSummary> findAllLatestMetrics();

    /**
     * 获取指定运营商最新汇总指标
     */
    IndicatorSummary findLatestMetricsByOperatorId(@Param("operatorId") Long operatorId);
}