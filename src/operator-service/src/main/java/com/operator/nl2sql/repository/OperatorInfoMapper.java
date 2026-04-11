package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.OperatorInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OperatorInfoMapper {

    List<OperatorInfo> findAll();

    List<OperatorInfo> findByCountry(@Param("country") String country);

    List<OperatorInfo> findByRegion(@Param("region") String region);

    OperatorInfo findById(@Param("id") Long id);

    OperatorInfo findByOperatorCode(@Param("operatorCode") String operatorCode);

    List<OperatorInfo> findByOperatorName(@Param("operatorName") String operatorName);
}
