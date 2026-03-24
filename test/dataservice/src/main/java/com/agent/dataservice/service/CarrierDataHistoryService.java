package com.agent.dataservice.service;

import com.agent.dataservice.entity.CarrierDataHistory;
import com.agent.dataservice.mapper.CarrierDataHistoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CarrierDataHistoryService {

    @Autowired
    private CarrierDataHistoryMapper historyMapper;

    public List<CarrierDataHistory> findAll() {
        return historyMapper.findAll();
    }

    public Optional<CarrierDataHistory> findById(Long id) {
        return Optional.ofNullable(historyMapper.findById(id));
    }

    public List<CarrierDataHistory> findByCarrierId(Long carrierId) {
        return historyMapper.findByCarrierId(carrierId);
    }

    public List<CarrierDataHistory> findByCarrierDataId(Long carrierDataId) {
        return historyMapper.findByCarrierDataId(carrierDataId);
    }

    public List<CarrierDataHistory> findByTimeRange(LocalDateTime start, LocalDateTime end) {
        return historyMapper.findByTimeRange(start, end);
    }

    public List<CarrierDataHistory> findHistoryByCarrierCode(String code) {
        return historyMapper.findByCarrierCode(code);
    }

    public CarrierDataHistory save(CarrierDataHistory history) {
        if (history.getId() == null) {
            historyMapper.insert(history);
        }
        return history;
    }

    public void deleteById(Long id) {
        historyMapper.deleteById(id);
    }

    /**
     * Get recent history for a carrier
     */
    public List<CarrierDataHistory> getRecentHistoryByCarrier(Long carrierId, int limit) {
        List<CarrierDataHistory> histories = historyMapper.findByCarrierId(carrierId);
        return histories.stream().limit(limit).toList();
    }
}
