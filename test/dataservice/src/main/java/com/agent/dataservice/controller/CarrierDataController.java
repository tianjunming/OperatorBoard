package com.agent.dataservice.controller;

import com.agent.dataservice.entity.CarrierData;
import com.agent.dataservice.service.CarrierDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/carrier-data")
@CrossOrigin(origins = "*")
public class CarrierDataController {

    @Autowired
    private CarrierDataService carrierDataService;

    @GetMapping
    public ResponseEntity<List<CarrierData>> getAllData() {
        return ResponseEntity.ok(carrierDataService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarrierData> getDataById(@PathVariable Long id) {
        return carrierDataService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/carrier/{carrierId}")
    public ResponseEntity<List<CarrierData>> getDataByCarrierId(@PathVariable Long carrierId) {
        return ResponseEntity.ok(carrierDataService.findByCarrierId(carrierId));
    }

    @GetMapping("/carrier/code/{code}")
    public ResponseEntity<List<CarrierData>> getDataByCarrierCode(@PathVariable String code) {
        return ResponseEntity.ok(carrierDataService.findByCarrierCode(code));
    }

    @GetMapping("/frequency-band/{band}")
    public ResponseEntity<List<CarrierData>> getDataByFrequencyBand(@PathVariable String band) {
        return ResponseEntity.ok(carrierDataService.findByFrequencyBand(band));
    }

    @GetMapping("/site/search")
    public ResponseEntity<List<CarrierData>> searchBySiteName(@RequestParam String name) {
        return ResponseEntity.ok(carrierDataService.findBySiteNameContaining(name));
    }

    @GetMapping("/prb/greater-than")
    public ResponseEntity<List<CarrierData>> getHighPrbData(@RequestParam Double threshold) {
        return ResponseEntity.ok(carrierDataService.findByPrbUtilizationGreaterThan(threshold));
    }

    @GetMapping("/statistics/carrier/{carrierId}")
    public ResponseEntity<Map<String, Object>> getStatisticsByCarrier(@PathVariable Long carrierId) {
        return ResponseEntity.ok(carrierDataService.getStatisticsByCarrier(carrierId));
    }

    @GetMapping("/all-with-carriers")
    public ResponseEntity<List<Map<String, Object>>> getAllCarriersWithData() {
        return ResponseEntity.ok(carrierDataService.getAllCarriersWithData());
    }

    @PostMapping
    public ResponseEntity<CarrierData> createData(@RequestBody CarrierData data, @RequestParam Long carrierId) {
        return ResponseEntity.ok(carrierDataService.save(data, carrierId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteData(@PathVariable Long id) {
        carrierDataService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
