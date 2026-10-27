#!/bin/bash
cd ~/Desktop/ATL-13-MicroGrants/agent
source venv/bin/activate

# Deploy to Cloud Run WITH THE UI ENABLED!
yes | adk deploy cloud_run . \
  --project $(gcloud config get-value project) \
  --region us-central1 \
  --service_name "anchor-agent-web-ui" \
  --with_ui
