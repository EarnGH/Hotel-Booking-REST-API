#!/bin/bash

BASE_URL="http://localhost:3000"
ADMIN_USERNAME="adminja" # You need to use your admin's username
PASSWORD="admin555" # You need to use your admin's password
DURATION=20

echo "--- Performance Test with Autocannon ---"

# 1. Login to get token
echo "1. Getting Auth Token..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$PASSWORD\"}" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 10 ]; then
    echo "❌ Login Failed. Token empty."
    exit 1
fi
echo "✅ Token acquired."

# 2. Run Autocannon
echo ""
echo "2. Running Autocannon ($DURATION s duration)..."
echo "Target: $BASE_URL/rooms"
echo ""

# Using npx to run autocannon without global install requirement
# -c 100: 100 concurrent connections
# -d 10: 10 seconds duration
npx autocannon -c 100 -d $DURATION -H "Authorization: Bearer $TOKEN" "$BASE_URL/rooms"