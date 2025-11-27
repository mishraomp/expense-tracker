@echo off
REM Expense Tracker - Start All Services
REM Run as Administrator

echo Starting Expense Tracker services...

net start ExpenseTrackerPostgres
timeout /t 5 /nobreak > nul

net start ExpenseTrackerKeycloak
timeout /t 10 /nobreak > nul

net start ExpenseTrackerAPI
timeout /t 3 /nobreak > nul

echo.
echo All services started.
echo.
echo Access the application at:
echo   Application: http://localhost:3000
echo   Keycloak:    http://localhost:8080
echo.
pause
