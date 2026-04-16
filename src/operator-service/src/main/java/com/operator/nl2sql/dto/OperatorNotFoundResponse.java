package com.operator.nl2sql.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorNotFoundResponse {

    private String error;
    private String message;
    private String queriedName;
    private List<String> suggestions;
    private List<String> availableOperators;

    public static OperatorNotFoundResponse of(String queriedName, List<String> availableOperators, List<String> suggestions) {
        return OperatorNotFoundResponse.builder()
                .error("OPERATOR_NOT_FOUND")
                .message("运营商不存在: " + queriedName)
                .queriedName(queriedName)
                .suggestions(suggestions)
                .availableOperators(availableOperators)
                .build();
    }
}
