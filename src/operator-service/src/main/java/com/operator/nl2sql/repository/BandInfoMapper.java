package com.operator.nl2sql.repository;

import com.operator.nl2sql.entity.BandInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BandInfoMapper {

    List<BandInfo> findAll();

    BandInfo findById(@Param("id") Long id);

    BandInfo findByBandCode(@Param("bandCode") String bandCode);

    List<BandInfo> findByTechnology(@Param("technology") String technology);

    List<BandInfo> findByDuplexMode(@Param("duplexMode") String duplexMode);
}
