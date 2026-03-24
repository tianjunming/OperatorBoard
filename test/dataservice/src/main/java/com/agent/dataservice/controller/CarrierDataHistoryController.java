package com.agent.dataservice.controller;

import com.agent.dataservice.entity.CarrierDataHistory;
import com.agent.dataservice.service.CarrierDataHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class CarrierDataHistoryController {

    @Autowired
    private CarrierDataHistoryService historyService;

    @GetMapping
    public ResponseEntity<List<CarrierDataHistory>> getAllHistory() {
        return ResponseEntity.ok(historyService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarrierDataHistory> getHistoryById(@PathVariable Long id) {
        return historyService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/carrier/{carrierId}")
    public ResponseEntity<List<CarrierDataHistory>> getHistoryByCarrierId(@PathVariable Long carrierId) {
        return ResponseEntity.ok(historyService.findByCarrierId(carrierId));
    }

    @GetMapping("/carrier/code/{code}")
    public ResponseEntity<List<CarrierDataHistory>> getHistoryByCarrierCode(@PathVariable String code) {
        return ResponseEntity.ok(historyService.findHistoryByCarrierCode(code));
    }

    @GetMapping("/carrier-data/{carrierDataId}")
    public ResponseEntity<List<CarrierDataHistory>> getHistoryByCarrierDataId(@PathVariable Long carrierDataId) {
        return ResponseEntity.ok(historyService.findByCarrierDataId(carrierDataId));
    }

    @GetMapping("/time-range")
    public ResponseEntity<List<CarrierDataHistory>> getHistoryByTimeRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(historyService.findByTimeRange(start, end));
    }

    @GetMapping("/recent/carrier/{carrierId}")
    public ResponseEntity<List<CarrierDataHistory>> getRecentHistory(
            @PathVariable Long carrierId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(historyService.getRecentHistoryByCarrier(carrierId, limit));
    }

    @PostMapping
    public ResponseEntity<CarrierDataHistory> createHistory(@RequestBody CarrierDataHistory history) {
        return ResponseEntity.ok(historyService.save(history));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHistory(@PathVariable Long id) {
        historyService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
