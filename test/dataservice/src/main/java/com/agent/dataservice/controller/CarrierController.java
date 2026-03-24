package com.agent.dataservice.controller;

import com.agent.dataservice.entity.Carrier;
import com.agent.dataservice.service.CarrierService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/carriers")
@CrossOrigin(origins = "*")
public class CarrierController {

    @Autowired
    private CarrierService carrierService;

    @GetMapping
    public ResponseEntity<List<Carrier>> getAllCarriers() {
        return ResponseEntity.ok(carrierService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Carrier> getCarrierById(@PathVariable Long id) {
        return carrierService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Carrier> getCarrierByCode(@PathVariable String code) {
        return carrierService.findByCode(code)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Carrier>> searchCarriers(@RequestParam String name) {
        return ResponseEntity.ok(carrierService.searchByName(name));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Carrier>> getCarriersByStatus(@PathVariable Integer status) {
        return ResponseEntity.ok(carrierService.findByStatus(status));
    }

    @PostMapping
    public ResponseEntity<Carrier> createCarrier(@RequestBody Carrier carrier) {
        return ResponseEntity.ok(carrierService.save(carrier));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Carrier> updateCarrier(@PathVariable Long id, @RequestBody Carrier carrier) {
        return carrierService.findById(id)
            .map(existing -> {
                carrier.setId(id);
                return ResponseEntity.ok(carrierService.save(carrier));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCarrier(@PathVariable Long id) {
        carrierService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Long> countCarriers() {
        return ResponseEntity.ok(carrierService.count());
    }
}
