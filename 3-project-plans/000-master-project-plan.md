**# Master Project Plan: Paper-Loving Digital Task Planner

## Overview

This document outlines the incremental development milestones for building the Paper-Loving Digital Task Planner. Each milestone builds upon the previous one, allowing for iterative development and testing.

## Development Philosophy

- **Incremental Development**: Each milestone delivers a working, testable feature
- **Test Early**: Validate core functionality (print, data persistence) as early as possible
- **Build Up Complexity**: Start simple, add features incrementally
- **User-Centric**: Each milestone should provide user value
- **Functionality First**: Build core features before focusing on styling and polish

## Milestone Roadmap

| # | Milestone | Status | Focus | Details |
|---|-----------|--------|-------|--------|
| 010 | [[010-static-print\|Static WYSIWYG Print Foundation]] | ✅ DONE | Establish printable page and print trigger | Static "Hello World" page, print button, basic print CSS |
| 020 | [[020-mock-data-display\|Mock Data & Display]] | ✅ DONE | Dexie setup, display data (no formatting focus) | Create mock dataset (tasks, lists), save to IndexedDB using Dexie.js, read and display data. No formatting concerns. |
| 030 | [[030-task-crud-ordering\|Task CRUD & State Management]] | ✅ DONE | Create, delete, manage task states (+ empty task state behavior) | Task creation, task deletion, task state management (unchecked → checked → archived), restore functionality. Empty task state behavior. No formatting focus. |
| 031 | [[031-task-reordering\|Task Reordering]] | ✅ DONE | Reorder tasks within lists | Task reordering via drag-and-drop or buttons. Order persistence in IndexedDB. Only affects unchecked/checked tasks. No formatting focus. |
| 032 | [[032-task-ux-behaviors\|Task UX Behaviors]] | ✅ DONE | Refine task interaction patterns | Enter key behavior, focus management, click behaviors, keyboard navigation. Interaction polish for task creation and editing. No formatting focus. |
| 040 | [[040-list-crud-ordering\|List CRUD & Ordering]] | ✅ DONE | Create, archive, reorder lists (+ empty list state behavior) | List creation, list archiving, list sorting. Empty list state behavior (what happens when no lists exist). No formatting focus. |
| 042 | [[042-drag-and-drop-bug\|Fix Drag-and-Drop Bug]] | ✅ MOSTLY DONE | Fix list drag placeholder bug | Fixed main bug where placeholder IDs caused queries to get stuck. Edge case remains (see 078). |
| 050 | [[050-drag-between-lists\|Drag Between Lists]] | Pending | Move tasks between lists | Task drag and drop between lists. Update task's list association in IndexedDB. Maintain order within destination list. |
| 060 | [[060-multiple-columns\|Multiple Columns]] | Pending | Multi-column layout for lists | Display lists in multiple columns (2-3 columns). Extends milestone 050 - drag-and-drop and keyboard navigation must work across columns. |
| 070 | [[070-styling-polish\|Styling & Polish]] | 🔄 IN PROGRESS | Visual design, empty state appearance, print layout | Visual design implementation, empty state appearance (polish the functional empty states), print layout styling, responsive design |
| 074 | [[074-empty-state-test-fix\|Fix Empty State Test Issues]] | Pending | Fix test environment issue | Fix `document is not defined` error preventing empty state tests from running. Address issue in `activateAddTaskInput` function. |
| 075 | [[075-tab-drag-bug\|Fix Tab Key Not Canceling Drag Mode]] | Pending | Bug fix for Tab key behavior | Fix bug where pressing Tab while in drag mode (after pressing Enter) does not cancel drag mode. May be upstream issue in svelte-dnd-action library. |
| 076 | [[076-keyboard-cross-list-tests\|Keyboard Cross-List Movement Tests]] | ✅ DONE | Test coverage for keyboard navigation | Add comprehensive integration tests for keyboard-based cross-list movement functionality. |
| 077 | [[077-delete-lists\|Delete Lists & Tasks]] | Pending | Soft delete functionality | Implement soft delete for lists and tasks with orphaned task handling. |
| 078 | [[078-drag-edge-case-bug\|Fix Drag Edge Case Bug]] | Pending | Fix rapid drag edge case | Resolve occasional "Loading tasks..." bug after rapid drag operations (edge case from 042). |

## Testing Strategy

Each milestone should include:
- **Manual Testing**: Verify functionality works as expected
- **Print Testing**: For milestones involving print, verify WYSIWYG accuracy
- **Data Persistence Testing**: Verify data survives page refresh
- **Browser Testing**: Test in target browsers (Chrome, Firefox, Safari, Edge)

## Recent Work Completed

### Test Infrastructure Improvements (December 2024)
- ✅ Combined `TEST_TIMING_NOTES.md` and `TIMING_ISSUES_REVIEW.md` into single comprehensive document
- ✅ Fixed timing issues: stale element references and missing timeouts
- ✅ Improved test wait strategies for state changes
- ✅ Enhanced test reliability with better timeout handling

### Bug Fixes
- ✅ **042**: Fixed main drag-and-drop bug where placeholder IDs caused queries to get stuck
  - Implemented `stableLists` pattern with reactive query validation
  - ⚠️ Edge case remains (see 078) - rare "Loading tasks..." after rapid drags

## Definition of Done

Each milestone is considered complete when:
1. All acceptance criteria are met
2. Code is in `4-src/` folder (not `5-dist/`)
3. Application builds successfully
4. Manual testing passes
5. Data persists across page refreshes (where applicable)
6. No console errors in browser
