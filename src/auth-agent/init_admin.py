#!/usr/bin/env python3
"""
初始化 auth-agent 管理员用户

使用方法:
    python init_admin.py [username] [password]

示例:
    python init_admin.py admin admin123
"""
import pymysql
from datetime import datetime
import bcrypt
import sys

def create_admin_user(username='admin', password='admin123'):
    """创建管理员用户"""
    # 连接数据库
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='test',
        database='operator_db'
    )
    cursor = conn.cursor()
    
    # 生成密码哈希
    salt = bcrypt.gensalt(rounds=12)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    now = datetime.now()
    
    try:
        # 检查用户是否存在
        cursor.execute('SELECT id FROM auth_user WHERE username = %s', (username,))
        existing = cursor.fetchone()
        
        if existing:
            # 更新密码
            sql = 'UPDATE auth_user SET password_hash = %s, updated_at = %s WHERE username = %s'
            cursor.execute(sql, (password_hash, now, username))
            print(f'✓ 用户 {username} 密码已更新')
        else:
            # 创建新用户
            sql = '''
            INSERT INTO auth_user (username, password_hash, email, full_name, is_active, is_superuser, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            '''
            cursor.execute(sql, (
                username,
                password_hash,
                f'{username}@example.com',
                'Administrator',
                True,
                True,
                now,
                now
            ))
            print(f'✓ 用户 {username} 已创建')
        
        conn.commit()
        
        # 验证
        cursor.execute('SELECT id, username, is_superuser FROM auth_user WHERE username = %s', (username,))
        user = cursor.fetchone()
        print(f'✓ 验证成功: ID={user[0]}, 用户名={user[1]}, 超级用户={user[2]}')
        
    except Exception as e:
        print(f'✗ 错误: {e}')
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    username = sys.argv[1] if len(sys.argv) > 1 else 'admin'
    password = sys.argv[2] if len(sys.argv) > 2 else 'admin123'
    create_admin_user(username, password)
