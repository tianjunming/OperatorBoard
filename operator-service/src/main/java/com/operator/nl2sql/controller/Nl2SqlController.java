package com.operator.nl2sql.controller;

import com.operator.nl2sql.dto.Nl2SqlRequest;
import com.operator.nl2sql.dto.Nl2SqlResponse;
import com.operator.nl2sql.service.Nl2SqlService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/nl2sql")
public class Nl2SqlController {

    private final Nl2SqlService nl2SqlService;

    public Nl2SqlController(Nl2SqlService nl2SqlService) {
        this.nl2SqlService = nl2SqlService;
    }

    @PostMapping("/query")
    public ResponseEntity<Nl2SqlResponse> executeQuery(
            @Valid @RequestBody Nl2SqlRequest request) {
        Nl2SqlResponse response = nl2SqlService.executeQuery(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/schema")
    public ResponseEntity<String> getSchema() {
        return ResponseEntity.ok(nl2SqlService.getSchemaContext());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/indicators")
    public ResponseEntity<List<Map<String, Object>>> getIndicators(
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String siteCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataTime,
            @RequestParam(defaultValue = "100") Integer limit) {
        List<Map<String, Object>> indicators = nl2SqlService.getIndicators(
                operatorName, siteCode, dataTime, limit);
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/indicators/latest")
    public ResponseEntity<List<Map<String, Object>>> getLatestIndicators(
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String[] frequencyBands,
            @RequestParam(defaultValue = "100") Integer limit) {
        List<Map<String, Object>> indicators = nl2SqlService.getLatestIndicators(
                operatorName, frequencyBands, limit);
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/indicators/compare")
    public ResponseEntity<Nl2SqlResponse> compareIndicators(
            @RequestParam String operatorName,
            @RequestParam(required = false) String siteCode,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth currentMonth,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth compareMonth,
            @RequestParam(required = false) String[] indicators) {
        Nl2SqlResponse response = nl2SqlService.compareIndicatorsByMonth(
                operatorName, siteCode, currentMonth, compareMonth, indicators);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/indicators/trend")
    public ResponseEntity<List<Map<String, Object>>> getTrendData(
            @RequestParam String operatorName,
            @RequestParam(required = false) String siteCode,
            @RequestParam(required = false) String cellId,
            @RequestParam(required = false) String indicator,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "1000") Integer limit) {
        List<Map<String, Object>> trendData = nl2SqlService.getTrendData(
                operatorName, siteCode, cellId, indicator, startTime, endTime, limit);
        return ResponseEntity.ok(trendData);
    }

    @GetMapping("/times")
    public ResponseEntity<List<Map<String, Object>>> getAvailableTimes(
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String siteCode) {
        List<Map<String, Object>> times = nl2SqlService.getAvailableTimes(operatorName, siteCode);
        return ResponseEntity.ok(times);
    }
}
