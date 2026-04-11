package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.IndicatorInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IndicatorInfoMapper {

    List<IndicatorInfo> findAll();

    IndicatorInfo findById(@Param("id") Long id);

    List<IndicatorInfo> findByOperatorId(@Param("operatorId") Long operatorId);

    List<IndicatorInfo> findByDataMonth(@Param("dataMonth") String dataMonth);

    List<IndicatorInfo> findByOperatorIdAndDataMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<IndicatorInfo> findByTechnology(@Param("technology") String technology);
}
