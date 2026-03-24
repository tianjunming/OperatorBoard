package com.operator.nl2sql.service.builder;

/**
 * SQL构建器接口
 */
public interface SqlBuilder {

    /**
     * 构建基础查询SQL
     * @return SQL语句
     */
    String buildSelectSql();

    /**
     * 构建带条件的查询SQL
     * @param condition 条件表达式
     * @return SQL语句
     */
    String buildSelectSql(String condition);

    /**
     * 获取表名
     * @return 表名
     */
    String getTableName();
}