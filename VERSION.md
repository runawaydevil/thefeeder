# Version History

## 0.5.0 (2025-10-24)

### Added
- **Icon System**: Consistent icon strategy across both legacy and React frontends
  - Social network logos via Simple Icons CDN
  - RSS icons via Lucide React component
  - Favicon fallback for generic feeds
  - Initials fallback when favicon unavailable
- **Color System**: Unified HSL-based color tokens
  - Semantic color variables for both light and dark themes
  - Tailwind integration with custom color palette
  - Consistent styling across legacy and React frontends
- **Admin Authentication**: HTTP Basic Authentication for all `/admin` endpoints
- **Security Enhancements**:
  - Restrictive CORS configuration
  - Enhanced security headers (CSP, COEP, CORP)
  - Input validation for admin endpoints
- **Reddit Integration Improvements**:
  - Automatic cleaning of Reddit metadata from summaries
  - Admin endpoint to clean existing Reddit items
- **Feed Configuration**: Migration to `feeds.yaml` file (checked into git)
- **Documentation**:
  - `guidetofeed.md` - Comprehensive guide for adding feeds
  - `SecurityAudit.md` - Security audit findings and improvements
  - `colors.md` - Color system documentation

### Changed
- Updated base URL to `https://feeder.1208.pro`
- Improved `.env.example` with generic examples
- Enhanced `.gitignore` to include proper excludes
- Logo sizing improvements (40px desktop, 32px mobile)
- Logo hidden on `/admin/health` page

### Technical Changes
- Added `app/core/auth.py` for authentication
- Added `app/core/logging_config.py` for centralized logging
- Added `app/core/maintenance.py` for database maintenance
- Added `app/core/metrics.py` for Prometheus metrics
- Added `app/core/opml.py` for OPML import/export
- Added `app/core/websub.py` for WebSub support
- Added `app/api/routes.py` for REST API endpoints
- Created `frontend/src/lib/icon-source.ts` for icon resolution
- Created `frontend/src/components/SourceIcon.tsx` for icon rendering
- Created `app/web/static/icons.js` for legacy icon handling

## 0.0.2 (2025-09-XX)

### Added
- FTS5 search functionality
- Smart pagination
- Relative time display
- Read tracking
- Custom sorting
- Status indicators
- Image handling with proxy
- Accessibility improvements
- Empty states
- List view toggle
- New badge for recent articles
- Unread counter

## 0.0.1 (2025-08-XX)

### Initial Release
- Basic RSS feed aggregation
- Dark/Light theme support
- Docker containerization
- FastAPI backend
- Jinja2 frontend

