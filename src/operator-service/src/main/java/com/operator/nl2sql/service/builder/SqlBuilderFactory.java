package com.operator.nl2sql.service.builder;

import org.springframework.stereotype.Component;

/**
 * SQL构建器工厂
 * 统一管理所有SQL构建器
 */
@Component
public class SqlBuilderFactory {

    private final IndicatorSqlBuilder indicatorSqlBuilder;
    private final OperatorSqlBuilder operatorSqlBuilder;

    public SqlBuilderFactory(
            IndicatorSqlBuilder indicatorSqlBuilder,
            OperatorSqlBuilder operatorSqlBuilder) {
        this.indicatorSqlBuilder = indicatorSqlBuilder;
        this.operatorSqlBuilder = operatorSqlBuilder;
    }

    public IndicatorSqlBuilder getIndicatorSqlBuilder() {
        return indicatorSqlBuilder;
    }

    public OperatorSqlBuilder getOperatorSqlBuilder() {
        return operatorSqlBuilder;
    }
}