package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.SiteSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 站点汇总表 Mapper
 * 对应 site_summary 表，提供高效的汇总查询
 */
@Mapper
public interface SiteSummaryMapper {

    /**
     * 获取所有运营商最新站点汇总
     */
    List<SiteSummary> findAllLatest();

    /**
     * 获取指定运营商最新站点汇总
     */
    SiteSummary findLatestByOperatorId(@Param("operatorId") Long operatorId);

    /**
     * 获取指定运营商的历史站点汇总
     */
    List<SiteSummary> findHistoryByOperatorId(@Param("operatorId") Long operatorId);

    /**
     * 获取指定月份的所有运营商站点汇总
     */
    List<SiteSummary> findByDataMonth(@Param("dataMonth") String dataMonth);

    /**
     * 获取指定运营商和月份的站点汇总
     */
    SiteSummary findByOperatorIdAndMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);
}