@echo off
echo ========================================
echo   OperatorBoard 停止所有服务
echo ========================================
echo.

:: 停止所有相关进程
echo [1/3] 停止 Node.js 进程...
taskkill /F /IM node.exe 2>nul
if !errorlevel!==0 (
    echo   [OK] Node.js 进程已停止
) else (
    echo   [OK] 无运行中的 Node.js 进程
)

echo.
echo [2/3] 停止 Python 进程...
taskkill /F /IM python.exe 2>nul
if !errorlevel!==0 (
    echo   [OK] Python 进程已停止
) else (
    echo   [OK] 无运行中的 Python 进程
)

echo.
echo [3/3] 停止 Java 进程...
taskkill /F /IM java.exe 2>nul
if !errorlevel!==0 (
    echo   [OK] Java 进程已停止
) else (
    echo   [OK] 无运行中的 Java 进程
)

echo.
echo ========================================
echo   所有服务已停止
echo ========================================
echo.
echo 按任意键退出...
pause >nul
