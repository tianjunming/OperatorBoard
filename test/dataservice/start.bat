@echo off
echo ========================================
echo Data Service Microservice
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo Java not found. Please install JDK 17+
    pause
    exit /b 1
)

echo.
echo Starting MySQL and creating database...
echo (Make sure MySQL is running)
echo.

echo Step 1: Create database and tables...
mysql -u root -p -e "source src/main/resources/schema.sql" 2>nul
if errorlevel 1 (
    echo Warning: Could not execute schema.sql. Please run it manually.
)

echo.
echo Step 2: Building application...
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Starting Data Service on port 8081...
echo Open http://localhost:8081/api/query in your browser
echo.
java -jar target\dataservice-1.0.0.jar

pause
