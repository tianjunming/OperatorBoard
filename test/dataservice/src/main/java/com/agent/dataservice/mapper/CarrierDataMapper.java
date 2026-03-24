package com.agent.dataservice.mapper;

import com.agent.dataservice.entity.CarrierData;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CarrierDataMapper {

    @Select("SELECT * FROM carrier_data ORDER BY id")
    List<CarrierData> findAll();

    @Select("SELECT * FROM carrier_data WHERE id = #{id}")
    CarrierData findById(Long id);

    @Select("SELECT * FROM carrier_data WHERE carrier_id = #{carrierId}")
    List<CarrierData> findByCarrierId(Long carrierId);

    @Select("SELECT * FROM carrier_data WHERE carrier_id = #{carrierId}")
    List<CarrierData> findByCarrierIdOrderById(Long carrierId);

    @Select("SELECT * FROM carrier_data WHERE frequency_band = #{frequencyBand}")
    List<CarrierData> findByFrequencyBand(String frequencyBand);

    @Select("SELECT * FROM carrier_data WHERE site_name LIKE CONCAT('%', #{siteName}, '%')")
    List<CarrierData> findBySiteNameContaining(String siteName);

    @Select("SELECT * FROM carrier_data WHERE prb_utilization > #{threshold}")
    List<CarrierData> findByPrbUtilizationGreaterThan(Double threshold);

    @Select("""
        SELECT cd.*, c.name as carrier_name, c.code as carrier_code
        FROM carrier_data cd
        LEFT JOIN carrier c ON cd.carrier_id = c.id
        ORDER BY cd.id
        """)
    List<CarrierData> findAllWithCarrierInfo();

    @Select("""
        SELECT cd.*, c.name as carrier_name, c.code as carrier_code
        FROM carrier_data cd
        LEFT JOIN carrier c ON cd.carrier_id = c.id
        WHERE cd.carrier_id = #{carrierId}
        """)
    List<CarrierData> findByCarrierIdWithCarrierInfo(Long carrierId);

    @Insert("""
        INSERT INTO carrier_data(carrier_id, frequency_band, site_name, cell_id,
        uplink_rate, downlink_rate, prb_utilization, longitude, latitude, location, status)
        VALUES(#{carrierId}, #{frequencyBand}, #{siteName}, #{cellId},
        #{uplinkRate}, #{downlinkRate}, #{prbUtilization}, #{longitude}, #{latitude}, #{location}, #{status})
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(CarrierData carrierData);

    @Update("""
        UPDATE carrier_data SET carrier_id=#{carrierId}, frequency_band=#{frequencyBand},
        site_name=#{siteName}, cell_id=#{cellId}, uplink_rate=#{uplinkRate},
        downlink_rate=#{downlinkRate}, prb_utilization=#{prbUtilization},
        longitude=#{longitude}, latitude=#{latitude}, location=#{location}, status=#{status}
        WHERE id=#{id}
        """)
    int update(CarrierData carrierData);

    @Delete("DELETE FROM carrier_data WHERE id = #{id}")
    int deleteById(Long id);

    @Select("""
        SELECT AVG(uplink_rate) as avgUplinkRate, AVG(downlink_rate) as avgDownlinkRate,
        AVG(prb_utilization) as avgPrbUtilization, COUNT(*) as siteCount
        FROM carrier_data WHERE carrier_id = #{carrierId}
        """)
    CarrierData getStatisticsByCarrierId(Long carrierId);
}
