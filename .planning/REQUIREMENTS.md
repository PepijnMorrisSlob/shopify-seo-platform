# Requirements - Milestone v1.1 Content Calendar & Publishing

**Milestone:** v1.1 Content Calendar & Publishing
**Created:** 2026-02-04
**Status:** Approved

---

## v1.1 Requirements

### Content Calendar (CAL)

- [ ] **CAL-01**: User can view content in a monthly calendar layout with days showing scheduled items
- [ ] **CAL-02**: User can drag and drop content items to reschedule them to different dates/times
- [ ] **CAL-03**: User can click on a calendar item to preview content in a popup modal
- [ ] **CAL-04**: User can filter calendar by content type (blog posts, custom pages)
- [ ] **CAL-05**: User can filter calendar by status (draft, scheduled, published)
- [ ] **CAL-06**: System auto-schedules content based on optimal publishing times using traffic patterns
- [ ] **CAL-07**: User can configure auto-scheduling preferences (preferred days, time slots, max posts/day)
- [ ] **CAL-08**: User can view content strategy in a mind map visualization showing topic clusters
- [ ] **CAL-09**: User can navigate between mind map and calendar views
- [ ] **CAL-10**: User can view publication history with performance metrics (clicks, impressions if GSC connected)

### Mass Publishing (MASS)

- [ ] **MASS-01**: User can select multiple content items for bulk operations
- [ ] **MASS-02**: User can review selected content in a multi-panel view with quick navigation
- [ ] **MASS-03**: User can apply AI-powered rewrites to multiple content items using a prompt
- [ ] **MASS-04**: User can change status (draft → scheduled, scheduled → published) for multiple items at once
- [ ] **MASS-05**: User can set publish date/time for multiple items at once
- [ ] **MASS-06**: User can translate content to different languages using AI (batch operation)
- [ ] **MASS-07**: User can preview changes before applying bulk operations
- [ ] **MASS-08**: System shows progress indicator during bulk operations

### Publishing to Shopify (PUB)

- [ ] **PUB-01**: User can publish content as a Shopify blog article
- [ ] **PUB-02**: User can select which blog to publish to (if store has multiple blogs)
- [ ] **PUB-03**: User can set SEO metadata (title, description) for blog posts
- [ ] **PUB-04**: User can add tags and author to blog posts
- [ ] **PUB-05**: User can publish content as a Shopify custom page
- [ ] **PUB-06**: User can set page visibility (published, hidden)
- [ ] **PUB-07**: System tracks publication status and syncs back from Shopify
- [ ] **PUB-08**: User can unpublish/update previously published content

### Queue & Background Processing (QUEUE)

- [ ] **QUEUE-01**: System processes bulk publish operations in background queue
- [ ] **QUEUE-02**: System respects Shopify API rate limits during bulk operations
- [ ] **QUEUE-03**: System retries failed publish operations with exponential backoff
- [ ] **QUEUE-04**: User can view queue status and progress for ongoing operations
- [ ] **QUEUE-05**: System sends notification when bulk operation completes

---

## Future Requirements (v1.2+)

- Product description publishing
- Collection description publishing
- A/B testing for published content
- Scheduled unpublishing (content expiry)
- Content approval workflows (multi-user)
- RSS feed generation
- Social media cross-posting

---

## Out of Scope

- **Email notifications** — Will use in-app notifications only for v1.1
- **Mobile app** — Web-only for now
- **Multi-store publishing** — Single store per organization in v1.1
- **Content versioning** — No version history in v1.1

---

## Traceability

| Phase | Requirements |
|-------|--------------|
| Phase 1 | CAL-01, CAL-02, CAL-03, CAL-04, CAL-05 |
| Phase 2 | CAL-06, CAL-07, CAL-10 |
| Phase 3 | CAL-08, CAL-09 |
| Phase 4 | MASS-01, MASS-02, MASS-04, MASS-05, MASS-07, MASS-08 |
| Phase 5 | MASS-03, MASS-06 |
| Phase 6 | PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, PUB-08 |
| Phase 7 | QUEUE-01, QUEUE-02, QUEUE-03, QUEUE-04, QUEUE-05 |
