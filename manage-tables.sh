#!/bin/bash
# 数据库表管理工具

cd /workspaces/XIAOICE/backend
python3 database.py ${1:-create}
