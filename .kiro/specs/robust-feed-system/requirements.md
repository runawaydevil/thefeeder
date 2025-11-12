# Requirements Document

## Introduction

This specification defines a robust feed parsing and discovery system that can handle all RSS/Atom feeds, including those with malformed XML, blocking mechanisms, and non-standard formats. The system must successfully parse feeds like myduckisdead.org that fail with traditional parsers, and automatically discover feed URLs from website URLs.

## Glossary

- **Feed Parser**: The system component responsible for fetching and parsing RSS/Atom feeds
- **Feed Discovery**: The system component that automatically detects feed URLs from website URLs
- **HTTP Client**: The underlying HTTP fetching mechanism with anti-blocking strategies
- **XML Parser**: The component that converts XML text into structured data
- **Fallback Strategy**: A sequence of alternative approaches tried when primary methods fail

## Requirements

### Requirement 1: Robust Feed Parsing

**User Story:** As a user, I want to add any RSS/Atom feed URL and have it successfully parsed, so that I can read content from all feeds regardless of their technical implementation.

#### Acceptance Criteria

1. WHEN a feed URL is provided, THE Feed Parser SHALL attempt parsing using a custom XML parser before falling back to third-party libraries
2. WHEN XML content contains BOM (Byte Order Mark) characters, THE Feed Parser SHALL remove them before parsing
3. WHEN XML content contains leading whitespace or garbage characters, THE Feed Parser SHALL clean the content before parsing
4. WHEN a feed uses RSS format, THE Feed Parser SHALL extract title, link, description, and all items with their metadata
5. WHEN a feed uses Atom format, THE Feed Parser SHALL extract title, link, subtitle, and all entries with their metadata
6. IF the custom parser fails, THEN THE Feed Parser SHALL attempt parsing with rss-parser library as fallback
7. THE Feed Parser SHALL log detailed information at each parsing stage for debugging purposes
8. THE Feed Parser SHALL return a consistent data structure regardless of which parsing method succeeds

### Requirement 2: Anti-Blocking HTTP Fetching

**User Story:** As a user, I want feeds to be fetched successfully even when websites block automated requests, so that I can access content from protected sources.

#### Acceptance Criteria

1. WHEN fetching a feed, THE HTTP Client SHALL use realistic browser User-Agent headers
2. WHEN a request fails with 403/429 status, THE HTTP Client SHALL retry with different User-Agent strings
3. WHEN direct fetching fails, THE HTTP Client SHALL attempt fetching through RSS proxy services
4. THE HTTP Client SHALL try at least 3 different proxy services before declaring failure
5. THE HTTP Client SHALL include appropriate headers (Accept, Accept-Language, Referer) to mimic browser requests
6. THE HTTP Client SHALL handle redirects automatically
7. THE HTTP Client SHALL timeout after 30 seconds per attempt

### Requirement 3: Automatic Feed Discovery

**User Story:** As a user, I want to paste a website URL and have the system automatically find the RSS/Atom feed, so that I don't need to manually locate feed URLs.

#### Acceptance Criteria

1. WHEN a website URL is provided, THE Feed Discovery SHALL first check if the URL itself is a valid feed
2. WHEN the URL is not a feed, THE Feed Discovery SHALL fetch the HTML page and search for feed link tags
3. THE Feed Discovery SHALL detect feeds in `<link rel="alternate" type="application/rss+xml">` tags
4. THE Feed Discovery SHALL detect feeds in `<link rel="alternate" type="application/atom+xml">` tags
5. THE Feed Discovery SHALL try common feed URL patterns (/feed, /rss, /atom.xml, /feed.xml, /rss.xml, /index.xml)
6. THE Feed Discovery SHALL validate each discovered URL by attempting to parse it
7. WHEN multiple feeds are found, THE Feed Discovery SHALL return all valid feeds
8. THE Feed Discovery SHALL return feed metadata (title, URL) for each discovered feed

### Requirement 4: Error Handling and Logging

**User Story:** As a developer, I want detailed error information and logs when feed operations fail, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN any parsing step fails, THE Feed Parser SHALL log the specific error with context
2. WHEN HTTP fetching fails, THE HTTP Client SHALL log the status code, headers, and error message
3. WHEN feed discovery fails, THE Feed Discovery SHALL log which detection methods were attempted
4. THE system SHALL log the first 200 characters of fetched content for debugging
5. THE system SHALL log which parsing strategy succeeded (custom parser vs fallback)
6. THE system SHALL include timestamps in all log messages
7. THE system SHALL use consistent log prefixes ([Feed Parser V2], [HTTP Client], [Feed Discovery])

### Requirement 5: Integration with Existing System

**User Story:** As a system maintainer, I want the new feed system to integrate seamlessly with existing code, so that no breaking changes are introduced.

#### Acceptance Criteria

1. THE Feed Parser SHALL maintain the same function signature as the existing parseFeed function
2. THE Feed Parser SHALL return data in the same format expected by existing code
3. THE Feed Parser SHALL work in both web and worker applications
4. THE Feed Discovery SHALL be callable from API routes and UI components
5. THE system SHALL not require changes to database schema or data models
6. THE system SHALL maintain backward compatibility with existing feed subscriptions
7. THE system SHALL handle both ESM (.js) and TypeScript (.ts) module imports correctly
