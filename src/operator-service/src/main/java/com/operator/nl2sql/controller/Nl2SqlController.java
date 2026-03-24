package com.operator.nl2sql.controller;

import com.operator.nl2sql.config.SchemaCache;
import com.operator.nl2sql.dto.Nl2SqlRequest;
import com.operator.nl2sql.dto.Nl2SqlResponse;
import com.operator.nl2sql.service.command.Nl2SqlCommandService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/nl2sql")
public class Nl2SqlController {

    private final Nl2SqlCommandService nl2SqlCommandService;
    private final SchemaCache schemaCache;

    public Nl2SqlController(Nl2SqlCommandService nl2SqlCommandService, SchemaCache schemaCache) {
        this.nl2SqlCommandService = nl2SqlCommandService;
        this.schemaCache = schemaCache;
    }

    @PostMapping("/query")
    public ResponseEntity<Nl2SqlResponse> executeQuery(
            @Valid @RequestBody Nl2SqlRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            String generatedSql = nl2SqlCommandService.generateSql(request);

            if (!nl2SqlCommandService.isSqlSafe(generatedSql)) {
                return ResponseEntity.ok(Nl2SqlResponse.error(
                        "Generated SQL contains potentially unsafe operations",
                        generatedSql));
            }

            List<Map<String, Object>> results = nl2SqlCommandService.executeQuery(
                    generatedSql,
                    request.getMaxResults());

            Nl2SqlResponse.QueryMeta meta = Nl2SqlResponse.QueryMeta.builder()
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .isLatest(request.getLatest())
                    .isCompare(request.getCompare())
                    .indicators(request.getIndicators())
                    .build();

            return ResponseEntity.ok(Nl2SqlResponse.builder()
                    .generatedSql(generatedSql)
                    .results(results)
                    .rowCount(results.size())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .status("success")
                    .meta(meta)
                    .build());

        } catch (Exception e) {
            return ResponseEntity.ok(Nl2SqlResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/schema")
    public ResponseEntity<String> getSchema() {
        return ResponseEntity.ok(schemaCache.getSchemaContext());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
