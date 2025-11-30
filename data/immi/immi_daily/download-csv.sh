#!/bin/bash
CSV_URL="https://www.immd.gov.hk/opendata/eng/transport/immigration_clearance/statistics_on_daily_passenger_traffic.csv"
curl -L -o data.csv "$CSV_URL"
git config --global user.name "github-actions"
git config --global user.email "github-actions@github.com"
