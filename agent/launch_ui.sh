#!/bin/bash
source venv/bin/activate
export PYTHONPATH=$PWD/venv/lib/python3.14/site-packages
adk web .
