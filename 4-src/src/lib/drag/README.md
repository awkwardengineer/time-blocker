# Drag-and-Drop Architecture

This directory contains the refactored drag-and-drop implementation, designed to be library-agnostic and maintainable.

## Overview

The drag-and-drop system has been refactored to:
- **Abstract away the drag library** - Components don't know about `svelte-dnd-action`
- **Separate concerns** - Drag logic, keyboard handling, and state management are in separate modules
- **Enable future migration** - Easy to swap out `svelte-dnd-action` for another library

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Components (TaskList, Board)              │
│  - Use dragAdapter.js (library-agnostic interface)         │
│  - Use extracted handlers and utilities                     │
│  - Manage component-specific state                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    dragAdapter.js                            │
│  - Wraps svelte-dnd-action                                  │
│  - Provides standardized interface                          │
│  - Only file that knows about drag library                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Drag Handlers & Utilities                       │
│  - taskDragHandlers.js: Task drag logic                     │
│  - taskKeyboardDrag.js: Keyboard drag handling             │
│  - capturePhaseHandlers.js: Event interception             │
│  - dragDetectionUtils.js: Library-specific detection        │
│  - syncDragState.js: State synchronization                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

### `dragAdapter.js`
**Purpose**: Abstraction layer that wraps the drag library.

- **`createDragZone(node, params)`** - Creates a drag zone (Svelte action)
- **`handleDragConsider(event, handler)`** - Handles consider events
- **`handleDragFinalize(event, handler)`** - Handles finalize events

**Why it exists**: When migrating to a new drag library, only this file needs to change. Components remain unchanged.

### `taskDragHandlers.js`
**Purpose**: Pure functions for task drag-and-drop logic.

- **`processTaskConsider(items)`** - Processes consider events (visual feedback)
- **`processTaskFinalize(items, listId)`** - Processes finalize events (database updates)
- **`findNeighborListId(...)`** - Finds adjacent lists for cross-list movement
- **`moveTaskToNextList(...)`** / **`moveTaskToPreviousList(...)`** - Moves tasks between lists

**Why it exists**: Separates drag logic from components, making it testable and reusable.

### `taskKeyboardDrag.js`
**Purpose**: Keyboard-based drag handling (Enter/Space to start, Arrow keys to move).

- **`createTaskItemKeydownCaptureHandler(...)`** - Handles keyboard drag start/stop
- **`createTaskItemBlurHandler(...)`** - Handles blur events for Tab resume
- **`setupTaskKeyboardDragDocumentHandler(...)`** - Document-level keyboard handler

**Why it exists**: Keyboard drag is complex and deserves its own module. Mirrors `useKeyboardListDrag.js` pattern.

### `capturePhaseHandlers.js`
**Purpose**: Capture-phase event handlers that prevent the drag library from intercepting keyboard events.

- **`setupListTitleKeydownCapture(...)`** - Prevents drag library from intercepting Enter/Space on list title
- **`setupAddTaskButtonKeydownCapture(...)`** - Prevents drag library from intercepting Enter/Space on Add Task button
- **`setupTaskTextKeydownCapture(...)`** - Prevents drag library from intercepting Enter/Space on task text, handles cross-list boundary movement

**Why it exists**: Uses capture phase (`addEventListener(..., true)`) to run before drag library handlers, allowing us to prevent library from intercepting keyboard events on interactive elements.

### `dragDetectionUtils.js`
**Purpose**: Library-specific DOM queries and detection logic.

- **`isDragActive()`** - Checks if a drag is currently active
- **`getDraggedElements()`** - Gets currently dragged elements
- **`hasActiveDropZone(element)`** - Checks if element has active drop zone
- **`dispatchEscapeEvent(element)`** - Dispatches escape event to cancel drag

**Why it exists**: Abstracts away library-specific DOM queries. When migrating, update these functions to match the new library's DOM structure.

### `syncDragState.js`
**Purpose**: Synchronizes `liveQuery` results to mutable drag state.

- **`syncTasksForDrag(tasksQuery)`** - Syncs tasks, filtering out archived
- **`syncListsForDrag(listsQuery)`** - Syncs lists with transformation

**Why it exists**: The drag library needs mutable arrays, but `liveQuery` results are reactive and shouldn't be mutated. This creates a "safe copy" that the drag library can mutate.

## Drag Flow

### Mouse/Touch Drag Flow

1. **User starts drag** → Drag library detects drag start
2. **`consider` event fires** → `handleDragConsider` → `processTaskConsider`
   - Filters out invalid items (placeholders)
   - Updates `draggableTasks` for visual feedback
   - **No database updates** - just visual reordering
3. **User drops** → `finalize` event fires → `handleDragFinalize` → `processTaskFinalize`
   - Filters out invalid items
   - Updates database (`updateTaskOrder` or `updateTaskOrderCrossList`)
   - Updates `draggableTasks` with valid items
   - `liveQuery` automatically updates → syncs back to `draggableTasks`

