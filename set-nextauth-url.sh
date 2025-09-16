#!/bin/bash

# Run this script to manually set the NEXTAUTH_URL secret in your Cloudflare Worker
# Make sure you're in the apps/dashboard directory

echo "Setting NEXTAUTH_URL secret..."
echo "https://files.uzair.me" | npx wrangler secret put NEXTAUTH_URL

echo "NEXTAUTH_URL secret has been set successfully!"