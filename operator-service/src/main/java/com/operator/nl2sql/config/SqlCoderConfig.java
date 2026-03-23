package com.operator.nl2sql.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Map;

@Configuration
public class SqlCoderConfig {

    @Value("${nl2sql.sqlcoder.url}")
    private String sqlCoderUrl;

    @Value("${nl2sql.sqlcoder.timeout:60}")
    private int timeout;

    @Value("${nl2sql.security.max-result-rows:1000}")
    private int maxResultRows;

    @Value("${nl2sql.security.allow-destructive-queries:false}")
    private boolean allowDestructiveQueries;

    public String getSqlCoderUrl() {
        return sqlCoderUrl;
    }

    public int getTimeout() {
        return timeout;
    }

    public int getMaxResultRows() {
        return maxResultRows;
    }

    public boolean isAllowDestructiveQueries() {
        return allowDestructiveQueries;
    }

    @PostConstruct
    public void init() {
        System.out.println("SQLCoder URL: " + sqlCoderUrl);
        System.out.println("Max Result Rows: " + maxResultRows);
    }
}
