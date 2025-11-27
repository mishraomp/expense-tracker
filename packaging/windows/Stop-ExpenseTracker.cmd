@echo off
REM Expense Tracker - Stop All Services
REM Run as Administrator

echo Stopping Expense Tracker services...

net stop ExpenseTrackerAPI 2>nul
net stop ExpenseTrackerKeycloak 2>nul
net stop ExpenseTrackerPostgres 2>nul

echo.
echo All services stopped.
pause
