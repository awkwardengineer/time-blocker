# Master Project Plan: Paper-Loving Digital Task Planner

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
| 030 | [[030-task-crud-ordering\|Task CRUD & State Management]] | Pending | Create, delete, manage task states (+ empty task state behavior) | Task creation, task deletion, task state management (unchecked → checked → archived), restore functionality. Empty task state behavior. No formatting focus. |
| 031 | [[031-task-reordering\|Task Reordering]] | Pending | Reorder tasks within lists | Task reordering via drag-and-drop or buttons. Order persistence in IndexedDB. Only affects unchecked/checked tasks. No formatting focus. |
| 032 | [[032-task-ux-behaviors\|Task UX Behaviors]] | Pending | Refine task interaction patterns | Enter key behavior, focus management, click behaviors, keyboard navigation. Interaction polish for task creation and editing. No formatting focus. |
| 040 | [[040-list-crud-ordering\|List CRUD & Ordering]] | Pending | Create, delete, reorder lists (+ empty list state behavior) | List creation, list deletion, list sorting. Empty list state behavior (what happens when no lists exist). No formatting focus. |
| 050 | [[050-drag-between-lists\|Drag Between Lists]] | Pending | Move tasks between lists | Task drag and drop between lists. Update task's list association in IndexedDB. Maintain order within destination list. |
| 060 | [[060-styling-polish\|Styling & Polish]] | Pending | Visual design, empty state appearance, print layout | Visual design implementation, empty state appearance (polish the functional empty states), print layout styling, responsive design |

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
