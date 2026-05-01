#!/usr/bin/env python3
"""
权限控制数据表迁移脚本

执行 auth-agent 的数据库迁移:
- V1: 角色继承 (auth_role.parent_id)
- V2: 数据范围 (auth_data_scope 等)
- V3: 审计日志 (auth_audit_log)
"""

import os
import sys

# Add src path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'auth-agent', 'src'))

from auth_agent.api.auth import load_config
from auth_agent.api.schemas import Database


class MigrationRunner:
    """数据库迁移执行器"""

    MIGRATIONS = [
        ('V1__add_role_inheritance', '角色继承支持'),
        ('V2__add_data_scope', '数据范围支持'),
        ('V3__add_audit_log', '审计日志'),
    ]

    def __init__(self):
        self.config = load_config()
        self.db = Database(self.config)
        self.migration_table = 'schema_migrations'

    def ensure_migration_table(self):
        """确保迁移记录表存在"""
        from sqlalchemy import text
        conn = self.db.engine.connect()
        sql = text(f"""
        CREATE TABLE IF NOT EXISTS {self.migration_table} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(50) NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute(sql)
        conn.commit()
        conn.close()

    def is_applied(self, version: str) -> bool:
        """检查迁移是否已应用"""
        from sqlalchemy import text
        conn = self.db.engine.connect()
        sql = text(f"SELECT 1 FROM {self.migration_table} WHERE version = :version")
        result = conn.execute(sql, {"version": version})
        exists = result.fetchone() is not None
        conn.close()
        return exists

    def mark_applied(self, version: str):
        """标记迁移已应用"""
        from sqlalchemy import text
        conn = self.db.engine.connect()
        sql = text(f"INSERT INTO {self.migration_table} (version) VALUES (:version)")
        conn.execute(sql, {"version": version})
        conn.commit()
        conn.close()

    def get_executed_migrations(self):
        """获取已执行的迁移列表"""
        from sqlalchemy import text
        conn = self.db.engine.connect()
        sql = text(f"SELECT version FROM {self.migration_table} ORDER BY applied_at")
        result = conn.execute(sql)
        versions = [row[0] for row in result.fetchall()]
        conn.close()
        return versions

    def run(self):
        """执行所有未应用的迁移"""
        print("=" * 60)
        print("权限控制数据表迁移")
        print("=" * 60)

        # 确保迁移记录表存在
        self.ensure_migration_table()

        migrations_dir = os.path.dirname(__file__)
        applied = []

        for version, description in self.MIGRATIONS:
            if self.is_applied(version):
                print(f"\n[SKIP] {version} - {description} (已应用)")
                continue

            sql_file = os.path.join(migrations_dir, f"{version}.sql")
            if not os.path.exists(sql_file):
                print(f"\n[WARN] {version} - {description} (文件不存在: {sql_file})")
                continue

            print(f"\n[APPLY] {version} - {description}")
            print("-" * 40)

            try:
                # 读取 SQL 文件
                with open(sql_file, 'r', encoding='utf-8') as f:
                    sql_content = f.read()

                # 执行 SQL - 分割并逐条执行
                from sqlalchemy import text
                conn = self.db.engine.connect()
                conn.execute(text("SET sql_mode = ''"))  # 允许无主键

                # 分割 SQL 语句
                statements = []
                current = []
                for line in sql_content.split('\n'):
                    stripped = line.strip()
                    if stripped.startswith('--'):
                        continue
                    # 如果有分号，说明是语句结束
                    if ';' in stripped:
                        # 分割分号前的内容
                        parts = stripped.split(';')
                        for i, part in enumerate(parts):
                            part = part.strip()
                            if part:
                                if i == 0:
                                    # 第一部分，加入当前累积的行
                                    current.append(part)
                                    statements.append('\n'.join(current))
                                    current = []
                                else:
                                    # 后续部分是独立的语句
                                    statements.append(part)
                    else:
                        current.append(stripped)
                # 处理剩余未完成的语句
                if current:
                    stmt = '\n'.join(current).strip()
                    if stmt:
                        statements.append(stmt)

                for statement in statements:
                    if statement:
                        print(f"  SQL: {statement[:60]}...")
                        try:
                            conn.execute(text(statement))
                        except Exception as sql_err:
                            print(f"  Warning: {sql_err}")
                conn.commit()
                conn.close()

                # 标记已应用
                self.mark_applied(version)
                applied.append(version)
                print(f"[OK] {version} 已完成")

            except Exception as e:
                print(f"[ERROR] {version} 失败: {e}")
                return False

        print("\n" + "=" * 60)
        if applied:
            print(f"成功应用 {len(applied)} 个迁移: {', '.join(applied)}")
        else:
            print("没有新迁移需要应用")
        print("=" * 60)

        return True


if __name__ == '__main__':
    runner = MigrationRunner()
    success = runner.run()
    sys.exit(0 if success else 1)