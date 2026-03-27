package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.SiteCellSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OperatorRepository {

    List<OperatorInfo> findAll();

    List<OperatorInfo> findByCountry(@Param("country") String country);

    List<OperatorInfo> findByOperatorName(@Param("operatorName") String operatorName);

    OperatorInfo findById(@Param("id") Long id);

    List<SiteCellSummary> findAllSiteCellSummary();

    List<SiteCellSummary> findSiteCellSummaryByOperatorId(@Param("operatorId") Long operatorId);

    SiteCellSummary findSiteCellSummaryByOperatorIdAndMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<String> findDistinctDataMonths();
}