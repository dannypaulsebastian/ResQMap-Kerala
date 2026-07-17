#!/bin/bash
curl -X  https://patriot-rocky-gravity.ngrok-free.dev -> http://localhost:8080        /api/sms/webhook \
  --data-urlencode "From=+919876543210" \
  --data-urlencode "Body=REPORT: TRAPPED, KOCHI, NEAR MARINE DRIVE"
