package com.operator.nl2sql.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.operator.nl2sql.config.SchemaCache;
import com.operator.nl2sql.config.SqlCoderConfig;
import com.operator.nl2sql.dto.Nl2SqlRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class SqlCoderService {

    private final SqlCoderConfig sqlCoderConfig;
    private final SchemaCache schemaCache;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public SqlCoderService(SqlCoderConfig sqlCoderConfig, SchemaCache schemaCache, ObjectMapper objectMapper) {
        this.sqlCoderConfig = sqlCoderConfig;
        this.schemaCache = schemaCache;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl(sqlCoderConfig.getSqlCoderUrl())
                .build();
    }

    public String generateSql(Nl2SqlRequest request) {
        return generateSql(request.getNaturalLanguageQuery(), request);
    }

    public String generateSql(String naturalLanguageQuery) {
        return generateSql(naturalLanguageQuery, null);
    }

    private String generateSql(String nlQuery, Nl2SqlRequest request) {
        String prompt = buildPrompt(nlQuery, request);

        try {
            Map<String, Object> requestBody = Map.of(
                    "prompt", prompt,
                    "max_tokens", 500,
                    "temperature", 0.1
            );

            String response = webClient.post()
                    .uri("/v1/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(sqlCoderConfig.getTimeout()))
                    .block();

            return parseSqlFromResponse(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to call SQLCoder: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String nlQuery, Nl2SqlRequest request) {
        String schemaContext = schemaCache.getSchemaContext();

        StringBuilder additionalContext = new StringBuilder();
        if (request != null) {
            if (Boolean.TRUE.equals(request.getLatest())) {
                additionalContext.append("\nNote: Query the LATEST data (MAX data_time) for each cell.\n");
            }
            if (request.getStartTime() != null) {
                additionalContext.append("\nStart Time: ").append(request.getStartTime().format(DATETIME_FORMATTER)).append("\n");
            }
            if (request.getEndTime() != null) {
                additionalContext.append("End Time: ").append(request.getEndTime().format(DATETIME_FORMATTER)).append("\n");
            }
            if (request.getIndicators() != null && request.getIndicators().length > 0) {
                additionalContext.append("Requested Indicators: ");
                additionalContext.append(String.join(", ", request.getIndicators())).append("\n");
            }
        }

        return String.format("""
                You are a MySQL expert. Convert the following natural language query to SQL.

                Database Schema:
                %s

                %sNatural Language Query: %s

                Requirements:
                - Only generate SELECT statements (no INSERT, UPDATE, DELETE, DROP, TRUNCATE)
                - Use proper MySQL syntax
                - Include appropriate JOINs if needed
                - Add LIMIT clause to prevent excessive results (default 1000)
                - Always use table aliases for clarity
                - For time-based queries, filter on data_time column

                Generated SQL:
                """, schemaContext, additionalContext.toString(), nlQuery);
    }

    private String parseSqlFromResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode textNode = choices.get(0).get("text");
                if (textNode != null) {
                    String sql = textNode.asText();
                    return sql.trim();
                }
            }
            if (root.has("text")) {
                return root.get("text").asText().trim();
            }
            throw new RuntimeException("Unable to parse SQL from SQLCoder response");
        } catch (Exception e) {
            return response.trim();
        }
    }
}
