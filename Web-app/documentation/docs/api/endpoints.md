---
sidebar_position: 1
---

# API Documentation

## Authentication Endpoints

### `POST /auth/google/token`
Exchanges the Google OAuth code for access tokens.

### `GET /auth/google/userinfo`
Retrieves the authenticated user's profile information.

## Document Endpoints

### `POST /documents/format`
The main endpoint for formatting documents.

**Request Body:**
```json
{
  "text": "Raw text content...",
  "template_id": "college_report"
}
```

**Response:**
Returns the structure of the formatted document or a confirmation reference.
