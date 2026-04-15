#!/bin/bash

BASE_URL="http://localhost:3000"
USERNAME="john_doe"
PASSWORD="password123"
DURATION=20

echo "--- Booking Endpoint Performance Test ---"

echo "1. Logging in to get JWT token..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 10 ]; then
    echo "Login failed. Token empty."
    exit 1
fi

echo "2. Testing rate-limited endpoint: GET /bookings"
npx autocannon -c 20 -d $DURATION \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/bookings"