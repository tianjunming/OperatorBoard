package com.agent.dataservice.mapper;

import com.agent.dataservice.entity.Carrier;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CarrierMapper {

    @Select("SELECT * FROM carrier ORDER BY id")
    List<Carrier> findAll();

    @Select("SELECT * FROM carrier WHERE id = #{id}")
    Carrier findById(Long id);

    @Select("SELECT * FROM carrier WHERE code = #{code}")
    Carrier findByCode(String code);

    @Select("SELECT * FROM carrier WHERE status = #{status}")
    List<Carrier> findByStatus(Integer status);

    @Select("SELECT * FROM carrier WHERE name LIKE CONCAT('%', #{name}, '%')")
    List<Carrier> searchByName(String name);

    @Insert("INSERT INTO carrier(name, code, type, contact, status) VALUES(#{name}, #{code}, #{type}, #{contact}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Carrier carrier);

    @Update("UPDATE carrier SET name=#{name}, code=#{code}, type=#{type}, contact=#{contact}, status=#{status} WHERE id=#{id}")
    int update(Carrier carrier);

    @Delete("DELETE FROM carrier WHERE id = #{id}")
    int deleteById(Long id);

    @Select("SELECT COUNT(*) FROM carrier")
    long count();
}
