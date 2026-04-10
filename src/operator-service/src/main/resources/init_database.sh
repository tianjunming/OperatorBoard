#!/bin/bash
# ============================================================================
# 全球运营商数据初始化脚本
# 使用方法: mysql -u root -p < init_global_data.sh
# ============================================================================

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "初始化 OperatorBoard 全球运营商数据"
echo "============================================"

# 1. 加载 auth_schema
echo "[1/5] 加载权限管理表..."
SOURCE "${SCRIPT_DIR}/auth_schema.sql"

# 2. 加载 chat_schema
echo "[2/5] 加载聊天历史表..."
SOURCE "${SCRIPT_DIR}/chat_schema.sql"

# 3. 加载 schema (包含 operator_info)
echo "[3/5] 加载数据库结构..."
SOURCE "${SCRIPT_DIR}/schema.sql"

# 4. 加载全球运营商测试数据 (站点和指标)
echo "[4/5] 加载全球运营商站点和指标数据..."
SOURCE "${SCRIPT_DIR}/generated_test_data.sql"

# 5. 验证数据
echo "[5/5] 验证数据..."
mysql -u root -p -e "
SELECT '运营商数据汇总:' AS '';
SELECT region AS '区域', COUNT(*) AS '运营商数量' FROM operator_info GROUP BY region ORDER BY region;
SELECT '总计:' AS '', COUNT(*) FROM operator_info;
SELECT '站点数据:' AS '', COUNT(*) AS '记录数' FROM site_info;
SELECT '指标数据:' AS '', COUNT(*) AS '记录数' FROM indicator_info;
"

echo "============================================"
echo "初始化完成!"
echo "============================================"
