@echo off
cd /d d:\develop\OperatorBoard\src\operator-agent
set PYTHONPATH=src
python -m operator_agent.api.server
pause
