#!/bin/bash

# ITCS258 Hotel Booking API - Performance Testing Script
# Tests: Caching, Rate Limiting, and Latency

set -e

API_URL="http://localhost:3000"
RESULTS_FILE="performance-results.txt"
TEST_USERNAME="perftest_$(date +%s)"
TEST_EMAIL="perftest_$(date +%s)@test.com"
TEST_PASSWORD="TestPass123!"

echo "=========================================="
echo "ITCS258 Performance Testing Script"
echo "=========================================="
echo ""

# Check if API is running
echo "[1/5] Checking if API is running..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "❌ API is not running at $API_URL"
    echo "Please start the application first:"
    echo "  cd app && npm run start:dev"
    echo "  OR"
    echo "  cd infra && docker-compose up"
    exit 1
fi
echo "✅ API is running"
echo ""

# Initialize results file
> "$RESULTS_FILE"
echo "Performance Test Results - $(date)" >> "$RESULTS_FILE"
echo "=======================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Test 1: Create test account
echo "[2/5] Creating test account..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\":\"$TEST_USERNAME\",
    \"email\":\"$TEST_EMAIL\",
    \"full_name\":\"Performance Test User\",
    \"password\":\"$TEST_PASSWORD\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q '"id"'; then
    echo "✅ Test account created"
else
    echo "❌ Failed to create test account"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Login and get token
echo "[3/5] Logging in to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\":\"$TEST_USERNAME\",
    \"password\":\"$TEST_PASSWORD\"
  }")

AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Failed to get auth token"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo "✅ Auth token obtained"
echo ""

# Test 3: Caching Performance
echo "[4/5] Testing Caching Performance..."
echo "" >> "$RESULTS_FILE"
echo "3. CACHING PERFORMANCE TEST" >> "$RESULTS_FILE"
echo "---" >> "$RESULTS_FILE"

FIRST_CALL_START=$(date +%s%N)
FIRST_RESPONSE=$(curl -s -w "\n%{time_total}" "$API_URL/rooms" \
  -H "Authorization: Bearer $AUTH_TOKEN")
FIRST_CALL_END=$(date +%s%N)

FIRST_TIME=$(echo "$FIRST_RESPONSE" | tail -1)
FIRST_TIME_MS=$(printf "%.2f" $(echo "$FIRST_TIME" | awk '{print $1 * 1000}'))

sleep 1

SECOND_CALL_START=$(date +%s%N)
SECOND_RESPONSE=$(curl -s -w "\n%{time_total}" "$API_URL/rooms" \
  -H "Authorization: Bearer $AUTH_TOKEN")
SECOND_CALL_END=$(date +%s%N)

SECOND_TIME=$(echo "$SECOND_RESPONSE" | tail -1)
SECOND_TIME_MS=$(printf "%.2f" $(echo "$SECOND_TIME" | awk '{print $1 * 1000}'))

IMPROVEMENT=$(echo "$FIRST_TIME $SECOND_TIME" | awk '{printf "%.2f", (($1 - $2) / $1) * 100}')

echo "First call (uncached): ${FIRST_TIME_MS}ms" | tee -a "$RESULTS_FILE"
echo "Second call (cached): ${SECOND_TIME_MS}ms" | tee -a "$RESULTS_FILE"
echo "Improvement: ${IMPROVEMENT}%" | tee -a "$RESULTS_FILE"

if (( $(echo "$SECOND_TIME < $FIRST_TIME" | awk '{printf ($2 < $4 ? 1 : 0)}') )); then
    echo "✅ Caching is working" | tee -a "$RESULTS_FILE"
else
    echo "⚠️  Cache may not be optimized" | tee -a "$RESULTS_FILE"
fi
echo ""

# Test 4: Rate Limiting
echo "[5/5] Testing Rate Limiting..."
echo "" >> "$RESULTS_FILE"
echo "4. RATE LIMITING TEST" >> "$RESULTS_FILE"
echo "---" >> "$RESULTS_FILE"
echo "Testing registration rate limit (3 per 5 minutes)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

RATE_LIMIT_RESULTS=""
for i in {1..5}; do
    REGISTER_TEST=$(curl -s -X POST "$API_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\":\"ratelimit_test_${i}_$(date +%s)\",
        \"email\":\"ratelimit_${i}_$(date +%s)@test.com\",
        \"full_name\":\"Rate Limit Test\",
        \"password\":\"$TEST_PASSWORD\"
      }" -w "\n%{http_code}")

    HTTP_CODE=$(echo "$REGISTER_TEST" | tail -1)
    BODY=$(echo "$REGISTER_TEST" | head -n -1)

    if [ "$HTTP_CODE" = "201" ]; then
        STATUS="✅ Created (201)"
    elif [ "$HTTP_CODE" = "429" ]; then
        STATUS="⏱️  Rate Limited (429)"
    else
        STATUS="❌ Error ($HTTP_CODE)"
    fi

    echo "Request $i: $STATUS" | tee -a "$RESULTS_FILE"
    RATE_LIMIT_RESULTS="$RATE_LIMIT_RESULTS\nRequest $i: HTTP $HTTP_CODE"

    if [ $i -lt 5 ]; then
        sleep 1
    fi
done

echo "" >> "$RESULTS_FILE"
echo "Testing login rate limit (5 per 1 minute)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

for i in {1..7}; do
    LOGIN_TEST=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\":\"$TEST_USERNAME\",
        \"password\":\"wrongpassword\"
      }" -w "\n%{http_code}")

    HTTP_CODE=$(echo "$LOGIN_TEST" | tail -1)

    if [ "$HTTP_CODE" = "401" ]; then
        STATUS="✅ Unauthorized (401)"
    elif [ "$HTTP_CODE" = "429" ]; then
        STATUS="⏱️  Rate Limited (429)"
    else
        STATUS="❌ Error ($HTTP_CODE)"
    fi

    echo "Request $i: $STATUS" | tee -a "$RESULTS_FILE"

    if [ $i -lt 7 ]; then
        sleep 1
    fi
done

echo "" >> "$RESULTS_FILE"

# Summary
echo ""
echo "=========================================="
echo "✅ Performance Testing Complete!"
echo "=========================================="
echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "Summary:"
echo "--------"
echo "Caching:       First=${FIRST_TIME_MS}ms, Cached=${SECOND_TIME_MS}ms, Improvement=${IMPROVEMENT}%"
echo "Rate Limiting: Check $RESULTS_FILE for detailed results"
echo ""
echo "Next steps:"
echo "1. Review the results in $RESULTS_FILE"
echo "2. Send these results back to update REQUIREMENTS_CHECKLIST.md"
echo ""
