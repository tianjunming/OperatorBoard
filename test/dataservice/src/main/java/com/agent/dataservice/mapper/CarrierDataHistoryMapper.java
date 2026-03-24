package com.agent.dataservice.mapper;

import com.agent.dataservice.entity.CarrierDataHistory;
import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface CarrierDataHistoryMapper {

    @Select("SELECT * FROM carrier_data_history ORDER BY data_time DESC")
    List<CarrierDataHistory> findAll();

    @Select("SELECT * FROM carrier_data_history WHERE id = #{id}")
    CarrierDataHistory findById(Long id);

    @Select("SELECT * FROM carrier_data_history WHERE carrier_id = #{carrierId} ORDER BY data_time DESC")
    List<CarrierDataHistory> findByCarrierId(Long carrierId);

    @Select("SELECT * FROM carrier_data_history WHERE carrier_data_id = #{carrierDataId} ORDER BY data_time DESC")
    List<CarrierDataHistory> findByCarrierDataId(Long carrierDataId);

    @Select("""
        SELECT h.*, c.name as carrier_name, c.code as carrier_code
        FROM carrier_data_history h
        LEFT JOIN carrier c ON h.carrier_id = c.id
        WHERE h.carrier_id = #{carrierId}
        ORDER BY h.data_time DESC
        """)
    List<CarrierDataHistory> findByCarrierIdWithCarrierInfo(Long carrierId);

    @Select("""
        SELECT h.*, c.name as carrier_name, c.code as carrier_code
        FROM carrier_data_history h
        LEFT JOIN carrier c ON h.carrier_id = c.id
        WHERE c.code = #{code}
        ORDER BY h.data_time DESC
        """)
    List<CarrierDataHistory> findByCarrierCode(String code);

    @Select("""
        SELECT h.*, c.name as carrier_name, c.code as carrier_code
        FROM carrier_data_history h
        LEFT JOIN carrier c ON h.carrier_id = c.id
        WHERE h.data_time BETWEEN #{start} AND #{end}
        ORDER BY h.data_time DESC
        """)
    List<CarrierDataHistory> findByTimeRange(LocalDateTime start, LocalDateTime end);

    @Insert("""
        INSERT INTO carrier_data_history(carrier_id, carrier_data_id, data_description,
        data_time, uplink_rate, downlink_rate, prb_utilization)
        VALUES(#{carrierId}, #{carrierDataId}, #{dataDescription},
        #{dataTime}, #{uplinkRate}, #{downlinkRate}, #{prbUtilization})
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(CarrierDataHistory history);

    @Delete("DELETE FROM carrier_data_history WHERE id = #{id}")
    int deleteById(Long id);
}
