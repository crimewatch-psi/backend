# CrimeWatch Backend API Documentation

## Base URL

```
http://localhost:6000/api
```

## Authentication

### Login

```http
POST /login
```

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "message": "Login berhasil",
  "user": {
    "id": "number",
    "nama": "string",
    "email": "string",
    "role": "enum('admin', 'manager', 'polri')"
  }
}
```

**Errors:**

- `400`: Email dan password wajib diisi
- `401`: Akun tidak ditemukan / Password salah
- `500`: Kesalahan server

### Logout

```http
POST /logout
```

**Response (200):**

```json
{
  "message": "Logout berhasil"
}
```

### Check Session

```http
GET /session
```

**Response (200):**

```json
{
  "isAuthenticated": "boolean",
  "user": {
    "id": "number",
    "nama": "string",
    "email": "string",
    "role": "string"
  }
}
```

## Admin Routes

All admin routes require admin authentication. Add session cookie from login.

### Get All Users

```http
GET /api/admin/users
```

**Response (200):**

```json
[
  {
    "id": "number",
    "nama": "string",
    "email": "string",
    "role": "enum('admin', 'manager', 'polri')",
    "status": "enum('aktif', 'nonaktif')"
  }
]
```

### Update User Status

```http
PATCH /api/admin/users/:id/status
```

**Request Body:**

```json
{
  "status": "enum('aktif', 'nonaktif')"
}
```

**Response (200):**

```json
{
  "message": "Status user dengan ID {id} berhasil diubah menjadi {status}."
}
```

**Errors:**

- `400`: Status tidak valid
- `403`: Admin tidak dapat menonaktifkan akunnya sendiri
- `404`: User tidak ditemukan

### Get All Heatmap Locations

```http
GET /api/admin/heatmap
```

**Response (200):**

```json
[
  {
    "mapid": "number",
    "nama_lokasi": "string",
    "latitude": "float",
    "longitude": "float",
    "gmaps_url": "string",
    "status": "enum('aktif', 'mati')"
  }
]
```

### Update Location Status

```http
PATCH /api/admin/heatmap/:mapid/status
```

**Request Body:**

```json
{
  "status": "enum('aktif', 'mati')"
}
```

**Response (200):**

```json
{
  "message": "Status lokasi dengan mapid {mapid} berhasil diubah menjadi {status}."
}
```

### Upload Crime Data (CSV)

```http
POST /api/admin/kriminal/upload
```

**Request:**

- Content-Type: multipart/form-data
- Field name: `file`
- File format: CSV
- Max size: 1MB

**CSV Format:**

```csv
mapid,jenis_kejahatan,waktu,deskripsi
1,"Pencopetan","2024-01-01 14:30:00","Deskripsi kejadian"
```

**Response (200):**

```json
{
  "message": "Import data berhasil",
  "imported": "number"
}
```

## Crime Data Routes

### Get Crime Data by Location

```http
GET /api/kriminal?mapid={mapid}
```

**Query Parameters:**

- `mapid`: Location ID (number, required)

**Response (200):**

```json
[
  {
    "id": "number",
    "mapid": "number",
    "jenis_kejahatan": "string",
    "waktu": "datetime",
    "deskripsi": "string"
  }
]
```

## Chatbot Routes

### Get AI Analysis

```http
POST /api/chatbot
```

**Request Body:**

```json
{
  "mapid": "number",
  "question": "string (max 500 chars)"
}
```

**Response (200):**

```json
{
  "reply": "string (AI-generated response)"
}
```

**Errors:**

- `400`: Parameter missing or question too long
- `404`: No crime data for location
- `500`: OpenAI API error

## Example Usage (React/Next.js)

```typescript
// api.ts
const API_BASE = "http://localhost:6000/api";

export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const getCrimeData = async (mapid: number) => {
  const response = await fetch(`${API_BASE}/kriminal?mapid=${mapid}`, {
    credentials: "include",
  });
  return response.json();
};

export const askChatbot = async (mapid: number, question: string) => {
  const response = await fetch(`${API_BASE}/chatbot`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mapid, question }),
  });
  return response.json();
};
```

## Important Notes

1. **CORS**: The backend allows all origins in development. For production, configure specific origins.

2. **Session Management**:

   - Sessions last for 1 week
   - Session cookie name: "connect.sid"
   - Include `credentials: 'include'` in fetch calls

3. **File Upload Limits**:

   - Maximum file size: 1MB
   - Supported format: CSV only

4. **Rate Limiting**:

   - Chatbot: No specific limit but consider OpenAI API costs
   - Other endpoints: No rate limiting implemented

5. **Error Handling**:

   - Always check response status codes
   - Error responses include `error` field with message
   - Some errors may include additional `detail` field

6. **Security**:
   - Admin routes require admin role
   - Passwords are compared in plaintext (should be hashed in production)
   - Session secret should be configured via environment variable

## Environment Variables

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=crimewatch
SESSION_SECRET=your_secret_key
OPENAI_API_KEY=your_openai_api_key
```
