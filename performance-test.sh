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

if [ "$(echo "$SECOND_TIME $FIRST_TIME" | awk '{print ($1 < $2)}')" = "1" ]; then
    echo "✅ Caching is working" | tee -a "$RESULTS_FILE"
else
    echo "⚠️  Cached response was not faster (may vary in local Docker)" | tee -a "$RESULTS_FILE"
fi
echo ""

# Test 4: Rate Limiting
echo "[5/5] Testing Rate Limiting..."
echo "" >> "$RESULTS_FILE"
echo "4. RATE LIMITING TEST" >> "$RESULTS_FILE"
echo "---" >> "$RESULTS_FILE"
echo "Testing registration rate limit (100 per 30 seconds)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Create temp directory for collecting results
TMPDIR=$(mktemp -d)

# Send 105 registration requests concurrently to exceed the 100/30s limit
echo "Sending 105 concurrent registration requests..."
for i in $(seq 1 105); do
    (
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/register" \
          -H "Content-Type: application/json" \
          -d "{
            \"username\":\"ratelimit_test_${i}_$(date +%s%N)\",
            \"email\":\"ratelimit_${i}_$(date +%s%N)@test.com\",
            \"full_name\":\"Rate Limit Test\",
            \"password\":\"$TEST_PASSWORD\"
          }")
        echo "$HTTP_CODE" > "$TMPDIR/reg_$i"
    ) &
done
wait

CREATED_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0

for i in $(seq 1 105); do
    HTTP_CODE=$(cat "$TMPDIR/reg_$i" 2>/dev/null)
    if [ "$HTTP_CODE" = "201" ]; then
        CREATED_COUNT=$((CREATED_COUNT + 1))
    elif [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done

echo "Registration results:" | tee -a "$RESULTS_FILE"
echo "  ✅ Created (201): $CREATED_COUNT requests" | tee -a "$RESULTS_FILE"
echo "  ⏱️  Rate Limited (429): $RATE_LIMITED_COUNT requests" | tee -a "$RESULTS_FILE"
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "  ❌ Errors: $ERROR_COUNT requests" | tee -a "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

echo "" >> "$RESULTS_FILE"
echo "Testing login rate limit (100 per 30 seconds)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Send 105 login requests concurrently to exceed the 100/30s limit
echo "Sending 105 concurrent login requests..."
for i in $(seq 1 105); do
    (
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
          -H "Content-Type: application/json" \
          -d "{
            \"username\":\"$TEST_USERNAME\",
            \"password\":\"wrongpassword\"
          }")
        echo "$HTTP_CODE" > "$TMPDIR/login_$i"
    ) &
done
wait

UNAUTH_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0

for i in $(seq 1 105); do
    HTTP_CODE=$(cat "$TMPDIR/login_$i" 2>/dev/null)
    if [ "$HTTP_CODE" = "401" ]; then
        UNAUTH_COUNT=$((UNAUTH_COUNT + 1))
    elif [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done

echo "Login results:" | tee -a "$RESULTS_FILE"
echo "  ✅ Unauthorized (401): $UNAUTH_COUNT requests" | tee -a "$RESULTS_FILE"
echo "  ⏱️  Rate Limited (429): $RATE_LIMITED_COUNT requests" | tee -a "$RESULTS_FILE"
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "  ❌ Errors: $ERROR_COUNT requests" | tee -a "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Clean up temp directory
rm -rf "$TMPDIR"

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
