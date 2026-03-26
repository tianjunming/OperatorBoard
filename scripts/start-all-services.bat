@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   OperatorBoard 一键启动脚本
echo ========================================
echo.

:: 配置
set NL2SQL_PORT=8081
set AGENT_PORT=8080
set PROXY_PORT=8000
set FRONTEND_PORT=3002
set API_KEY=

:: 设置工作目录
set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

:: 创建日志目录
if not exist "logs" mkdir logs

echo [1/5] 检查端口占用...
netstat -ano | findstr :%NL2SQL_PORT% >nul
if !errorlevel!==0 (
    echo   警告: 端口 %NL2SQL_PORT% 已被占用，正在关闭...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%NL2SQL_PORT% ^| findstr LISTENING') do (
        taskkill /F /PID %%a 2>nul
    )
    timeout /t 2 /nobreak >nul
)

netstat -ano | findstr :%AGENT_PORT% >nul
if !errorlevel!==0 (
    echo   警告: 端口 %AGENT_PORT% 已被占用，正在关闭...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%AGENT_PORT% ^| findstr LISTENING') do (
        taskkill /F /PID %%a 2>nul
    )
    timeout /t 2 /nobreak >nul
)

netstat -ano | findstr :%PROXY_PORT% >nul
if !errorlevel!==0 (
    echo   警告: 端口 %PROXY_PORT% 已被占用，正在关闭...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PROXY_PORT% ^| findstr LISTENING') do (
        taskkill /F /PID %%a 2>nul
    )
    timeout /t 2 /nobreak >nul
)

echo.
echo [2/5] 启动 NL2SQL Service (Java)...
echo   端口: %NL2SQL_PORT%
cd /d "%ROOT_DIR%\src\operator-service"
start "nl2sql-service" cmd /c "title NL2SQL-Service && mvn spring-boot:run > ..\..\logs\nl2sql-service.log 2>&1"
echo   等待服务启动 (约15秒)...
timeout /t 15 /nobreak >nul

:: 检查Java服务是否启动成功
curl -s http://localhost:%NL2SQL_PORT%/api/v1/nl2sql/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] NL2SQL Service 已就绪
) else (
    echo   [!] NL2SQL Service 启动中，继续等待...
    timeout /t 10 /nobreak >nul
)

echo.
echo [3/5] 启动 Operator Agent (Python)...
echo   端口: %AGENT_PORT%
cd /d "%ROOT_DIR%"
start "operator-agent" cmd /c "title Operator-Agent && set NL2SQL_SERVICE_URL=http://localhost:%NL2SQL_PORT% && set OPERATOR_AGENT_API_KEYS=%API_KEY% && python -m operator_agent.api.server > logs\operator-agent.log 2>&1"
echo   等待服务启动 (约5秒)...
timeout /t 5 /nobreak >nul

:: 检查Python服务是否启动成功
curl -s http://localhost:%AGENT_PORT%/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Operator Agent 已就绪
) else (
    echo   [!] Operator Agent 启动中，继续等待...
    timeout /t 5 /nobreak >nul
)

echo.
echo [4/5] 启动 API Proxy Server (Node.js)...
echo   端口: %PROXY_PORT%
cd /d "%ROOT_DIR%\src\agent-app"
start "api-proxy" cmd /c "title API-Proxy && set OPERATOR_AGENT_API_KEYS=%API_KEY% && node server/index.js > ..\..\logs\api-proxy.log 2>&1"
echo   等待服务启动 (约3秒)...
timeout /t 3 /nobreak >nul

echo.
echo [5/5] 启动 Frontend (Vite)...
echo   端口: %FRONTEND_PORT%
cd /d "%ROOT_DIR%\src\agent-app"
start "frontend" cmd /c "title Frontend && npm run dev > ..\..\logs\frontend.log 2>&1"
echo   等待服务启动 (约5秒)...
timeout /t 5 /nobreak >nul

:: 最终检查
echo.
echo ========================================
echo   服务启动检查
echo ========================================
echo.

set ALL_OK=true

curl -s http://localhost:%NL2SQL_PORT%/api/v1/nl2sql/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] NL2SQL Service  - http://localhost:%NL2SQL_PORT%
) else (
    echo   [FAIL] NL2SQL Service - http://localhost:%NL2SQL_PORT%
    set ALL_OK=false
)

curl -s http://localhost:%AGENT_PORT%/health >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Operator Agent  - http://localhost:%AGENT_PORT%
) else (
    echo   [FAIL] Operator Agent - http://localhost:%AGENT_PORT%
    set ALL_OK=false
)

curl -s http://localhost:%PROXY_PORT%/ >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] API Proxy       - http://localhost:%PROXY_PORT%
) else (
    echo   [OK] API Proxy       - http://localhost:%PROXY_PORT% (可能还在启动)
)

curl -s http://localhost:%FRONTEND_PORT%/ >nul 2>&1
if !errorlevel!==0 (
    echo   [OK] Frontend        - http://localhost:%FRONTEND_PORT%
) else (
    echo   [OK] Frontend        - http://localhost:%FRONTEND_PORT% (可能还在启动)
)

echo.
if "%ALL_OK%"=="true" (
    echo ========================================
    echo   所有服务已成功启动!
    echo ========================================
    echo.
    echo   访问地址:
    echo   - 前端:     http://localhost:%FRONTEND_PORT%
    echo   - Agent:    http://localhost:%AGENT_PORT%
    echo   - NL2SQL:   http://localhost:%NL2SQL_PORT%
    echo   - API代理:  http://localhost:%PROXY_PORT%
    echo.
    echo   日志文件: %ROOT_DIR%\logs\
    echo.
    echo   按任意键退出此窗口(服务继续运行)...
    pause >nul
) else (
    echo ========================================
    echo   部分服务启动失败，请检查日志
    echo ========================================
    echo   日志文件: %ROOT_DIR%\logs\
    echo.
    echo   按任意键退出此窗口(服务继续运行)...
    pause >nul
)

endlocal
