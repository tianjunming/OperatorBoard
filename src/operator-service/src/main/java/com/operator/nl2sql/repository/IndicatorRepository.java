package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.IndicatorInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IndicatorRepository {

    List<IndicatorInfo> findAll();

    List<IndicatorInfo> findLatestIndicators(@Param("operatorId") Long operatorId);

    List<IndicatorInfo> findIndicatorsByOperatorId(@Param("operatorId") Long operatorId);

    IndicatorInfo findIndicatorsByOperatorIdAndMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<IndicatorInfo> findTrendData(@Param("operatorId") Long operatorId);
}