package com.operator.nl2sql.migration;

import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

/**
 * V4 Migration Runner - 填充 Summary 表空值
 * 使用方法: mvn exec:java -Dexec.mainClass="com.operator.nl2sql.migration.RunV4Migration" -q
 */
public class RunV4Migration {

    private static final String DB_URL = "jdbc:mysql://localhost:3306/operator_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String DB_USER = "test";
    private static final String DB_PASSWORD = "test";

    public static void main(String[] args) {
        String sqlFile = "src/main/resources/migration/V4__fill_empty_values_in_summary_tables.sql";

        System.out.println("=== V4 Migration: 填充 Summary 表空值 ===");

        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD)) {
            String sql = readSqlFile(sqlFile);
            String[] statements = sql.split(";");

            int executed = 0;
            for (String stmt : statements) {
                String trimmed = stmt.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("--") || trimmed.startsWith("SET FOREIGN_KEY_CHECKS")
                        || trimmed.startsWith("SELECT") && trimmed.contains("AS") || trimmed.contains("--")) {
                    // Skip comments and meta statements
                    if (trimmed.contains("UPDATE")) {
                        try (Statement st = conn.createStatement()) {
                            st.executeUpdate(trimmed);
                            executed++;
                            System.out.println("  执行: " + trimmed.substring(0, Math.min(60, trimmed.length())) + "...");
                        }
                    }
                    continue;
                }
                if (trimmed.startsWith("SELECT") && trimmed.contains("FROM indicator_summary")) {
                    // Skip SELECT statements (verification)
                    continue;
                }
                if (trimmed.startsWith("SELECT") && trimmed.contains("AS")) {
                    try (Statement st = conn.createStatement()) {
                        var rs = st.executeQuery(trimmed);
                        while (rs.next()) {
                            System.out.println("  结果: " + rs.getString(1));
                        }
                    }
                    continue;
                }
            }

            System.out.println("\n=== V4 Migration 完成 ===");
            System.out.println("执行了 " + executed + " 条 UPDATE 语句");

            // Verify results
            verifyResults(conn);

        } catch (Exception e) {
            System.err.println("Migration 失败: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static String readSqlFile(String path) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString();
    }

    private static void verifyResults(Connection conn) throws Exception {
        System.out.println("\n=== 验证填充结果 ===");

        String[] fields = {
            "lte_avg_dl_rate", "lte_avg_ul_rate", "nr_avg_dl_rate", "nr_avg_ul_rate",
            "traffic_ratio", "duration_campratio"
        };

        try (Statement st = conn.createStatement()) {
            for (String field : fields) {
                String sql = "SELECT COUNT(*) FROM indicator_summary WHERE " + field + " IS NULL";
                var rs = st.executeQuery(sql);
                rs.next();
                int nullCount = rs.getInt(1);
                System.out.println("  " + field + ": " + (nullCount == 0 ? "✓ 已填充" : "⚠ 还有 " + nullCount + " 条空值"));
            }
        }
    }
}