### Keyboard Drag Flow

1. **User presses Enter/Space on task** → `createTaskItemKeydownCaptureHandler` detects
   - Sets `isKeyboardTaskDragging = true`
   - Stores `lastKeyboardDraggedTaskId`
2. **User presses Arrow keys** → `setupTaskKeyboardDragDocumentHandler` handles
   - Moves task within list (via drag library)
   - At boundaries: `setupTaskTextKeydownCapture` intercepts
   - Calls `moveTaskToNextList` / `moveTaskToPreviousList` for cross-list movement
3. **User presses Enter/Space again** → Drop
   - Sets `isKeyboardTaskDragging = false`
   - Stores element for Tab resume behavior
4. **User presses Tab** → Focus resumes on dropped task (Tab resume behavior)

## State Management Pattern

### The Problem

The drag library (`svelte-dnd-action`) needs to **mutate arrays** during drag operations:
- Adds placeholder items for visual feedback
- Reorders items for visual feedback
- Changes array structure during drag

But `liveQuery` results are **reactive and should not be mutated**:
- Mutating `liveQuery` can cause query recreation/duplication
- Can lead to "Loading tasks..." stuck states
- Can cause components to remount unexpectedly

### The Solution

Create a **"safe copy"** that the drag library can mutate:

```
liveQuery (reactive, immutable)
    │
    ▼ (one-way sync)
draggableTasks (mutable, safe to mutate)
    │
    ▼ (drag library mutates this)
Visual feedback during drag
    │
    ▼ (on finalize)
Database update
    │
    ▼ (liveQuery updates automatically)
Sync back to draggableTasks
```

### Implementation

In `TaskList.svelte`:

```javascript
// Source of truth: liveQuery (reactive, immutable)
let tasksQuery = $state(null);

// Safe copy: draggableTasks (mutable, safe for drag library)
let draggableTasks = $state([]);

// Sync liveQuery → draggableTasks (one-way)
$effect(() => {
  if ($tasksQuery && Array.isArray($tasksQuery)) {
    draggableTasks = syncTasksForDrag($tasksQuery);
  }
  // If query is undefined/null (loading), don't update draggableTasks
  // This preserves the current state during drag operations
});
```

**Key points**:
- `liveQuery` is the source of truth (never mutated)
- `draggableTasks` is a safe copy (can be mutated by drag library)
- Sync only happens when query is ready (not during loading/drag)
- After drag: database update → `liveQuery` updates → syncs back

## Keyboard Event Handling

### Capture Phase Handlers

Some keyboard events need to be intercepted **before** the drag library handles them:

- **List title** - Enter/Space should open edit modal, not start drag
- **Add Task button** - Enter/Space should activate input, not start drag
- **Task text** - Enter/Space should open edit modal, not start drag
- **Cross-list boundaries** - Arrow keys at boundaries should move to next/previous list

These handlers use **capture phase** (`addEventListener(..., true)`) to run before the drag library's handlers.

### Keyboard Drag State

Keyboard drag uses state to track:
- `isKeyboardTaskDragging` - Whether keyboard drag is active
- `lastKeyboardDraggedTaskId` - ID of task being dragged
- `lastBlurredTaskElement` - Element to refocus on next Tab
- `shouldRefocusTaskOnNextTab` - Whether to refocus on next Tab

This state enables **Tab resume behavior**: after a keyboard drop, the next Tab press refocuses the dropped task.

## Migration Guide

To migrate to a new drag library:

1. **Update `dragAdapter.js`**:
   - Replace `dndzone` import with new library
   - Update `createDragZone` to use new library's API
   - Update `handleDragConsider` / `handleDragFinalize` to extract items from new event format

2. **Update `dragDetectionUtils.js`**:
   - Update DOM queries to match new library's DOM structure
   - Update `isDragActive()`, `getDraggedElements()`, etc.

3. **Test**:
   - All existing tests should pass (they use the adapter interface)
   - Verify mouse/touch drag works
   - Verify keyboard drag works
   - Verify cross-list movement works

**Components remain unchanged** - they use the adapter interface, not the library directly.

## Related Files

- `4-src/src/components/TaskList.svelte` - Uses drag adapter and handlers
- `4-src/src/components/Board.svelte` - Uses drag adapter for list dragging
- `4-src/src/components/ListColumn.svelte` - Uses drag adapter for list dragging
- `4-src/src/lib/listDragHandlers.js` - List drag handlers (similar pattern)

## History

This architecture was created during the refactoring in December 2024 (branch `079-refactor`). The goal was to:
- Reduce `TaskList.svelte` from 1161 lines to <800 lines (achieved: 723 lines)
- Make drag-and-drop library-agnostic
- Improve maintainability and testability
- Prepare for potential migration to a more reliable drag library

See `3-project-plans/079-refactor-and-migration-plan.md` for the full refactoring plan.

