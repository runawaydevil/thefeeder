# Security Features

## Overview

Pablo Feeds implements multiple layers of security to protect against common web vulnerabilities.

## Security Measures Implemented

### 1. Input Validation

- **Type Validation**: All parameters are validated using Pydantic and type hints
- **Range Validation**: Integer values are checked for valid ranges (e.g., page > 0, feed_id > 0)
- **White-list Approach**: Sort parameters validated against allowed values
- **Length Limits**: Search queries limited to 200 characters
- **SQL Injection Prevention**: Parameterized queries used exclusively

### 2. Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Restricts browser features (geolocation, microphone, camera)

### 3. SQLite Security

- **Parameterized Queries**: All database queries use parameterized statements
- **SQLModel ORM**: Type-safe database operations
- **Input Sanitization**: User inputs are sanitized before database operations
- **Connection Pooling**: Managed connections prevent resource exhaustion

### 4. Rate Limiting

- **Per-Host Rate Limiting**: Token bucket algorithm limits requests per host
- **Global Concurrency**: Semaphore limits concurrent connections
- **Retry-After Compliance**: Respects server rate limit headers

### 5. User-Agent Compliance

- **Reddit-Compliant**: Descriptive User-Agent with contact information
- **No Rotation**: Consistent User-Agent prevents fingerprinting issues
- **Contact Information**: Includes email for compliance and abuse reporting

### 6. Error Handling

- **Graceful Degradation**: Errors don't expose system internals
- **Safe Error Messages**: Generic error messages prevent information leakage
- **HTTP Status Codes**: Proper status codes for different error types

### 7. Caching Security

- **ETag Validation**: Secure caching with ETag headers
- **Last-Modified**: Conditional requests prevent unnecessary data transfer
- **Cache Headers**: Appropriate cache-control headers for static files

### 8. Admin Endpoints

- **Endpoint Validation**: All admin endpoints validate input parameters
- **Existence Checks**: Feed existence verified before operations
- **Error Handling**: Proper error responses for invalid requests

## Security Best Practices

### Environment Variables

Sensitive configuration stored in environment variables:
- Database paths
- User-Agent strings
- Rate limiting parameters

### No Credentials in Code

- No hardcoded passwords or API keys
- All secrets in environment variables
- `.env` file excluded from git

### Dependency Management

- Pinned package versions in Dockerfile
- No arbitrary code execution
- Minimal external dependencies

### File System Security

- Read-only database operations from HTTP layer
- No file upload functionality
- No arbitrary file access

## Known Limitations

### Admin Endpoints

- Currently no authentication required
- Suitable for single-user installations
- For multi-user deployments, add authentication middleware

### HTTPS

- Application does not enforce HTTPS
- Deploy behind reverse proxy (nginx, traefik) with SSL termination

### Database

- SQLite suitable for single-instance deployments
- For scaling, consider PostgreSQL/MySQL with connection pooling

## Recommendations

### For Production

1. **Add Authentication**: Implement JWT or session-based auth for admin endpoints
2. **Enable HTTPS**: Use reverse proxy with Let's Encrypt
3. **Add Rate Limiting**: Additional rate limiting at reverse proxy level
4. **Monitor Logs**: Set up log aggregation and monitoring
5. **Backup Database**: Regular backups of SQLite database
6. **Update Dependencies**: Regularly update Python packages
7. **Security Headers**: Consider adding CSP (Content Security Policy)

### For Multi-User Deployments

1. **Database Migration**: Move to PostgreSQL
2. **User Isolation**: Implement user-specific feeds
3. **Access Control**: Role-based access control (RBAC)
4. **API Keys**: For programmatic access

## Reporting Security Issues

If you discover a security vulnerability, please email: pablo@pablomurad.com

Do NOT create a public GitHub issue for security vulnerabilities.

## Security Updates

This document will be updated as new security features are added.

Last updated: January 2025

