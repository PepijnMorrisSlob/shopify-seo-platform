# Roadmap - Milestone v1.1 Content Calendar & Publishing

**Milestone:** v1.1
**Phases:** 7
**Total Requirements:** 26

---

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Calendar Core | Basic calendar UI with scheduling | CAL-01 to CAL-05 | 5 |
| 2 | Smart Scheduling | Auto-scheduling and history | CAL-06, CAL-07, CAL-10 | 3 |
| 3 | Mind Map View | Content strategy visualization | CAL-08, CAL-09 | 2 |
| 4 | Bulk Operations Core | Select and manage multiple items | MASS-01 to MASS-05 (excl 03), MASS-07, MASS-08 | 6 |
| 5 | AI Mass Editing | AI rewrites and translation | MASS-03, MASS-06 | 2 |
| 6 | Shopify Publishing | Publish to blogs and pages | PUB-01 to PUB-08 | 8 |
| 7 | Queue System | Background processing with notifications | QUEUE-01 to QUEUE-05 | 5 |

---

## Phase Details

### Phase 1: Calendar Core
**Goal:** Build the foundational content calendar with drag-and-drop scheduling

**Requirements:**
- CAL-01: Monthly calendar layout
- CAL-02: Drag-and-drop rescheduling
- CAL-03: Content preview popup
- CAL-04: Filter by content type
- CAL-05: Filter by status

**Success Criteria:**
1. User can view calendar with content items on scheduled dates
2. User can drag content to different dates and time updates
3. User can click item to see preview modal
4. Filters narrow down visible content
5. Calendar renders within 500ms

**Dependencies:** None (foundation phase)

---

### Phase 2: Smart Scheduling
**Goal:** Add AI-powered auto-scheduling and publication history tracking

**Requirements:**
- CAL-06: Auto-schedule based on traffic patterns
- CAL-07: Scheduling preferences configuration
- CAL-10: Publication history with metrics

**Success Criteria:**
1. Auto-schedule distributes content across optimal times
2. User can set preferred days, times, and limits
3. History shows past publications with GSC data (if connected)

**Dependencies:** Phase 1 (calendar exists)

---

### Phase 3: Mind Map View
**Goal:** Visualize content strategy as topic clusters

**Requirements:**
- CAL-08: Mind map showing topic clusters
- CAL-09: Switch between calendar and mind map

**Success Criteria:**
1. Mind map renders content grouped by topic/category
2. User can click nodes to see related content
3. Toggle between views preserves filters

**Dependencies:** Phase 1 (content data structure)

---

### Phase 4: Bulk Operations Core
**Goal:** Enable selecting and managing multiple content items

**Requirements:**
- MASS-01: Multi-select content items
- MASS-02: Multi-panel review view
- MASS-04: Bulk status changes
- MASS-05: Bulk date/time setting
- MASS-07: Preview before applying
- MASS-08: Progress indicator

**Success Criteria:**
1. Checkboxes allow selecting multiple items
2. Selected items shown in review panel
3. Status change applies to all selected
4. Date picker applies to all selected
5. Preview shows what will change
6. Progress bar shows completion

**Dependencies:** Phase 1 (content listing)

---

### Phase 5: AI Mass Editing
**Goal:** Apply AI-powered edits to multiple content items

**Requirements:**
- MASS-03: AI rewrites with custom prompt
- MASS-06: Batch translation

**Success Criteria:**
1. User enters prompt, AI rewrites all selected content
2. User selects target language, AI translates all selected
3. Preview shows AI changes before applying
4. Queue processes AI requests without blocking UI

**Dependencies:** Phase 4 (bulk selection), existing AI service

---

### Phase 6: Shopify Publishing
**Goal:** Publish content to Shopify blogs and custom pages

**Requirements:**
- PUB-01: Publish as blog article
- PUB-02: Select target blog
- PUB-03: Set SEO metadata
- PUB-04: Add tags and author
- PUB-05: Publish as custom page
- PUB-06: Set page visibility
- PUB-07: Track publication status
- PUB-08: Unpublish/update content

**Success Criteria:**
1. Blog post appears in Shopify after publish
2. Multiple blogs selectable if store has them
3. Meta title/description set correctly
4. Tags and author applied
5. Custom page created in Shopify
6. Visibility toggle works
7. Status syncs from Shopify webhooks
8. Update/unpublish reflects in Shopify

**Dependencies:** Phase 4 (bulk operations), existing Shopify service

---

### Phase 7: Queue System
**Goal:** Robust background processing with progress tracking

**Requirements:**
- QUEUE-01: Background queue for bulk publish
- QUEUE-02: Respect Shopify rate limits
- QUEUE-03: Retry with exponential backoff
- QUEUE-04: Queue status UI
- QUEUE-05: Completion notifications

**Success Criteria:**
1. Bulk publish runs in background, doesn't block UI
2. No Shopify rate limit errors during bulk operations
3. Failed items retry up to 3 times
4. User sees real-time queue progress
5. Toast notification on completion

**Dependencies:** Phase 6 (publishing), existing BullMQ setup

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Shopify rate limits | Queue system with throttling (Phase 7) |
| AI costs for mass edits | Batch requests, cost preview before confirm |
| Complex calendar UX | Use proven library (FullCalendar/react-big-calendar) |
| Mind map performance | Virtual rendering for large datasets |

---

*Created: 2026-02-04*
