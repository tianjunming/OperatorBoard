package com.operator.nl2sql.controller.query;

import com.operator.nl2sql.dto.BandIndicatorResponse;
import com.operator.nl2sql.dto.OperatorMetricsResponse;
import com.operator.nl2sql.dto.OperatorNotFoundResponse;
import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.service.query.IndicatorQueryService;
import com.operator.nl2sql.service.query.OperatorQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/nl2sql/indicators")
public class IndicatorQueryController {

    private final IndicatorQueryService indicatorQueryService;
    private final OperatorQueryService operatorQueryService;

    public IndicatorQueryController(IndicatorQueryService indicatorQueryService, OperatorQueryService operatorQueryService) {
        this.indicatorQueryService = indicatorQueryService;
        this.operatorQueryService = operatorQueryService;
    }

    private OperatorNotFoundResponse createOperatorNotFoundResponse(String operatorName) {
        List<OperatorInfo> allOperators = operatorQueryService.findAllOperators();
        List<String> availableOperators = allOperators.stream()
                .map(OperatorInfo::getOperatorName)
                .collect(Collectors.toList());

        // Extract unique countries for suggestions
        List<String> countries = allOperators.stream()
                .map(OperatorInfo::getCountry)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .limit(8)
                .collect(Collectors.toList());

        // Get distinct data months for suggestions
        List<String> dataMonths = operatorQueryService.findDistinctDataMonths();
        String latestMonth = dataMonths.isEmpty() ? "2026-02" : dataMonths.get(0);

        // Suggest operators similar to the queried name
        List<String> similarOperators = availableOperators.stream()
                .filter(op -> op.toLowerCase().contains(operatorName.toLowerCase().substring(0, Math.min(3, operatorName.length())))
                        || operatorName.toLowerCase().contains(op.toLowerCase().substring(0, Math.min(3, op.length()))))
                .limit(5)
                .collect(Collectors.toList());

        List<String> suggestions = new java.util.ArrayList<>();

        // 1. If partial match found, suggest it
        if (!similarOperators.isEmpty()) {
            suggestions.add("您是否要查询: " + String.join("、", similarOperators) + "？");
        }

        // 2. Suggest country-based query
        if (!countries.isEmpty()) {
            suggestions.add("按国家查询: 查看" + countries.get(0) + "的所有运营商，例如查询 'China Unicom' 或 '中国移动'");
        }

        // 3. Suggest time-based query
        suggestions.add("按时间查询: 查看" + latestMonth + "的最新数据，例如查询 'Airtel DRC " + latestMonth + "'");

        // 4. Suggest summary query
        suggestions.add("汇总查询: 不带运营商名称查询，获取所有运营商的汇总数据");

        // 5. Suggest indicator query
        suggestions.add("指标查询: 查询关键指标数据，如 '中国电信 指标' 或 'China Telecom indicators'");

        // 6. Suggestion for exploring different data types
        suggestions.add("探索数据: 尝试查询 'site-summary' 获取基站汇总，或 'indicators' 获取指标数据");

        return OperatorNotFoundResponse.of(operatorName, availableOperators, suggestions);
    }

    @GetMapping
    public ResponseEntity<?> getIndicators(
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
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            indicators = indicatorQueryService.findIndicatorsByOperatorId(operators.get(0).getId());
        } else {
            indicators = indicatorQueryService.findAllIndicators();
        }

        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestIndicators(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName) {
        List<IndicatorInfo> indicators;
        if (operatorId != null) {
            indicators = indicatorQueryService.findLatestIndicators(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            indicators = indicatorQueryService.findLatestIndicators(operators.get(0).getId());
        } else {
            indicators = indicatorQueryService.findLatestIndicators(null);
        }
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/trend")
    public ResponseEntity<?> getTrendData(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName) {
        List<IndicatorInfo> trendData;
        if (operatorId != null) {
            trendData = indicatorQueryService.findTrendData(operatorId);
        } else if (operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            trendData = indicatorQueryService.findTrendData(operators.get(0).getId());
        } else {
            trendData = List.of();
        }
        return ResponseEntity.ok(trendData);
    }

    @GetMapping("/band")
    public ResponseEntity<?> getBandIndicator(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String band,
            @RequestParam(required = false) String networkType) {

        if ((operatorId == null && (operatorName == null || operatorName.isBlank()))
                || band == null || band.isBlank()) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "MISSING_PARAMS",
                            "message", "需要提供 operatorId 或 operatorName, 以及 band"));
        }

        // 如果没有提供 operatorId，通过 operatorName 查询
        Long resolvedOperatorId = operatorId;
        if (resolvedOperatorId == null && operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            resolvedOperatorId = operators.get(0).getId();
            operatorName = operators.get(0).getOperatorName();
        } else if (operatorId != null) {
            OperatorInfo operator = operatorQueryService.findOperatorById(operatorId);
            if (operator != null) {
                operatorName = operator.getOperatorName();
            }
        }

        try {
            Object result = indicatorQueryService.getBandIndicator(resolvedOperatorId, band, networkType);
            if (result == null) {
                return ResponseEntity.notFound().build();
            }

            // 设置运营商名称
            if (result instanceof BandIndicatorResponse) {
                ((BandIndicatorResponse) result).setOperatorName(operatorName);
            } else if (result instanceof BandIndicatorResponse.BandIndicatorListResponse) {
                ((BandIndicatorResponse.BandIndicatorListResponse) result).setOperatorName(operatorName);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    java.util.Map.of("error", "QUERY_FAILED",
                            "message", "查询失败: " + e.getMessage()));
        }
    }

    /**
     * 获取运营商级别汇总指标（分流比、驻留比、终端渗透率等）
     */
    @GetMapping("/metrics")
    public ResponseEntity<?> getOperatorMetrics(
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) String operatorName,
            @RequestParam(required = false) String dataMonth) {

        Long resolvedOperatorId = operatorId;

        // 如果没有提供 operatorId，通过 operatorName 查询
        if (resolvedOperatorId == null && operatorName != null && !operatorName.isBlank()) {
            List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            resolvedOperatorId = operators.get(0).getId();
        }

        try {
            List<OperatorMetricsResponse> metrics = indicatorQueryService.getOperatorMetrics(resolvedOperatorId, dataMonth);

            if (metrics.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // 如果指定了operatorName，设置运营商名称
            if (operatorName != null && !operatorName.isBlank()) {
                OperatorInfo operator = operatorQueryService.findOperatorById(resolvedOperatorId);
                if (operator != null) {
                    metrics.forEach(m -> m.setOperatorName(operator.getOperatorName()));
                }
            }

            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    java.util.Map.of("error", "QUERY_FAILED",
                            "message", "查询失败: " + e.getMessage()));
        }
    }
}