@echo off
title Family Firewall
cd /d "%~dp0"
echo Starting Family Firewall...
start "" "http://localhost:5173"
call npm.cmd run dev
pause
