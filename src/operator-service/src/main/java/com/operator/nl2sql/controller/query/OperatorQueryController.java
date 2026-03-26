package com.operator.nl2sql.controller.query;

import com.operator.nl2sql.entity.OperatorInfo;
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
}