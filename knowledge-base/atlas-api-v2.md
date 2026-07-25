# Atlas API v2 Documentation

**Version:** 2.0  
**Status:** Current (Recommended)  
**Released:** 2024-02-01  
**Sunset of v1:** 2024-06-30

## Overview

Atlas API v2 introduces OAuth 2.0 authentication, improved endpoint structure, and enhanced response metadata. This version is fully backward-incompatible with v1; see the [Migration Guide](#migration-guide) below.

## Authentication

### Dual Authentication Support

Atlas API v2 requires **both** API key and OAuth 2.0 token for enhanced security:

#### Option 1: OAuth 2.0 (Recommended)

```bash
curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  https://api.atlas.internal/v2/users
```

Obtain tokens via:
```
POST https://auth.atlas.internal/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET
```

#### Option 2: API Key + OAuth (Legacy Compatibility)

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-OAuth-Token: YOUR_OAUTH_TOKEN" \
  https://api.atlas.internal/v2/users
```

**Note:** API key-only requests are no longer supported.

## Base URL

```
https://api.atlas.internal/v2
```

## Endpoints

### 1. List Users

**Endpoint:** `GET /users`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Max results (default: 20, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |
| `department` | string | No | Filter by department |

**Response:**
```json
{
  "users": [
    {
      "id": "usr_001",
      "email": "alice@company.com",
      "name": "Alice Johnson",
      "department": "Engineering",
      "role": "Senior Engineer",
      "createdAt": "2023-06-15T10:30:00Z",
      "requestId": "req_abc123xyz",
      "timestamp": "2024-02-01T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "requestId": "req_abc123xyz",
  "timestamp": "2024-02-01T12:00:00Z"
}
```

**New Fields (v2):**
- `requestId` – Unique request identifier for debugging
- `timestamp` – Server timestamp of response

---

### 2. Get User Details

**Endpoint:** `GET /users/{userId}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (e.g., `usr_001`) |

**Response:**
```json
{
  "id": "usr_001",
  "email": "alice@company.com",
  "name": "Alice Johnson",
  "department": "Engineering",
  "role": "Senior Engineer",
  "manager": "usr_002",
  "createdAt": "2023-06-15T10:30:00Z",
  "lastLogin": "2024-01-14T14:22:00Z",
  "requestId": "req_abc123xyz",
  "timestamp": "2024-02-01T12:00:00Z"
}
```

**Deprecated Fields (removed from v1):**
- `legacyId` – No longer returned; use `id` instead

---

### 3. List Analytics Reports ⭐ **CHANGED ENDPOINT**

**Endpoint:** `GET /analytics/reports` *(was `/reports` in v1)*

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Report type: `usage`, `compliance`, `audit` |
| `startDate` | string (ISO 8601) | No | Filter by start date |
| `endDate` | string (ISO 8601) | No | Filter by end date |

**Response:**
```json
{
  "reports": [
    {
      "id": "rpt_001",
      "type": "usage",
      "title": "January 2024 Usage Report",
      "generatedAt": "2024-01-14T09:00:00Z",
      "generatedBy": "usr_002",
      "url": "https://reports.atlas.internal/rpt_001.pdf",
      "requestId": "req_abc123xyz",
      "timestamp": "2024-02-01T12:00:00Z"
    }
  ],
  "total": 42,
  "requestId": "req_abc123xyz",
  "timestamp": "2024-02-01T12:00:00Z"
}
```

**New Fields (v2):**
- `requestId` – Unique request identifier
- `timestamp` – Server timestamp

---

## Rate Limiting

- **Limit:** 5000 requests per hour per OAuth token (increased from v1)
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

All errors return a JSON object with enhanced metadata:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: userId",
    "details": {
      "requestId": "req_abc123xyz",
      "timestamp": "2024-02-01T12:00:00Z"
    }
  }
}
```

---

## Migration Guide

### From v1 to v2

| Change | v1 | v2 | Action |
|--------|----|----|--------|
| **Authentication** | API key only | OAuth 2.0 required | Update auth headers; obtain OAuth token |
| **Endpoint: Reports** | `GET /reports` | `GET /analytics/reports` | Update endpoint URL |
| **Response Metadata** | None | `requestId`, `timestamp` | Update parsers to handle new fields |
| **Deprecated Field** | `legacyId` | Removed | Remove any code referencing `legacyId` |
| **Rate Limit** | 1000/hour | 5000/hour | Benefit from higher limits |

### Example Migration

**v1 Request:**
```bash
curl -H "Authorization: Bearer sk_live_abc123xyz" \
  https://api.atlas.internal/v1/reports
```

**v2 Request:**
```bash
curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  https://api.atlas.internal/v2/analytics/reports
```

### Backward Compatibility

- v1 endpoints will return `410 Gone` after 2024-06-30
- v2 does not support v1 API keys
- Dual-auth mode (API key + OAuth) is available for transitional periods only

---

## Support

For migration assistance, contact: `api-support@atlas.internal`
