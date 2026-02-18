# Phase 1 Plan: Calendar Core

**Phase:** 1 of 7
**Goal:** Build the foundational content calendar with drag-and-drop scheduling
**Requirements:** CAL-01, CAL-02, CAL-03, CAL-04, CAL-05

---

## Tasks

### Task 1: Database Schema for Content Calendar
**Files:** `backend/prisma/schema.prisma`
**Action:**
- Add ContentItem model with fields: id, title, content, contentType (BLOG_POST, CUSTOM_PAGE), status (DRAFT, SCHEDULED, PUBLISHED), scheduledAt, publishedAt, shopifyId, organizationId
- Add indexes for efficient calendar queries (organizationId + scheduledAt)
- Run migration

**Verify:** `npx prisma migrate dev` succeeds, model exists in schema

---

### Task 2: Content Calendar Service (Backend)
**Files:** `backend/src/services/content-calendar-service.ts`
**Action:**
- Implement getCalendarItems(orgId, startDate, endDate, filters) - returns items for date range
- Implement rescheduleItem(itemId, newDate) - updates scheduledAt
- Implement updateItemStatus(itemId, status) - updates status
- Add proper TypeScript types

**Verify:** Service methods work with test calls

---

### Task 3: Calendar API Controller
**Files:** `backend/src/controllers/calendar.controller.ts`
**Action:**
- GET /api/calendar?start=&end=&type=&status= - list items for calendar
- PATCH /api/calendar/:id/reschedule - update scheduled date
- PATCH /api/calendar/:id/status - update status
- Add authentication guard
- Add input validation

**Verify:** API endpoints respond correctly

---

### Task 4: Calendar Component (Frontend)
**Files:** `frontend/src/components/Calendar/ContentCalendar.tsx`
**Action:**
- Install react-big-calendar or @fullcalendar/react
- Create ContentCalendar component with monthly view
- Render content items on their scheduled dates
- Style with Shopify Polaris design tokens
- Add loading and empty states

**Verify:** Calendar renders with mock data

---

### Task 5: Drag-and-Drop Functionality
**Files:** `frontend/src/components/Calendar/ContentCalendar.tsx`
**Action:**
- Enable drag-and-drop on calendar events
- Call reschedule API on drop
- Show optimistic update, rollback on failure
- Add visual feedback during drag

**Verify:** Dragging item to new date updates scheduledAt

---

### Task 6: Content Preview Modal
**Files:** `frontend/src/components/Calendar/ContentPreviewModal.tsx`
**Action:**
- Create modal that shows content details on click
- Display title, content preview, status, scheduled date
- Add edit and status change buttons
- Use Polaris Modal component

**Verify:** Clicking calendar item opens preview

---

### Task 7: Calendar Filters
**Files:** `frontend/src/components/Calendar/CalendarFilters.tsx`
**Action:**
- Create filter bar component
- Add content type filter (Blog Post, Custom Page)
- Add status filter (Draft, Scheduled, Published)
- Connect filters to calendar query
- Persist filters in URL params

**Verify:** Filters narrow down visible calendar items

---

### Task 8: Calendar Page Integration
**Files:** `frontend/src/pages/CalendarPage.tsx`
**Action:**
- Create CalendarPage that combines all components
- Add to React Router
- Add navigation link in sidebar
- Handle loading, error, empty states

**Verify:** Full calendar page works end-to-end

---

## Success Criteria

1. [ ] User can view calendar with content items on scheduled dates
2. [ ] User can drag content to different dates and time updates
3. [ ] User can click item to see preview modal
4. [ ] Filters narrow down visible content
5. [ ] Calendar renders within 500ms

---

## Dependencies

- Existing Prisma setup
- Existing frontend React setup
- Existing authentication middleware

---

*Plan created: 2026-02-04*
