package com.operator.nl2sql.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Nl2SqlResponse {

    private String generatedSql;

    private List<Map<String, Object>> results;

    private List<Map<String, Object>> compareResults;

    private int rowCount;

    private long executionTimeMs;

    private String status;

    private String errorMessage;

    private QueryMeta meta;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QueryMeta {
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private LocalDateTime dataTime;
        private Boolean isLatest;
        private Boolean isCompare;
        private String comparePeriod;
        private String[] indicators;
    }

    public static Nl2SqlResponse error(String errorMessage) {
        return Nl2SqlResponse.builder()
                .status("error")
                .errorMessage(errorMessage)
                .build();
    }

    public static Nl2SqlResponse error(String errorMessage, String generatedSql) {
        return Nl2SqlResponse.builder()
                .status("error")
                .errorMessage(errorMessage)
                .generatedSql(generatedSql)
                .build();
    }
}
