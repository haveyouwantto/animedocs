#!/bin/bash
pip install mkdocs mkdocs-material mkdocs-rss-plugin
python3 ordergen.py
mkdocs build