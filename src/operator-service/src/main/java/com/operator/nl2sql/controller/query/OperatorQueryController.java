package com.operator.nl2sql.controller.query;

import com.operator.nl2sql.dto.OperatorNotFoundResponse;
import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.entity.SiteCellSummary;
import com.operator.nl2sql.service.query.OperatorQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/nl2sql")
public class OperatorQueryController {

    private final OperatorQueryService operatorQueryService;

    public OperatorQueryController(OperatorQueryService operatorQueryService) {
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

    @GetMapping("/operators")
    public ResponseEntity<List<OperatorInfo>> getOperators(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String operatorName) {
        List<OperatorInfo> operators;

        if (country != null && !country.isBlank()) {
            operators = operatorQueryService.findByCountry(country);
        } else if (operatorName != null && !operatorName.isBlank()) {
            operators = operatorQueryService.findByOperatorName(operatorName);
            if (operators.isEmpty()) {
                return ResponseEntity.status(404).body(null);
            }
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
    public ResponseEntity<?> getSiteSummary(
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
                return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
            }
            siteSummary = operatorQueryService.findSiteCellSummaryByOperatorId(operators.get(0).getId());
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
    public ResponseEntity<?> getOperatorSitesLatest(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
        }
        OperatorInfo operator = operators.get(0);
        List<SiteCellSummary> sites = operatorQueryService.getOperatorSitesLatest(operator.getId());
        return ResponseEntity.ok(sites);
    }

    @GetMapping("/operators/{operatorName}/sites/history")
    public ResponseEntity<?> getOperatorSitesHistory(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
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
    public ResponseEntity<?> getOperatorIndicatorsLatest(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
        }
        OperatorInfo operator = operators.get(0);
        IndicatorInfo indicators = operatorQueryService.getOperatorIndicatorsLatest(operator.getId());
        if (indicators == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(indicators);
    }

    @GetMapping("/operators/{operatorName}/indicators/history")
    public ResponseEntity<?> getOperatorIndicatorsHistory(@PathVariable String operatorName) {
        List<OperatorInfo> operators = operatorQueryService.findByOperatorName(operatorName);
        if (operators.isEmpty()) {
            return ResponseEntity.status(404).body(createOperatorNotFoundResponse(operatorName));
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