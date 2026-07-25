# Inventory API v1

**Version:** 1.0
**Status:** Deprecated
**Last Updated:** 2024-03-01

## Overview

Inventory API v1 lets warehouse applications view stock and reserve items using an API key.

## Authentication

Send an API key in the Authorization header for every request.

## Stock Endpoint

`GET /v1/stock/{sku}` returns quantity, warehouseId, and lastUpdated.

## Deprecation Notice

Inventory API v1 will be retired on 2024-09-30. Integrations must move to v2 before that date.
