# Security Configuration Guide

This document outlines the security features and configuration options for the LotoLink application.

## Overview

LotoLink implements multiple layers of security to protect against common vulnerabilities and attacks:

1. **Authentication & Authorization** - JWT-based authentication with role-based access control
2. **CORS Protection** - Configurable Cross-Origin Resource Sharing
3. **Rate Limiting** - Protection against brute force and DDoS attacks
4. **Input Validation** - Comprehensive request validation
5. **Secure Headers** - Helmet.js for security headers

## 1. Authentication & Authorization

### Admin Authentication

Admin users must be authenticated through the backend API. No default credentials are present in the codebase.

**Admin Login Flow:**
1. Navigate to `admin-login.html`
2. Enter username and password
3. Backend validates credentials via POST `/admin/auth/login`
4. JWT token is returned and stored in localStorage
5. All subsequent API calls include the token in Authorization header

**Creating Admin Users:**

Admins can only be created by existing admins through the protected endpoint:

```bash
POST /admin/auth/create-admin
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "name": "Admin Name"
}
```

**SECURITY NOTE:** User registration (POST `/api/v1/auth/register`) ALWAYS creates users with the `USER` role. There is no auto-elevation to admin based on email patterns or any other criteria.

### Session Management

- Admin sessions expire after 8 hours of inactivity
- Tokens are validated on each request
- Sessions are cleared on logout or expiration

## 2. CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to prevent unauthorized domains from accessing the API.

### Environment Variable

```bash
# Development - Allow specific local origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080

# Production - MUST specify exact domains
ALLOWED_ORIGINS=https://lotolink.com,https://www.lotolink.com,https://admin.lotolink.com
```

### Behavior

- **Development Mode** (`NODE_ENV=development`): If `ALLOWED_ORIGINS` is not set, allows all origins (`*`)
- **Production Mode** (`NODE_ENV=production`): If `ALLOWED_ORIGINS` is not set, CORS is disabled (no origins allowed)
- **With ALLOWED_ORIGINS**: Only specified comma-separated origins are allowed

### CORS Settings

```javascript
{
  origin: <from ALLOWED_ORIGINS>,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Signature',
    'X-Timestamp',
    'X-Request-ID',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
}
```

## 3. Rate Limiting

Rate limiting protects against brute force attacks, credential stuffing, and DDoS attempts.

### Global Rate Limits

Default configuration (configurable via environment variables):

```bash
# Time window in milliseconds (default: 15 minutes)
RATE_LIMIT_TTL=900000

# Maximum requests per IP per time window (default: 100)
RATE_LIMIT_MAX=100
```

This means by default, each IP address can make 100 requests per 15-minute window across all endpoints.

### Per-Endpoint Rate Limits

Sensitive endpoints have stricter rate limits using the `@Throttle` decorator:

**Authentication Endpoints:**
- `/api/v1/auth/register` - 5 attempts per minute
- `/api/v1/auth/login` - 5 attempts per minute
- `/admin/auth/login` - 3 attempts per minute

**Example in code:**
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

### Customizing Rate Limits

To adjust rate limits for your deployment:

1. Edit `.env` file:
   ```bash
   # More restrictive - 50 requests per 10 minutes
   RATE_LIMIT_TTL=600000
   RATE_LIMIT_MAX=50
   
   # Less restrictive - 200 requests per 20 minutes
   RATE_LIMIT_TTL=1200000
   RATE_LIMIT_MAX=200
   ```

2. Restart the backend server

## 4. Input Validation

All API endpoints use `class-validator` for input validation:

- **Whitelist**: Only specified properties are accepted
- **Forbidden Non-Whitelisted**: Rejects requests with extra properties
- **Transform**: Automatically converts types
- **Validation**: Validates data types, formats, and constraints

## 5. Secure Headers (Helmet)

The application uses Helmet.js to set secure HTTP headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- And more...

## Security Checklist for Production

Before deploying to production, ensure:

- [ ] `NODE_ENV=production` is set
- [ ] `ALLOWED_ORIGINS` is set to specific domains (never use `*`)
- [ ] `JWT_SECRET` is a strong, random string (use `openssl rand -base64 64`)
- [ ] `HMAC_SECRET` is a strong, random string (use `openssl rand -hex 64`)
- [ ] Database credentials are secure and not default values
- [ ] Rate limiting is configured appropriately
- [ ] HTTPS/TLS is enabled for all traffic
- [ ] Admin users have strong passwords
- [ ] No secrets are committed to version control
- [ ] All third-party API keys are stored securely

## Monitoring & Alerts

Consider setting up monitoring for:

- Failed authentication attempts
- Rate limit violations
- CORS violations
- 401/403 error rates
- Suspicious patterns in API usage

## Reporting Security Issues

If you discover a security vulnerability, please email: security@lotolink.com

Do NOT create public GitHub issues for security vulnerabilities.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
