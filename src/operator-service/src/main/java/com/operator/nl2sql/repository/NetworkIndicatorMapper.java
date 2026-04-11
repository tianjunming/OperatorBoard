package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.NetworkIndicator;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NetworkIndicatorMapper {

    List<NetworkIndicator> findAll();

    NetworkIndicator findById(@Param("id") Long id);

    List<NetworkIndicator> findByOperatorId(@Param("operatorId") Long operatorId);

    List<NetworkIndicator> findByDataMonth(@Param("dataMonth") String dataMonth);

    List<NetworkIndicator> findByOperatorIdAndDataMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<NetworkIndicator> findByTechnology(@Param("technology") String technology);
}
