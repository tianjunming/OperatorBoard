package com.operator.nl2sql.service;

import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SqlExecutorService {

    private final SqlSessionFactory sqlSessionFactory;

    public SqlExecutorService(SqlSessionFactory sqlSessionFactory) {
        this.sqlSessionFactory = sqlSessionFactory;
    }

    public List<Map<String, Object>> execute(String sql, Integer maxResults) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            String finalSql;
            if (maxResults != null && maxResults > 0) {
                finalSql = sql + " LIMIT " + maxResults;
            } else {
                finalSql = sql + " LIMIT 1000";
            }
            return session.selectList("nl2sql.executeRaw", finalSql);
        }
    }

    public List<Map<String, Object>> executeWithDefaultLimit(String sql) {
        return execute(sql, 1000);
    }
}
