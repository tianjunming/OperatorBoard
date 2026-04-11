package com.operator.nl2sql.controller.query;

import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.entity.SiteCellSummary;
import com.operator.nl2sql.service.query.OperatorQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/nl2sql")
public class OperatorQueryController {

    private final OperatorQueryService operatorQueryService;

    public OperatorQueryController(OperatorQueryService operatorQueryService) {
        this.operatorQueryService = operatorQueryService;
    }

    @GetMapping("/operators")
    public ResponseEntity<List<OperatorInfo>> getOperators(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String operatorName) {
        List<OperatorInfo> operators;

        if (country != null && !country.isBlank()) {
            operators = operatorQueryService.findByCountry(country);
        } else if (operatorName != null && !operatorName.isBlank()) {
            operators = operatorQueryService.findByOperatorName(operatorName);
        } else {
            operators = operatorQueryService.findAllOperators();
        }

        return ResponseEntity.ok(operators);
    }

    @GetMapping("/operators/{id}")
    public ResponseEntity<OperatorInfo> getOperatorById(@PathVariable Long id) {
        OperatorInfo operator = operatorQueryService.findOperatorById(id);
        if (operator == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(operator);
    }

    @GetMapping("/site-summary")
    public ResponseEntity<List<SiteCellSummary>> getSiteSummary(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String dataMonth) {
        List<SiteCellSummary> siteSummary;

        if (operatorId != null && dataMonth != null && !dataMonth.isBlank()) {
            SiteCellSummary result = operatorQueryService.findSiteCellSummaryByOperatorIdAndMonth(operatorId, dataMonth);
            siteSummary = result != null ? List.of(result) : List.of();
        } else if (operatorId != null) {
            siteSummary = operatorQueryService.findSiteCellSummaryByOperatorId(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                siteSummary = List.of();
            } else {
                siteSummary = operatorQueryService.findSiteCellSummaryByOperatorId(operators.get(0).getId());
            }
        } else {
            siteSummary = operatorQueryService.findAllSiteCellSummary();
        }

        return ResponseEntity.ok(siteSummary);
    }

    @GetMapping("/times")
    public ResponseEntity<List<String>> getAvailableTimes() {
        List<String> timePoints = operatorQueryService.findDistinctDataMonths();
        return ResponseEntity.ok(timePoints);
    }

    // ==================== New Site Statistics Endpoints ====================

    @GetMapping("/operators/{operatorName}/sites/latest")
    public ResponseEntity<List<SiteCellSummary>> getOperatorSitesLatest(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OperatorInfo operator = operators.get(0);
        List<SiteCellSummary> sites = operatorQueryService.getOperatorSitesLatest(operator.getId());
        return ResponseEntity.ok(sites);
    }

    @GetMapping("/operators/{operatorName}/sites/history")
    public ResponseEntity<List<SiteCellSummary>> getOperatorSitesHistory(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OperatorInfo operator = operators.get(0);
        List<SiteCellSummary> sites = operatorQueryService.getOperatorSitesHistory(operator.getId());
        return ResponseEntity.ok(sites);
    }

    @GetMapping("/operators/all/sites/latest")
    public ResponseEntity<List<SiteCellSummary>> getAllOperatorsSitesLatest() {
        List<SiteCellSummary> sites = operatorQueryService.getAllOperatorsSitesLatest();
        return ResponseEntity.ok(sites);
    }

    // ==================== New Indicator Endpoints ====================

    @GetMapping("/operators/{operatorName}/indicators/latest")
    public ResponseEntity<IndicatorInfo> getOperatorIndicatorsLatest(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OperatorInfo operator = operators.get(0);
        IndicatorInfo indicators = operatorQueryService.getOperatorIndicatorsLatest(operator.getId());
        if (indicators == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/operators/{operatorName}/indicators/history")
    public ResponseEntity<List<IndicatorInfo>> getOperatorIndicatorsHistory(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OperatorInfo operator = operators.get(0);
        List<IndicatorInfo> indicators = operatorQueryService.getOperatorIndicatorsTrend(operator.getId());
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/operators/all/indicators/latest")
    public ResponseEntity<List<IndicatorInfo>> getAllOperatorsIndicatorsLatest() {
        List<IndicatorInfo> indicators = operatorQueryService.getAllOperatorsIndicatorsLatest();
        return ResponseEntity.ok(indicators);
    }
}