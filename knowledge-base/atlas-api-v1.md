# Atlas API v1 Documentation

**Version:** 1.0  
**Status:** Deprecated (see [Atlas API v2](./atlas-api-v2.md) for migration guide)  
**Last Updated:** 2024-01-15

## Overview

Atlas API v1 provides programmatic access to user management, reporting, and analytics data for enterprise deployments. This version uses API key authentication and supports REST endpoints for CRUD operations.

## Authentication

### API Key Authentication

All requests must include an `Authorization` header with your API key:

```
Authorization: Bearer YOUR_API_KEY_HERE
```

**Example:**
```bash
curl -H "Authorization: Bearer sk_live_abc123xyz" \
  https://api.atlas.internal/v1/users
```

## Base URL

```
https://api.atlas.internal/v1
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
      "createdAt": "2023-06-15T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Status Codes:**
- `200 OK` – Success
- `401 Unauthorized` – Invalid or missing API key
- `429 Too Many Requests` – Rate limit exceeded

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
  "lastLogin": "2024-01-14T14:22:00Z"
}
```

---

### 3. List Reports

**Endpoint:** `GET /reports`

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
      "url": "https://reports.atlas.internal/rpt_001.pdf"
    }
  ],
  "total": 42
}
```

---

## Rate Limiting

- **Limit:** 1000 requests per hour per API key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

All errors return a JSON object:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: userId",
    "details": {}
  }
}
```

## Deprecation Notice

**Atlas API v1 will be sunset on 2024-06-30.** All integrations must migrate to [Atlas API v2](./atlas-api-v2.md) before this date. See the migration guide for breaking changes and new features.
