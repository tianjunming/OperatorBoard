@echo off
echo ========================================
echo   OperatorBoard 服务状态检查
echo ========================================
echo.

set NL2SQL_PORT=8081
set AGENT_PORT=8080
set PROXY_PORT=8000
set FRONTEND_PORT=3002

echo 端口占用情况:
echo ----------------
netstat -ano | findstr :%NL2SQL_PORT% | findstr LISTENING
netstat -ano | findstr :%AGENT_PORT% | findstr LISTENING
netstat -ano | findstr :%PROXY_PORT% | findstr LISTENING
netstat -ano | findstr :%FRONTEND_PORT% | findstr LISTENING

echo.
echo 服务健康检查:
echo ----------------

curl -s http://localhost:%NL2SQL_PORT%/api/v1/nl2sql/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] NL2SQL Service  - http://localhost:%NL2SQL_PORT%/api/v1/nl2sql/health
) else (
    echo   [FAIL] NL2SQL Service - http://localhost:%NL2SQL_PORT% (未运行)
)

curl -s http://localhost:%AGENT_PORT%/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Operator Agent  - http://localhost:%AGENT_PORT%/health
) else (
    echo   [FAIL] Operator Agent - http://localhost:%AGENT_PORT% (未运行)
)

curl -s http://localhost:%AGENT_PORT%/api/capabilities >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Agent API       - http://localhost:%AGENT_PORT%/api/capabilities
) else (
    echo   [WARN] Agent API - 可能还在启动中
)

curl -s http://localhost:%PROXY_PORT%/api/agent/capabilities >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] API Proxy       - http://localhost:%PROXY_PORT%/api/agent/capabilities
) else (
    echo   [WARN] API Proxy - 可能还在启动中
)

curl -s http://localhost:%FRONTEND_PORT%/ >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Frontend        - http://localhost:%FRONTEND_PORT%/
) else (
    echo   [WARN] Frontend - 可能还在启动中
)

echo.
echo 进程检查:
echo ----------------
tasklist /FI "IMAGENAME eq java.exe" 2>nul | findstr java.exe >nul
if !errorlevel!==0 (
    echo   [OK] Java 进程运行中
) else (
    echo   [---] 无 Java 进程
)

tasklist /FI "IMAGENAME eq python.exe" 2>nul | findstr python.exe >nul
if !errorlevel!==0 (
    echo   [OK] Python 进程运行中
) else (
    echo   [---] 无 Python 进程
)

tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr node.exe >nul
if !errorlevel!==0 (
    echo   [OK] Node.js 进程运行中
) else (
    echo   [---] 无 Node.js 进程
)

echo.
echo ========================================
echo   日志文件位置: logs\
echo ========================================
echo.
pause
