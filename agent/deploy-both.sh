#!/bin/bash
set -e
cd ~/Desktop/ATL-13-MicroGrants/agent
source venv/bin/activate

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

echo "=== 1. Deploying Headless API ==="
yes | adk deploy cloud_run . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service_name "anchor-agent-api"

echo "=== 2. Binding Secrets to Headless API ==="
gcloud run services update anchor-agent-api \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,SERVICE_ACCOUNT_JSON=SERVICE_ACCOUNT_JSON:latest"

echo "=== 3. Deploying Web UI ==="
yes | adk deploy cloud_run . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service_name "anchor-agent-web-ui" \
  --with_ui

echo "=== 4. Binding Secrets to Web UI ==="
gcloud run services update anchor-agent-web-ui \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,SERVICE_ACCOUNT_JSON=SERVICE_ACCOUNT_JSON:latest"

echo "=== Deployment Complete! ==="
