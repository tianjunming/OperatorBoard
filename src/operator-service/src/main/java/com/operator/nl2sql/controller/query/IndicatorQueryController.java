package com.operator.nl2sql.controller.query;

import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.service.query.IndicatorQueryService;
import com.operator.nl2sql.service.query.OperatorQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/nl2sql/indicators")
public class IndicatorQueryController {

    private final IndicatorQueryService indicatorQueryService;
    private final OperatorQueryService operatorQueryService;

    public IndicatorQueryController(IndicatorQueryService indicatorQueryService, OperatorQueryService operatorQueryService) {
        this.indicatorQueryService = indicatorQueryService;
        this.operatorQueryService = operatorQueryService;
    }

    @GetMapping
    public ResponseEntity<List<IndicatorInfo>> getIndicators(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String dataMonth) {
        List<IndicatorInfo> indicators;

        if (operatorId != null && dataMonth != null && !dataMonth.isBlank()) {
            IndicatorInfo result = indicatorQueryService.findIndicatorsByOperatorIdAndMonth(operatorId, dataMonth);
            indicators = result != null ? List.of(result) : List.of();
        } else if (operatorId != null) {
            indicators = indicatorQueryService.findIndicatorsByOperatorId(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                indicators = List.of();
            } else {
                indicators = indicatorQueryService.findIndicatorsByOperatorId(operators.get(0).getId());
            }
        } else {
            indicators = indicatorQueryService.findAllIndicators();
        }

        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/latest")
    public ResponseEntity<List<IndicatorInfo>> getLatestIndicators(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName) {
        List<IndicatorInfo> indicators;
        if (operatorId != null) {
            indicators = indicatorQueryService.findLatestIndicators(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                indicators = List.of();
            } else {
                indicators = indicatorQueryService.findLatestIndicators(operators.get(0).getId());
            }
        } else {
            indicators = indicatorQueryService.findLatestIndicators(null);
        }
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/trend")
    public ResponseEntity<List<IndicatorInfo>> getTrendData(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName) {
        List<IndicatorInfo> trendData;
        if (operatorId != null) {
            trendData = indicatorQueryService.findTrendData(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                trendData = List.of();
            } else {
                trendData = indicatorQueryService.findTrendData(operators.get(0).getId());
            }
        } else {
            trendData = List.of();
        }
        return ResponseEntity.ok(trendData);
    }
}