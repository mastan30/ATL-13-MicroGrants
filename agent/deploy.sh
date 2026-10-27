#!/bin/bash
cd ~/Desktop/ATL-13-MicroGrants/agent
source venv/bin/activate

# Use the ADK deploy script, passing the env vars to trigger the build
yes | adk deploy cloud_run . \
  --project $(gcloud config get-value project) \
  --region us-central1 \
  --service_name "anchor-agent-api"
