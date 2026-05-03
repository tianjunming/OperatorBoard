package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.OperatorSummary;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface OperatorSummaryMapper {

    List<OperatorSummary> findAllLatest();

    List<OperatorSummary> findAllLatestByTech();

    OperatorSummary findLatestByOperatorId(@Param("operatorId") Long operatorId);

    List<OperatorSummary> findHistoryByOperatorId(@Param("operatorId") Long operatorId);

    List<OperatorSummary> findAllLatestByTechnology(@Param("technology") String technology);
}