package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.OperatorTotalSite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OperatorTotalSiteMapper {

    List<OperatorTotalSite> findAll();

    OperatorTotalSite findById(@Param("id") Long id);

    List<OperatorTotalSite> findByOperatorId(@Param("operatorId") Long operatorId);

    List<OperatorTotalSite> findByDataMonth(@Param("dataMonth") String dataMonth);

    List<OperatorTotalSite> findByOperatorIdAndDataMonth(
            @Param("operatorId") Long operatorId,
            @Param("dataMonth") String dataMonth);

    List<OperatorTotalSite> findByTechnology(@Param("technology") String technology);
}
