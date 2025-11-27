# Master Project Plan: Paper-Loving Digital Task Planner

## Overview

This document outlines the incremental development milestones for building the Paper-Loving Digital Task Planner. Each milestone builds upon the previous one, allowing for iterative development and testing.

## Development Philosophy

- **Incremental Development**: Each milestone delivers a working, testable feature
- **Test Early**: Validate core functionality (print, data persistence) as early as possible
- **Build Up Complexity**: Start simple, add features incrementally
- **User-Centric**: Each milestone should provide user value

## Milestone Structure

Each milestone has its own detailed requirements document in this folder:
- [[milestone-010-static-print]]
- [[milestone-020-mock-data-display]]
- [[milestone-030-drag-drop-single-list]] (to be created)
- [[milestone-040-item-crud]] (to be created)
- [[milestone-050-create-lists]] (to be created)
- [[milestone-060-drag-between-lists]] (to be created)
- [[milestone-070-day-of-week-lists]] (to be created)
- [[milestone-080-week-navigation]] (to be created)
- [[milestone-090-google-calendar-integration]] (to be created)

## Milestone Roadmap

### [[milestone-010-static-print]]: Static WYSIWYG Print Foundation
**Goal**: Establish that we can create a printable page and trigger printing
- Static "Hello World" page
- Print button that triggers browser print dialog
- Basic print CSS to ensure WYSIWYG layout
- **Deliverable**: Working print functionality

### [[milestone-020-mock-data-display]]: Mock Data & Display
**Goal**: Prove we can store and retrieve data from IndexedDB
- Create mock dataset (tasks, lists)
- Save to IndexedDB using Dexie.js
- Read from IndexedDB and display single static list
- **Deliverable**: Data persistence working, single list displayed

### [[milestone-030-drag-drop-single-list]]: Drag & Drop Within List
**Goal**: Enable reordering of items within a single list
- Implement drag-and-drop functionality
- Update order in IndexedDB when items are reordered
- Visual feedback during drag operations
- **Deliverable**: Users can reorder items within a list

### [[milestone-040-item-crud]]: Item Creation & Deletion
**Goal**: Enable users to create and delete tasks
- Add new task functionality
- Delete task functionality
- Persist changes to IndexedDB
- **Deliverable**: Full CRUD for individual tasks

### [[milestone-050-create-lists]]: Create New Lists
**Goal**: Enable users to create and manage multiple backlog lists
- Create new list functionality
- Delete list functionality
- List management UI
- **Deliverable**: Multiple lists can be created and managed

### [[milestone-060-drag-between-lists]]: Drag Between Lists
**Goal**: Enable moving tasks between different backlog lists
- Extend drag-and-drop to work across lists
- Update task's list association in IndexedDB
- Maintain order within destination list
- **Deliverable**: Tasks can be moved between lists

### [[milestone-070-day-of-week-lists]]: Day-of-Week Lists
**Goal**: Create day-specific lists and enable assigning tasks to days
- Create lists for each day of the week
- Drag tasks from backlog to day lists
- Update task's `day` property in IndexedDB
- Display tasks grouped by day
- **Deliverable**: Tasks can be assigned to specific days

### [[milestone-080-week-navigation]]: Week Navigation
**Goal**: Enable moving between different weeks
- Previous/Next week buttons
- Week identifier system
- Load tasks for specific week from IndexedDB
- Week display in UI
- **Deliverable**: Users can navigate between weeks

### [[milestone-090-google-calendar-integration]]: Google Calendar Integration
**Goal**: Pull events from Google Calendar and display as tasks
- Google OAuth authentication flow
- Google Calendar API integration
- Sync calendar events on page load
- Display calendar events as tasks (read-only)
- Store sync state in IndexedDB
- **Deliverable**: Calendar events appear as tasks in the app

## Dependencies Between Milestones

```
[[milestone-010-static-print]] → Independent
[[milestone-020-mock-data-display]] → Independent
[[milestone-030-drag-drop-single-list]] → Requires [[milestone-020-mock-data-display]]
[[milestone-040-item-crud]] → Requires [[milestone-020-mock-data-display]]
[[milestone-050-create-lists]] → Requires [[milestone-020-mock-data-display]], [[milestone-040-item-crud]]
[[milestone-060-drag-between-lists]] → Requires [[milestone-030-drag-drop-single-list]], [[milestone-050-create-lists]]
[[milestone-070-day-of-week-lists]] → Requires [[milestone-020-mock-data-display]], [[milestone-030-drag-drop-single-list]], [[milestone-040-item-crud]]
[[milestone-080-week-navigation]] → Requires [[milestone-070-day-of-week-lists]]
[[milestone-090-google-calendar-integration]] → Requires [[milestone-070-day-of-week-lists]], [[milestone-080-week-navigation]]
```

## Testing Strategy

Each milestone should include:
- **Manual Testing**: Verify functionality works as expected
- **Print Testing**: For milestones involving print, verify WYSIWYG accuracy
- **Data Persistence Testing**: Verify data survives page refresh
- **Browser Testing**: Test in target browsers (Chrome, Firefox, Safari, Edge)

## Definition of Done

Each milestone is considered complete when:
1. All acceptance criteria are met
2. Code is in `4-src/` folder (not `5-dist/`)
3. Application builds successfully
4. Manual testing passes
5. Data persists across page refreshes (where applicable)
6. No console errors in browser

## Next Steps

1. Review and approve this master plan
2. Begin development on [[milestone-010-static-print]]
3. After each milestone: test, review, then proceed to next milestone
4. Create milestone documents as needed (using 010, 020, 030... numbering with room for inserts)

