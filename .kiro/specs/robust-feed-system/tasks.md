# Implementation Plan

- [x] 1. Create custom XML parser (feed-parser-v2.ts)


  - Create feed-parser-v2.ts in apps/worker/src/lib/ with custom XML parsing logic
  - Implement extractText() function using regex to extract text content from XML tags
  - Implement extractAttribute() function to extract attributes from XML tags
  - Implement parseRSS() function to parse RSS feeds with regex
  - Implement parseAtom() function to parse Atom feeds with regex
  - Implement detectAndParse() function to auto-detect feed format
  - Implement parseFeedV2() main function that fetches, cleans, and parses feeds
  - Add XML cleanup logic (BOM removal, whitespace trimming, garbage removal)
  - Add detailed logging at each step with [Feed Parser V2] prefix
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8_



- [ ] 2. Create custom XML parser for web app
  - Copy feed-parser-v2.ts to apps/web/src/lib/ with same implementation
  - Adjust imports for web environment (remove .js extensions)


  - Ensure compatibility with Next.js build system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 5.3_

- [ ] 3. Update worker RSS parser integration
  - Modify apps/worker/src/lib/rss-parser.ts to call parseFeedV2 FIRST
  - Add detailed logging for each parsing step (STEP 1, STEP 2, etc.)


  - Implement convertV2ToLegacyFormat() function to convert ParsedFeedV2 to ParsedFeed
  - Ensure custom parser errors are logged but don't stop fallback flow
  - Keep existing fallback strategies (rss-parser, HTTP client, proxies)
  - _Requirements: 1.1, 1.6, 1.7, 1.8, 4.1, 4.2, 5.1, 5.2_

- [x] 4. Update web RSS parser integration


  - Modify apps/web/src/lib/rss-parser.ts to call parseFeedV2 FIRST
  - Add detailed logging for each parsing step
  - Implement convertV2ToLegacyFormat() function for web
  - Ensure proper TypeScript types for FeedItem conversion
  - Keep existing fallback strategies
  - _Requirements: 1.1, 1.6, 1.7, 1.8, 4.1, 4.2, 5.1, 5.2, 5.3_



- [ ] 5. Enhance HTTP client with better logging
  - Add detailed logging to apps/worker/src/lib/http-client.ts
  - Log which strategy is being attempted (Strategy 1, 2, 3)


  - Log success/failure for each strategy
  - Add log prefix [HTTP Client] to all messages
  - Ensure BOM removal and whitespace trimming are logged
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.2_

- [x] 6. Enhance web HTTP client with better logging


  - Add detailed logging to apps/web/src/lib/http-client.ts
  - Match logging format with worker HTTP client
  - Ensure consistency between web and worker implementations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.2, 5.3_

- [x] 7. Enhance feed discovery with validation


  - Update apps/web/src/lib/feed-discovery.ts to use improved validation
  - Ensure validateFeedDirect() tries custom parser first
  - Add logging for discovery levels (Level 1, Level 2, Level 3)
  - Ensure all discovered feeds are validated before returning
  - Add timing information to discovery logs
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.3_




- [ ] 8. Test with problematic feeds
  - Test parsing https://myduckisdead.org/feed
  - Verify custom parser is called first (check logs for "STEP 1: Trying custom parser V2")
  - Verify XML cleanup removes BOM and whitespace
  - Verify feed is successfully parsed
  - Test with other feeds to ensure no regressions
  - _Requirements: 1.1, 1.2, 1.3, 1.8, 5.6_

- [ ] 9. Test feed discovery
  - Test discovering feeds from website URLs
  - Test direct feed URL validation
  - Test HTML discovery with various website types
  - Test common path discovery
  - Test special handlers (Reddit, YouTube, GitHub)
  - Verify all discovered feeds are valid
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 10. Verify backward compatibility
  - Ensure existing feed subscriptions still work
  - Verify ParsedFeed format matches existing expectations
  - Test with feeds that were working before
  - Ensure no breaking changes to API
  - _Requirements: 5.1, 5.2, 5.5, 5.6_

- [ ]* 11. Add error handling tests
  - Test handling of network errors (timeout, connection refused, etc.)
  - Test handling of HTTP errors (403, 404, 429, 500)
  - Test handling of parsing errors (malformed XML, empty feeds)
  - Verify appropriate error messages are returned
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 12. Performance testing
  - Measure parse time for various feeds
  - Verify 95% of feeds parse in < 5 seconds
  - Test cache effectiveness
  - Verify parallel validation works correctly
  - _Requirements: 1.8, 3.6, 3.7_
