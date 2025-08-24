#!/bin/bash
echo "Testing Shopify Check Endpoint with CURL..."
echo ""

echo "1. Test without headers:"
curl -X GET "https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check" \
  -H "Content-Type: application/json" \
  --silent | jq '.'

echo ""
echo "2. Test with headers:"
curl -X GET "https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Url: test-store.myshopify.com" \
  -H "X-Shopify-Access-Token: shpat_test_token" \
  --silent | jq '.'
