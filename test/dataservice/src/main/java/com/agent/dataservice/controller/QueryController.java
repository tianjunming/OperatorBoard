package com.agent.dataservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Unified Query Controller for Agent
 * Provides a simple interface for the Agent to query data
 */
@RestController
@RequestMapping("/api/query")
@CrossOrigin(origins = "*")
public class QueryController {

    @Autowired
    private com.agent.dataservice.service.CarrierService carrierService;

    @Autowired
    private com.agent.dataservice.service.CarrierDataService carrierDataService;

    @Autowired
    private com.agent.dataservice.service.CarrierDataHistoryService historyService;

    /**
     * Simple query endpoint that returns data based on query type
     * Query types: carriers, data, history, statistics
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> query(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String carrier,
            @RequestParam(required = false) String band,
            @RequestParam(required = false) Double minPrb) {

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("timestamp", java.time.LocalDateTime.now().toString());

        try {
            if (type == null) {
                // Return all summary data
                result.put("data", getAllSummary());
                result.put("message", "返回所有数据汇总");
            } else {
                switch (type.toLowerCase()) {
                    case "carriers" -> {
                        result.put("data", carrierService.findAll());
                        result.put("message", "返回所有运营商信息");
                    }
                    case "data" -> {
                        result.put("data", getCarrierData(carrier, band, minPrb));
                        result.put("message", "返回运营商数据");
                    }
                    case "history" -> {
                        result.put("data", getHistoryData(carrier));
                        result.put("message", "返回历史数据");
                    }
                    case "statistics" -> {
                        result.put("data", getStatistics(carrier));
                        result.put("message", "返回统计信息");
                    }
                    case "all" -> {
                        result.put("data", carrierDataService.getAllCarriersWithData());
                        result.put("message", "返回所有运营商及其数据");
                    }
                    default -> {
                        result.put("success", false);
                        result.put("message", "未知查询类型: " + type);
                    }
                }
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "查询错误: " + e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> getAllSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("carriers", carrierService.findAll());
        summary.put("allData", carrierDataService.findAll());
        summary.put("recentHistory", historyService.findAll());
        return summary;
    }

    private List<?> getCarrierData(String carrier, String band, Double minPrb) {
        if (carrier != null && !carrier.isEmpty()) {
            // Try to find by code or name
            var carrierOpt = carrierService.findByCode(carrier);
            if (carrierOpt.isEmpty()) {
                var carriers = carrierService.searchByName(carrier);
                if (!carriers.isEmpty()) {
                    return carrierDataService.findByCarrierId(carriers.get(0).getId());
                }
                return Collections.emptyList();
            }
            return carrierDataService.findByCarrierId(carrierOpt.get().getId());
        }
        if (band != null && !band.isEmpty()) {
            return carrierDataService.findByFrequencyBand(band);
        }
        if (minPrb != null) {
            return carrierDataService.findByPrbUtilizationGreaterThan(minPrb);
        }
        return carrierDataService.findAll();
    }

    private List<?> getHistoryData(String carrier) {
        if (carrier != null && !carrier.isEmpty()) {
            var carrierOpt = carrierService.findByCode(carrier);
            if (carrierOpt.isEmpty()) {
                var carriers = carrierService.searchByName(carrier);
                if (!carriers.isEmpty()) {
                    return historyService.findByCarrierId(carriers.get(0).getId());
                }
                return Collections.emptyList();
            }
            return historyService.findHistoryByCarrierCode(carrier);
        }
        return historyService.findAll();
    }

    private Map<String, Object> getStatistics(String carrier) {
        Map<String, Object> stats = new HashMap<>();
        if (carrier != null && !carrier.isEmpty()) {
            var carrierOpt = carrierService.findByCode(carrier);
            if (carrierOpt.isPresent()) {
                stats.put(carrier, carrierDataService.getStatisticsByCarrier(carrierOpt.get().getId()));
            }
        } else {
            // Statistics for all carriers
            List<com.agent.dataservice.entity.Carrier> carriers = carrierService.findAll();
            Map<String, Map<String, Object>> allStats = new HashMap<>();
            for (var c : carriers) {
                allStats.put(c.getName(), carrierDataService.getStatisticsByCarrier(c.getId()));
            }
            stats.put("allCarriers", allStats);
        }
        return stats;
    }

    /**
     * Natural language query interface
     */
    @PostMapping("/natural")
    public ResponseEntity<Map<String, Object>> naturalQuery(@RequestBody Map<String, String> request) {
        Map<String, Object> result = new HashMap<>();
        String query = request.get("query");

        try {
            if (query == null || query.isEmpty()) {
                result.put("success", false);
                result.put("message", "查询语句不能为空");
                return ResponseEntity.ok(result);
            }

            result.put("success", true);
            result.put("query", query);

            // Simple keyword-based routing
            String lowerQuery = query.toLowerCase();

            if (lowerQuery.contains("运营商") || lowerQuery.contains("carrier")) {
                result.put("type", "carriers");
                result.put("data", carrierService.findAll());
                result.put("message", "运营商列表");
            } else if (lowerQuery.contains("统计") || lowerQuery.contains("statistics")) {
                result.put("type", "statistics");
                result.put("data", getStatistics(null));
                result.put("message", "统计数据");
            } else if (lowerQuery.contains("历史") || lowerQuery.contains("history")) {
                result.put("type", "history");
                result.put("data", historyService.findAll());
                result.put("message", "历史数据");
            } else if (lowerQuery.contains("频段") || lowerQuery.contains("band")) {
                result.put("type", "data");
                result.put("data", carrierDataService.findAll());
                result.put("message", "频段数据");
            } else if (lowerQuery.contains("PRB") || lowerQuery.contains("利用率")) {
                result.put("type", "high_prb");
                result.put("data", carrierDataService.findByPrbUtilizationGreaterThan(50.0));
                result.put("message", "高PRB利用率数据 (>50%)");
            } else {
                // Default: return all data
                result.put("type", "all");
                result.put("data", carrierDataService.getAllCarriersWithData());
                result.put("message", "全部数据");
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "查询错误: " + e.getMessage());
        }

        return ResponseEntity.ok(result);
    }
}
