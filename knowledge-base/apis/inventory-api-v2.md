# Inventory API v2

**Version:** 2.0
**Status:** Current
**Released:** 2024-06-01

## Overview

Inventory API v2 adds OAuth 2.0, stock-location details, and event IDs for traceability.

## Authentication

OAuth 2.0 bearer tokens are required. API key-only requests are no longer accepted.

## Stock Endpoint

`GET /v2/inventory/{sku}` replaces `GET /v1/stock/{sku}` and returns quantity, warehouseId, locationBreakdown, and eventId.

## Migration Actions

Update endpoint URLs, obtain OAuth credentials, update response parsers, and test warehouse integrations before the v1 retirement date.
