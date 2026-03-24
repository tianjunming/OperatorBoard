package com.agent.dataservice.service;

import com.agent.dataservice.entity.Carrier;
import com.agent.dataservice.mapper.CarrierMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CarrierService {

    @Autowired
    private CarrierMapper carrierMapper;

    public List<Carrier> findAll() {
        return carrierMapper.findAll();
    }

    public Optional<Carrier> findById(Long id) {
        return Optional.ofNullable(carrierMapper.findById(id));
    }

    public Optional<Carrier> findByCode(String code) {
        return Optional.ofNullable(carrierMapper.findByCode(code));
    }

    public List<Carrier> findByStatus(Integer status) {
        return carrierMapper.findByStatus(status);
    }

    public List<Carrier> searchByName(String name) {
        return carrierMapper.searchByName(name);
    }

    public Carrier save(Carrier carrier) {
        if (carrier.getId() == null) {
            carrierMapper.insert(carrier);
        } else {
            carrierMapper.update(carrier);
        }
        return carrier;
    }

    public void deleteById(Long id) {
        carrierMapper.deleteById(id);
    }

    public long count() {
        return carrierMapper.count();
    }
}
