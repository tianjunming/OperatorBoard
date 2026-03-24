package com.agent.dataservice.service;

import com.agent.dataservice.entity.Carrier;
import com.agent.dataservice.entity.CarrierData;
import com.agent.dataservice.mapper.CarrierDataMapper;
import com.agent.dataservice.mapper.CarrierMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CarrierDataService {

    @Autowired
    private CarrierDataMapper carrierDataMapper;

    @Autowired
    private CarrierMapper carrierMapper;

    public List<CarrierData> findAll() {
        return carrierDataMapper.findAll();
    }

    public Optional<CarrierData> findById(Long id) {
        return Optional.ofNullable(carrierDataMapper.findById(id));
    }

    public List<CarrierData> findByCarrierId(Long carrierId) {
        return carrierDataMapper.findByCarrierId(carrierId);
    }

    public List<CarrierData> findByCarrierCode(String code) {
        Carrier carrier = carrierMapper.findByCode(code);
        if (carrier == null) {
            return Collections.emptyList();
        }
        return carrierDataMapper.findByCarrierId(carrier.getId());
    }

    public List<CarrierData> findByFrequencyBand(String band) {
        return carrierDataMapper.findByFrequencyBand(band);
    }

    public List<CarrierData> findBySiteNameContaining(String siteName) {
        return carrierDataMapper.findBySiteNameContaining(siteName);
    }

    public List<CarrierData> findByPrbUtilizationGreaterThan(Double threshold) {
        return carrierDataMapper.findByPrbUtilizationGreaterThan(threshold);
    }

    public CarrierData save(CarrierData carrierData, Long carrierId) {
        carrierData.setCarrierId(carrierId);
        if (carrierData.getId() == null) {
            carrierDataMapper.insert(carrierData);
        } else {
            carrierDataMapper.update(carrierData);
        }
        return carrierData;
    }

    public void deleteById(Long id) {
        carrierDataMapper.deleteById(id);
    }

    /**
     * Query statistics by carrier
     */
    public Map<String, Object> getStatisticsByCarrier(Long carrierId) {
        List<CarrierData> dataList = carrierDataMapper.findByCarrierId(carrierId);
        Map<String, Object> stats = new HashMap<>();

        if (!dataList.isEmpty()) {
            double avgUplink = dataList.stream()
                .mapToDouble(d -> d.getUplinkRate() != null ? d.getUplinkRate().doubleValue() : 0)
                .average().orElse(0);

            double avgDownlink = dataList.stream()
                .mapToDouble(d -> d.getDownlinkRate() != null ? d.getDownlinkRate().doubleValue() : 0)
                .average().orElse(0);

            double avgPrb = dataList.stream()
                .mapToDouble(d -> d.getPrbUtilization() != null ? d.getPrbUtilization().doubleValue() : 0)
                .average().orElse(0);

            stats.put("siteCount", dataList.size());
            stats.put("avgUplinkRate", avgUplink);
            stats.put("avgDownlinkRate", avgDownlink);
            stats.put("avgPrbUtilization", avgPrb);
        }

        return stats;
    }

    /**
     * Query all carriers with their data
     */
    public List<Map<String, Object>> getAllCarriersWithData() {
        List<Carrier> carriers = carrierMapper.findAll();
        return carriers.stream().map(carrier -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", carrier.getId());
            map.put("name", carrier.getName());
            map.put("code", carrier.getCode());
            map.put("type", carrier.getType());

            List<CarrierData> dataList = carrierDataMapper.findByCarrierId(carrier.getId());
            map.put("siteCount", dataList.size());
            map.put("data", dataList);
            return map;
        }).toList();
    }
}
