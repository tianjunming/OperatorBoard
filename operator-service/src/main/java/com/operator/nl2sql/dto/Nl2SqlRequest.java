package com.operator.nl2sql.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Nl2SqlRequest {

    @NotBlank(message = "Natural language query is required")
    private String naturalLanguageQuery;

    private String databaseName;

    private Integer maxResults;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Boolean latest = false;

    private Boolean compare = false;

    private String comparePeriod;

    private String[] indicators;
}
