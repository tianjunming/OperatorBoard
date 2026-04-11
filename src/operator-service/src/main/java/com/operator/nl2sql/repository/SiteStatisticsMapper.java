package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.SiteStatistics;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SiteStatisticsMapper {

    List<SiteStatistics> findAll();

    SiteStatistics findById(@Param("id") Long id);

    List<SiteStatistics> findByOperatorId(@Param("operatorId") Long operatorId);

    List<SiteStatistics> findByDataMonth(@Param("dataMonth") String dataMonth);

    List<SiteStatistics> findByOperatorIdAndDataMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<SiteStatistics> findByTechnology(@Param("technology") String technology);
}
