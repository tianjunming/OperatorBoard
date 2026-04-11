package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.SiteCellSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface SiteStatisticsMapper {

    // All operators, latest month only
    List<SiteCellSummary> findAllSiteCellSummaryLatest();

    // Single operator, latest month only
    SiteCellSummary findSiteCellSummaryLatestByOperatorId(@Param("operatorId") Long operatorId);

    // All operators, all months
    List<SiteCellSummary> findAllSiteCellSummary();

    // Single operator, all months (for trend/historical)
    List<SiteCellSummary> findSiteCellSummaryByOperatorId(@Param("operatorId") Long operatorId);
}
