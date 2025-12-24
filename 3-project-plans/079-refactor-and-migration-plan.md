# 079: Refactor and Migration Plan

## Goal
Refactor the drag-and-drop implementation to improve maintainability and prepare for migrating to a more reliable drag-and-drop library. This milestone focuses on code organization first, then prototyping and testing alternative libraries before committing to a migration.

## Background
The current implementation uses `svelte-dnd-action` (v0.9.68) and has several issues:
- **Unresolved edge cases**: Resize bug partially fixed, sliding/offset issue remains (see [[078-drag-edge-case-bug]])
- **Complex workarounds**: Polling, dimension locking attempts, timing hacks
- **Large component files**: `TaskList.svelte` is ~1161 lines, mixing drag logic with component logic
  - Drag handlers: ~50 lines (consider/finalize)
  - Keyboard drag logic: ~300 lines (state management, event handlers, Tab resume behavior)
  - Capture-phase handlers: ~150 lines (prevent library from intercepting keyboard events)
  - Cross-list boundary movement: ~100 lines (Arrow key handlers at list boundaries)
  - Library-specific detection: ~100 lines (DOM queries for dragged elements, drop zones)
  - Focus management: ~100 lines (Tab resume, focus restoration)
- **Complex state management**: `draggableTasks`/`draggableLists` syncing pattern adds complexity
- **Hard to test**: Drag logic tightly coupled to components
- **Library-specific code scattered**: Direct references to `svelte-dnd-action` API, DOM queries for library-specific classes/attributes (`aria-grabbed`, `svelte-dnd-action-dragged`, box-shadow detection) throughout components

Refactoring first will:
- Make migration easier (less code to move)
- Improve testability (isolated drag handlers)
- Reduce risk (can test new library alongside old one)
- Improve maintainability regardless of migration outcome

## Acceptance Criteria

### Part 1: Refactoring
- [x] Drag handlers extracted from components into separate modules
- [x] Keyboard drag logic extracted (state management, event handlers, Tab resume behavior)
- [ ] Capture-phase keyboard handlers extracted (prevent library interception)
- [x] Cross-list boundary movement logic extracted
- [x] Library-specific code abstracted behind adapter/detection utilities
- [x] Components are library-agnostic (only adapter knows about `svelte-dnd-action`)
- [ ] `TaskList.svelte` reduced to <800 lines (target: <600 lines) - Current: 1080 lines (81 lines removed)
- [ ] Drag-related state management simplified or abstracted
- [x] All existing tests pass after refactoring
- [x] No functionality changes (refactor only, no behavior changes)
- [x] Code is more maintainable and testable
- [ ] Future library migration will only require updating adapter layer

### Part 2: Prototyping and Testing
- [ ] At least 2 alternative libraries evaluated with working prototypes
- [ ] Prototype demonstrates: within-list drag, cross-list drag, keyboard support, mobile touch
- [ ] Performance comparison documented (old vs new)
- [ ] Edge cases from milestone 078 tested in prototype
- [ ] Migration decision documented with rationale
- [ ] If migration approved: feature flag implementation ready for parallel testing

### Part 3: Cutover (If Migration Approved)
- [ ] New library integrated via adapter pattern
- [ ] Feature flag allows switching between old and new implementations
- [ ] All existing tests pass with new library
- [ ] Manual testing confirms all drag functionality works
- [ ] Mobile testing confirms touch interactions work
- [ ] Performance meets or exceeds old implementation
- [ ] Old library removed from codebase
- [ ] Feature flag removed after successful cutover
- [ ] Documentation updated

## Implementation Steps

### Part 1: Refactoring

**File Structure After Refactoring:**
```
src/lib/drag/
├── dragAdapter.js              # Adapter wrapping svelte-dnd-action API
├── dragDetectionUtils.js       # Library-specific detection utilities
├── taskDragHandlers.js         # Task drag handlers (consider/finalize)
├── taskKeyboardDrag.js         # Task keyboard drag state & handlers
├── capturePhaseHandlers.js     # Capture-phase keyboard handlers
├── listDragHandlers.js         # List drag handlers (already exists)
├── useKeyboardListDrag.js      # List keyboard drag (already exists)
└── README.md                   # Architecture documentation
```

**Extraction Order (Recommended):**
1. Extract detection utilities first (needed by other modules)
2. Extract drag handlers (simplest, least dependencies)
3. Extract keyboard drag logic (depends on detection utils)
4. Extract capture-phase handlers (depends on keyboard drag)
5. Create adapter layer (wraps everything)
6. Update components to use extracted modules

#### 1. **Extract Task Drag Handlers** ✅
   - ✅ Create `src/lib/drag/taskDragHandlers.js`
   - ✅ Move `handleConsider` and `handleFinalize` logic from `TaskList.svelte` (lines 322-329, 604-623)
   - ✅ Extract validation logic (placeholder detection, item filtering - currently filters items with numeric IDs)
   - ✅ Extract order calculation logic
   - ✅ Extract cross-list movement helpers: `moveTaskToNextList`, `moveTaskToPreviousList` (lines 295-319)
   - ✅ Extract boundary detection logic: `findNeighborListId`, `getListsInColumnOrder` (lines 62-101)
   - ✅ Make handlers pure functions where possible (take state as parameters, return new state)
   - ✅ Update `TaskList.svelte` to use extracted handlers
   - ✅ All tests pass (177 passed, 1 skipped)
   - ✅ File size reduced: 1161 → 1080 lines (81 lines removed)

#### 2. **Extract List Drag Handlers** ✅
   - ✅ Review existing `src/lib/listDragHandlers.js` (already extracted)
   - ✅ Ensure all list drag logic is in this file
   - ✅ Move any remaining drag logic from `Board.svelte` or `ListColumn.svelte`
     - ✅ Extracted `processListFinalize` function (was inline in `handleListFinalize`)
     - ✅ Extracted `filterValidListItems` utility function
   - ✅ Verify handlers are pure functions
   - ✅ Updated `Board.svelte` to use `processListFinalize`
   - ✅ Removed unused imports (`isPlaceholderItem`, `updateListOrderWithColumn` from Board.svelte)

#### 3. **Extract Task Keyboard Drag Logic** ✅
   - ✅ Create `src/lib/drag/taskKeyboardDrag.js` (mirroring structure of `useKeyboardListDrag.js` for lists)
   - ✅ Extract keyboard drag state management:
     - ✅ `isKeyboardTaskDragging`, `lastKeyboardDraggedTaskId` (lines 52-53)
     - ✅ `lastBlurredTaskElement`, `shouldRefocusTaskOnNextTab` (lines 47-48)
   - ✅ Extract keyboard drag event handlers:
     - ✅ `createTaskItemKeydownCaptureHandler` - capture-phase handler for task items
     - ✅ `createTaskItemBlurHandler` - blur handler for keyboard drag tracking
     - ✅ `setupTaskKeyboardDragDocumentHandler` - document-level handler for Tab/Escape/Arrow key handling
   - ✅ Extract library-specific detection utilities (Step 4, done early):
     - ✅ Created `src/lib/drag/dragDetectionUtils.js` for library-specific queries
     - ✅ Active drag detection (checking for `aria-grabbed`, `svelte-dnd-action-dragged` classes)
     - ✅ Drop zone detection (checking for box-shadow styles on ul elements)
   - ✅ Extract cross-list boundary movement keyboard handlers (lines 241-293, 550-592)
   - ✅ Separate keyboard drag from mouse drag logic
   - ✅ Updated `TaskList.svelte` to use extracted handlers
   - ✅ All tests pass (keyboard drag test passes, fixed flaky test)
   - ✅ File size reduced: 1080 → 841 lines (239 lines removed)
   - Note: Task keyboard drag is more complex than list keyboard drag due to:
     - Cross-list boundary movement at first/last task
     - Multiple capture-phase handlers to prevent library interception
     - Tab resume behavior after keyboard drop

#### 4. **Create Library Detection Utilities** ✅ (Done early, needed by step 3)
   - ✅ Create `src/lib/drag/dragDetectionUtils.js` (extract BEFORE adapter, needed by keyboard drag)
   - ✅ Abstract library-specific DOM queries:
     - ✅ `isDragActive()` - detect if drag is currently active (library-agnostic interface)
       - Currently checks for `li[aria-grabbed="true"]`, `li.svelte-dnd-action-dragged`
       - Checks for active drop zones via box-shadow detection
     - ✅ `getDraggedElements()` - get currently dragged elements
     - ✅ `hasActiveDropZone(element)` - check if element has active drop zone styling
       - Currently checks for `boxShadow` with `inset` keyword
     - ✅ `getAllActiveDropZones()` - get all active drop zones (for cross-list drags)
   - ✅ These utilities abstract away library-specific DOM queries
   - ✅ All library-specific class names, attributes, and style detection go here
   - ✅ When migrating to new library, only this file needs updating for detection logic

#### 5. **Create Drag Adapter/Abstraction Layer** ✅
   - ✅ Create `src/lib/drag/dragAdapter.js`
   - ✅ Abstract `svelte-dnd-action` API behind a consistent interface
   - ✅ Define standard drag events/handlers that any library could implement
   - ✅ This makes switching libraries easier later
   - ✅ Extract library-specific code:
     - ✅ `createDragZone` action wrapper (replaces `use:dndzone` in components)
       - Wraps `dndzone` from `svelte-dnd-action`
       - Standardizes configuration options
       - Handles Svelte action signature (node, params)
     - ✅ Event handlers (`handleDragConsider`, `handleDragFinalize`)
       - Components use adapter handlers instead of accessing `event.detail.items` directly
       - Adapter extracts items from library-specific event format
       - Supports async handlers for finalize events
     - ✅ Configuration options (`dropTargetStyle`, `zoneTabIndex`, `type`)
       - Standardized config interface, maps to library-specific options
   - ✅ Updated all components to use adapter:
     - ✅ `TaskList.svelte` - uses `createDragZone`, `handleDragConsider`, `handleDragFinalize`
     - ✅ `ListColumn.svelte` - uses `createDragZone`
     - ✅ `Board.svelte` - uses `handleDragConsider`, `handleDragFinalize`
   - ✅ Components no longer directly reference `svelte-dnd-action`
   - ✅ When migrating to new library, only adapter needs updating (components unchanged)
   - ✅ All tests pass (177 passed, 1 skipped)

#### 6. **Simplify State Management** ✅
   - ✅ Review `draggableTasks`/`draggableLists` pattern
   - ✅ Document why the current pattern exists (protects liveQuery from mutation by drag library)
   - ✅ Created `src/lib/drag/syncDragState.js` utility with comprehensive documentation
   - ✅ Extracted sync logic into reusable utility functions:
     - `syncTasksForDrag()` - syncs tasks with filtering (excludes archived)
     - `syncListsForDrag()` - syncs lists with transformation
   - ✅ Simplified sync logic in components (removed unnecessary `previousDraggableListsCount` tracking)
   - ✅ Fixed infinite loop issue (removed circular dependency in effects)
   - ✅ Updated `TaskList.svelte` and `Board.svelte` to use utility functions
   - ✅ All tests pass (177 passed, 1 skipped)
   - **Conclusion**: Pattern is necessary - drag library needs mutable array, liveQuery must be protected

#### 7. **Extract Capture-Phase Keyboard Handlers** ✅
   - ✅ Created `src/lib/drag/capturePhaseHandlers.js` module
   - ✅ Extracted capture-phase handlers that prevent drag library from intercepting keyboard events:
     - `setupListTitleKeydownCapture()` - prevents library from intercepting Enter/Space on list title
     - `setupAddTaskButtonKeydownCapture()` - prevents library from intercepting Enter/Space on Add Task button
     - `setupTaskTextKeydownCapture()` - prevents library from intercepting Enter/Space on task text, handles cross-list boundary movement
   - ✅ These handlers use capture phase (`addEventListener(..., true)`) to run before drag library
   - ✅ Abstracted library-specific event prevention logic into reusable factory functions
   - ✅ Updated `TaskList.svelte` to use extracted handlers (reduced from ~841 to ~723 lines, ~118 lines removed)
   - ✅ All tests pass (177 passed, 1 skipped)

#### 8. **Reduce Component Size** ✅
   - ✅ Extracted drag handlers (step 1)
   - ✅ Extracted keyboard drag logic (step 2)
   - ✅ Extracted capture-phase handlers (step 7)
   - ✅ Simplified state management (step 6)
   - ✅ Target achieved: `TaskList.svelte` reduced from 1161 to 723 lines (38% reduction, well below <800 target)
   - ✅ Component now focused on rendering and user interaction
   - ✅ Business logic moved to handlers/utilities
   - **Note**: Remaining code is appropriate component-specific logic (task creation, editing, archiving, modal handling)

#### 9. **Update Component Imports and Usage** ✅
   - ✅ Updated `TaskList.svelte` to import from new modules:
     - ✅ `taskDragHandlers` (processTaskConsider, processTaskFinalize)
     - ✅ `taskKeyboardDrag` (createTaskItemKeydownCaptureHandler, createTaskItemBlurHandler, setupTaskKeyboardDragDocumentHandler)
     - ✅ `dragAdapter` (createDragZone, handleDragConsider, handleDragFinalize)
     - ✅ `capturePhaseHandlers` (setupListTitleKeydownCapture, setupAddTaskButtonKeydownCapture, setupTaskTextKeydownCapture)
     - ✅ `syncDragState` (syncTasksForDrag)
   - ✅ Updated `ListColumn.svelte` to use `dragAdapter` (createDragZone)
   - ✅ Updated `Board.svelte` to use `dragAdapter` (handleDragConsider, handleDragFinalize) and `syncDragState` (syncListsForDrag)
   - ✅ Replaced all library-specific code with adapter/utility calls
   - ✅ Verified components are now library-agnostic (only `dragAdapter.js` knows about `svelte-dnd-action`)
   - ✅ All tests pass (177 passed, 1 skipped)

#### 10. **Update Tests** ✅
   - ✅ Updated `App.taskKeyboardDrag.test.js`:
     - Updated comments to reference adapter instead of library directly
     - Mock still works (mocks library at adapter dependency level)
   - ✅ Updated `App.dragAndDrop.test.js`:
     - Removed library-specific selector (`ul[use\\:dndzone]`)
     - Now uses generic `ul` selector (adapter-agnostic)
     - Added comment explaining adapter usage
   - ✅ All drag-related tests pass:
     - `App.dragAndDrop.test.js`: 8 passed
     - `App.taskKeyboardDrag.test.js`: 1 passed
     - `App.listKeyboardDrag.test.js`: 2 passed
   - ✅ Test coverage maintained - all drag functionality still tested
   - **Note**: Some unrelated flaky tests exist in other test files (not drag-related)
   - **Future**: Unit tests for extracted modules can be added as needed, but integration tests provide good coverage

#### 11. **Document Refactored Structure** ✅
   - ✅ Created comprehensive README.md in `src/lib/drag/` explaining:
     - Architecture overview and file structure
     - Purpose of each module
     - Drag flow (consider → finalize → database update)
     - State management pattern (liveQuery → draggableTasks)
     - Keyboard event handling
     - Migration guide for future library changes
   - ✅ Updated code comments in components:
     - TaskList.svelte: Added drag flow documentation to handleConsider and handleFinalize
     - Board.svelte: Added drag flow documentation to handleListConsider and handleListFinalize
     - All comments reference src/lib/drag/README.md for full documentation
   - ✅ All tests pass (177 passed, 1 skipped)

### Part 2: Prototyping and Testing Alternative Libraries

#### 1. **Research and Evaluate Alternatives** 🔍
   - **Primary candidates:**
     - ✅ **`sortablejs`** (direct integration, no wrapper needed)
       - **Status**: Actively maintained (as of May 2025)
       - **Pros**: 
         - Mature, well-documented
         - Good mobile/touch support
         - Framework-agnostic (works with Svelte)
         - No dependencies (no jQuery)
         - Handles nested containers
         - Built on HTML5 drag-and-drop API
       - **Cons**: 
         - No official Svelte wrapper (need direct integration)
         - May need manual Svelte reactivity handling
         - Need to verify keyboard support
       - **Note**: `svelte-sortablejs` wrapper is NOT maintained (last release 7 years ago) - use SortableJS directly
     - `@dnd-kit/core` (if Svelte adapter exists)
       - Pros: Modern, well-maintained, good TypeScript support
       - Cons: React-focused, may not have good Svelte support
     - Custom implementation using Pointer Events
       - Pros: Full control, no library quirks
       - Cons: Significant development time, need to handle all edge cases
   - **Evaluation criteria:**
     - Svelte 5 compatibility
     - Nested drop zones support (lists in columns, tasks in lists)
     - Mobile/touch support
     - Keyboard drag support ⚠️ (need to verify)
     - Bundle size
     - Documentation quality
     - Maintenance status
     - Community adoption
   - **Research findings (Dec 2024)**:
     - SortableJS can be integrated directly into Svelte using `onMount`
     - Need to handle Svelte reactivity manually (update state in `onEnd` event)
     - Community examples available on Stack Overflow
     - Keyboard support needs verification

#### 2. **Create Minimal Prototype Environment** ✅
   - ✅ Create `src/prototypes/dnd-prototype/` directory
   - ✅ Set up isolated prototype with minimal dependencies
   - ✅ Create simple test page with:
     - ✅ One list with 5-10 tasks (SortableJSPrototype has 2 lists with tasks)
     - ✅ Basic drag within list
     - ✅ Cross-list drag (2 lists)
     - ✅ Keyboard drag support (implemented in SortableJSNestedPrototype)
     - ⚠️ Mobile touch testing capability (SortableJS supports it natively, but not explicitly tested)
   - ✅ **Use separate route to access prototype** (not feature flag)
     - ✅ Add route like `/prototype/sortablejs` or `/prototype/dnd`
     - ✅ Keep prototype isolated from main app
     - ✅ Use hash-based routing or pathname check (vanilla Svelte, no SvelteKit)
     - ✅ Update `main.js` to conditionally mount prototype or main app based on route

#### 3. **Prototype Library 1: sortablejs** ✅
   - ✅ Install `sortablejs` (NOT `svelte-sortablejs` - it's unmaintained)
   - ✅ Integrate directly using `onMount` lifecycle
   - ✅ Implement basic drag within list
   - ✅ Implement cross-list drag (using `group` option)
   - ✅ Test nested containers (lists in columns)
   - ✅ Test keyboard support (custom implementation required - see SORTABLEJS_FINDINGS.md)
   - ⚠️ Test mobile touch (SortableJS supports it natively, but not explicitly tested)
   - ✅ Handle Svelte reactivity:
     - ✅ Update state in `onEnd` event
     - ✅ Ensure `draggableTasks` updates correctly
     - ✅ Test with liveQuery pattern (prototype uses $state, pattern documented)
   - ✅ Document:
     - ✅ Setup complexity (documented in SORTABLEJS_FINDINGS.md)
     - ✅ API differences from svelte-dnd-action (documented in SORTABLEJS_FINDINGS.md)
     - ✅ How to handle Svelte reactivity (documented in SORTABLEJS_FINDINGS.md)
     - ⚠️ Performance observations (not formally measured, but no issues observed)
     - ✅ Any issues encountered (documented in SORTABLEJS_FINDINGS.md)
     - ⚠️ Bundle size impact (not measured)
     - ✅ Keyboard support status (documented in SORTABLEJS_FINDINGS.md - custom implementation required)

#### 4. **Prototype Library 2: Alternative or Custom** ❌ SKIPPED
   - ~~If `sortablejs` doesn't work well, try second option~~
   - ~~Or prototype custom Pointer Events implementation~~
   - ~~Same testing as Library 1~~
   - ~~Document findings~~
   - **Decision**: SortableJS works well, no need for alternative library

#### 5. **Test Edge Cases from Milestone 078** ✅
   - ✅ Test resize bug scenario (does it occur with new library?) - Not observed in prototype
   - ✅ Test sliding/offset issue (does it occur with new library?) - Not observed in prototype
   - ✅ Test rapid drag operations - Works correctly
   - ✅ Test drag with many items - Works correctly
   - ✅ Test drag with empty lists - Works correctly (empty drop zones implemented)
   - ✅ Test drag across columns - Works correctly (nested prototype tested)
   - ✅ Document results - Documented in SORTABLEJS_FINDINGS.md

#### 6. **Performance Comparison** ⚠️ OPTIONAL
   - Measure drag performance:
     - Time to start drag
     - Smoothness during drag (FPS)
     - Time to complete drag
     - Memory usage during drag
   - Compare old library vs prototypes
   - Test on mobile device if possible
   - Document findings
   - **Note**: Not formally measured, but no performance issues observed during prototype testing. Can be done later if needed.

#### 7. **Migration Decision** ✅
   - ✅ Review all prototype findings
   - ✅ Compare against current implementation
   - ✅ Consider:
     - ✅ Will new library solve current issues? - Yes, no weird issues observed in prototype
     - ✅ Migration effort required - Low to medium (most code can be reused)
     - ✅ Risk vs benefit - Low risk, high benefit (faster implementation, no weird bugs)
     - ✅ Maintenance burden - SortableJS is actively maintained
   - ✅ **Decision**: **APPROVED** - SortableJS works well in prototype, no weird issues, faster to implement than expected
   - ✅ Proceed to migration planning (Part 3)

#### 8. **Prepare Feature Flag (If Migration Approved)** ❌ SKIPPED
   - ~~Create feature flag: `USE_NEW_DND_LIBRARY`~~
   - ~~Implement adapter pattern to support both libraries~~
   - ~~Ensure both implementations can coexist~~
   - ~~Set up parallel testing capability~~
   - ~~Document how to switch between implementations~~
   - **Decision**: Adapter pattern already exists in `dragAdapter.js`. No feature flag needed - just update the adapter implementation directly. Can use simple config switch if needed for testing.

### Part 3: Cutover (If Migration Approved)

#### 1. **Update Adapter to Use SortableJS**
   - Update `src/lib/drag/dragAdapter.js` to use SortableJS instead of `svelte-dnd-action`
   - Implement SortableJS initialization in `createDragZone()`:
     - Use `onMount` pattern (or Svelte action lifecycle)
     - Create Sortable instances with proper configuration
     - Handle `onStart` and `onEnd` callbacks
     - Map SortableJS events to existing adapter interface
   - Update `handleDragConsider()` to work with SortableJS (if needed for visual feedback)
   - Update `handleDragFinalize()` to extract data from SortableJS `onEnd` event
   - **Note**: Components already use adapter interface - they won't need changes
   - Test adapter in isolation with simple test cases

#### 2. **Create Drop Zone Utilities**
   - Extract `applyDropZoneStyles()` and `removeDropZoneStyles()` from prototype
   - Create `src/lib/drag/dropZoneUtils.js`:
     - `applyDropZoneStyles(element)` - Apply drop zone visual feedback
     - `removeDropZoneStyles(element)` - Remove drop zone visual feedback
     - `updateDropZonesForDrag(dragType, draggedItemId)` - Show appropriate drop zones
   - Use `box-shadow: inset` instead of `border` to avoid layout shifts
   - Apply inline styles as fallback (Tailwind may override CSS classes)
   - Test drop zone utilities in isolation

#### 3. **Create Visual Feedback Utilities**
   - Extract visual feedback helpers from prototype
   - Create `src/lib/drag/visualFeedbackUtils.js`:
     - `applyGrabbedState(element)` - Apply grabbed item styling
     - `removeGrabbedState(element)` - Remove grabbed item styling
     - `maintainFocus(element)` - Ensure element maintains focus for focus ring
   - Ensure grabbed items maintain focus (call `element.focus()` after applying styles)
   - Test visual feedback utilities

#### 4. **Update Drag Detection Utilities**
   - Update `src/lib/drag/dragDetectionUtils.js` for SortableJS:
     - `isDragActive()` - Detect SortableJS drag state (check for dragged elements)
     - `getDraggedElements()` - Find elements being dragged (SortableJS uses different classes/attributes)
     - `hasActiveDropZone(element)` - Check for active drop zones (may need different detection)
   - Keep same interface - only implementation changes
   - Test detection utilities work correctly

#### 5. **Update Task Drag Implementation**
   - **Components**: `TaskList.svelte` already uses adapter - no changes needed
   - **Handlers**: `taskDragHandlers.js` should work as-is (pure functions)
   - **State sync**: `syncDragState.js` pattern still applies (liveQuery → draggableTasks)
   - **SortableJS setup**: Add SortableJS initialization in `TaskList.svelte`:
     - Initialize Sortable instance for task list in `onMount`
     - Handle `onStart` to show drop zones (call `updateDropZonesForDrag()`)
     - Handle `onEnd` to update state (call existing `handleDragFinalize` → `processTaskFinalize`)
     - Manage Sortable instance lifecycle (destroy on component destroy)
   - Test task drag within list
   - Test task drag between lists (cross-list)
   - Test task drag between columns (cross-column)
   - Verify all edge cases work

#### 6. **Update List Drag Implementation**
   - **Components**: `ListColumn.svelte` and `Board.svelte` already use adapter - minimal changes
   - **Handlers**: `listDragHandlers.js` should work as-is
   - **SortableJS setup**: Add SortableJS initialization:
     - Initialize Sortable instances for columns in `Board.svelte`
     - Handle `onStart` to show drop zones
     - Handle `onEnd` to update state
     - Handle reinitialization after list moves (destroy/recreate task sortables)
   - **Reinitialization pattern**: Use prototype pattern:
     ```javascript
     await tick() // Wait for Svelte DOM updates
     await tick() // Extra tick for bindings
     await new Promise(r => setTimeout(r, 100)) // Wait for actions
     // Then reinitialize task sortables
     ```
   - Test list drag within column
   - Test list drag between columns
   - Verify task sortables reinitialize correctly after list moves

#### 7. **Adapt Keyboard Drag Handlers**
   - **Existing handlers**: `taskKeyboardDrag.js` already has the right architecture
   - **Adapt for SortableJS**:
     - Update to work with SortableJS state updates instead of `svelte-dnd-action` events
     - Use direct state manipulation (Option 2 from spec) - simpler than simulating SortableJS
     - Update `moveTaskWithKeyboard()` to directly update state arrays
     - Ensure `draggedItemElement` reference is updated after moves (use `tick()`)
   - **State management**: Add mouse drag state tracking:
     - Track `isMouseDragging` separately from `isKeyboardDragging`
     - Coordinate drop zone cleanup (don't clear if mouse drag is active)
   - **Focus management**: Ensure grabbed items maintain focus (from lessons learned)
   - **Event handling**: Use capture phase and `stopImmediatePropagation()` (already in place)
   - Test keyboard drag for tasks
   - Test keyboard drag for lists
   - Test keyboard drag across lists/columns
   - Test Tab resume behavior
   - Test Escape to cancel/blur

#### 8. **Update Tests**
   - Update test helpers in test files:
     - Update drag simulation functions to work with SortableJS
     - Update selectors (no longer `use:dndzone`, use generic selectors)
     - Mock SortableJS if needed for unit tests
   - **Test strategy** (from recommendations):
     - Test keyboard drag separately from mouse drag
     - Test interactions between mouse and keyboard drag
     - Test drop zone utilities in isolation
     - Test visual feedback utilities
   - Ensure all existing tests pass with new library
   - Add tests for SortableJS-specific behavior:
     - Reinitialization after list moves
     - Multiple Sortable instance management
     - Drop zone coordination between mouse and keyboard
   - Verify test coverage maintained or improved
   - Run full test suite: `npm test`

#### 9. **Comprehensive Manual Testing**
   - Test all drag scenarios manually:
     - Task drag within list (mouse)
     - Task drag between lists (mouse)
     - Task drag between columns (mouse)
     - List drag within column (mouse)
     - List drag between columns (mouse)
     - Keyboard drag for tasks (all scenarios from prototype)
     - Keyboard drag for lists
     - Mobile touch drag
   - **Test keyboard drag thoroughly** (from lessons learned):
     - Enter/Space to start drag
     - Arrow keys to move (within list, between lists, between columns)
     - Enter/Space/Escape/Tab to drop
     - Tab resume behavior
     - Focus management (focus ring stays visible)
     - Visual feedback (grabbed state, drop zones)
   - Test edge cases:
     - Drag with empty lists
     - Drag with many items
     - Rapid drag operations
     - Drag with resizing (verify no resize bug - should be fixed)
     - Drag with offset (verify no sliding bug - should be fixed)
     - Reinitialization after list moves
   - **Test drop zone behavior**:
     - Drop zones appear during mouse drag
     - Drop zones appear during keyboard drag
     - No layout shifts (use `box-shadow: inset`)
     - Drop zones clear correctly
   - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
   - Test on mobile devices (iOS and Android)

#### 10. **Performance Validation**
   - Measure drag performance with new library
   - Compare to old library (if benchmarks exist)
   - Verify no performance regression
   - Test with large datasets (many lists, many tasks)
   - Profile memory usage during drag
   - **Consider debouncing** rapid Arrow key presses if performance becomes an issue (from recommendations)
   - Document performance findings

#### 11. **Accessibility Validation**
   - Ensure ARIA attributes (`aria-grabbed`) are properly set for screen readers
   - Test with screen reader (NVDA, JAWS, VoiceOver)
   - Verify keyboard navigation still works correctly
   - Verify focus management works (focus ring visible, Tab resume works)
   - Test keyboard drag with screen reader

#### 12. **Remove Old Library**
   - Remove `svelte-dnd-action` from `package.json`
   - Remove old library imports (only in `dragAdapter.js` and `dragDetectionUtils.js`)
   - Remove old library-specific code/workarounds:
     - Dimension locking workarounds (should no longer be needed)
     - Old library-specific CSS (if any)
   - Clean up `dragDetectionUtils.js` - remove `svelte-dnd-action`-specific detection
   - Remove prototype code if no longer needed (or keep for reference)

#### 13. **Update Documentation**
   - Update `src/lib/drag/README.md`:
     - Document SortableJS-specific patterns
     - Update architecture diagram if needed
     - Document reinitialization pattern
     - Document drop zone utilities
     - Document visual feedback utilities
   - Update code comments in:
     - `dragAdapter.js` - SortableJS implementation details
     - `dragDetectionUtils.js` - SortableJS detection methods
     - Component files - any SortableJS-specific setup
   - Document any API differences or gotchas (from lessons learned)
   - Update `technical-architecture.md` with new library choice

#### 14. **Final Validation**
   - Run full test suite: `npm test`
   - Run E2E tests: `npm run test:e2e` (if applicable)
   - Manual smoke test of all drag functionality:
     - Mouse drag (all scenarios)
     - Keyboard drag (all scenarios)
     - Mobile touch drag
   - Verify no console errors
   - Verify no performance issues
   - Check bundle size impact (SortableJS vs svelte-dnd-action)
   - Verify no layout shifts (drop zones use `box-shadow: inset`)
   - Final code review

## Quick Notes

### Refactoring Principles
- **No behavior changes**: This is a refactor only, functionality should remain identical
- **Test coverage**: Maintain or improve test coverage
- **Incremental**: Can be done in small PRs, each step should leave code in working state
- **Documentation**: Update comments and docs as you go

### Migration Considerations
- **Risk mitigation**: Prototype thoroughly before committing
- **Rollback plan**: Keep old implementation available via feature flag
- **User impact**: Migration should be invisible to users (same functionality)
- **Performance**: New library should not degrade performance
- **Mobile**: Must test on actual mobile devices, not just desktop emulation

### Dependencies
- Builds on [[078-drag-edge-case-bug]] (understanding current issues)
- Builds on [[060-multiple-columns]] (nested drop zones)
- Builds on [[050-drag-between-lists]] (cross-list dragging)
- Builds on [[031-task-reordering]] (basic drag functionality)

### Success Metrics
- **Refactoring**: Code is more maintainable, tests pass, no regressions
- **Prototyping**: At least 2 viable alternatives evaluated with working demos
- **Decision**: Clear go/no-go decision with documented rationale
- **Cutover**: New library fully integrated, old library removed, all tests pass, no regressions

### Cutover Considerations
- **Incremental migration**: 
  - Update adapter first (isolated change)
  - Add drop zone and visual feedback utilities
  - Update task drag, then list drag, then keyboard support
- **Adapter pattern**: Components already use adapter - minimal component changes needed
- **Rollback plan**: Git revert is sufficient (adapter pattern makes rollback easy)
- **Testing rigor**: 
  - Test each piece incrementally
  - Comprehensive testing before removing old library
  - Test keyboard drag separately from mouse drag (from recommendations)
- **User impact**: Migration should be invisible (no functionality changes)
- **Performance**: Must meet or exceed old implementation
- **Lessons learned**: 
  - Use `box-shadow: inset` for drop zones (no layout shifts)
  - Maintain focus on grabbed items (focus ring visibility)
  - Save element references before clearing state (for blur operations)
  - Coordinate mouse and keyboard drag state separately

### Benefits of Refactoring for Future Migration

After refactoring, migrating to a new drag-and-drop library will be significantly easier:

1. **Isolated Library Code**: All `svelte-dnd-action`-specific code will be in:
   - `dragAdapter.js` - wraps library API
   - `dragDetectionUtils.js` - library-specific DOM queries
   - No library code in components

2. **Standardized Interfaces**: Components use standardized interfaces:
   - `createDragZone()` instead of `use:dndzone`
   - `handleDragConsider()` / `handleDragFinalize()` instead of library events
   - `isDragActive()` instead of DOM queries

3. **Minimal Component Changes**: When migrating:
   - Components remain unchanged (they use adapter interface)
   - Only adapter layer needs updating
   - Detection utilities need updating (but interface stays same)
   - Handlers may need minor updates (but structure stays same)

4. **Testability**: Extracted handlers are easier to test:
   - Pure functions can be unit tested
   - Adapter can be mocked for component tests
   - Keyboard drag logic can be tested independently

5. **Reduced Risk**: 
   - Can test new library alongside old one (via feature flag)
   - Incremental migration possible (tasks first, then lists)
   - Rollback is easier (just swap adapter implementation)

**Estimated Migration Effort After Refactoring:**
- Without refactoring: ~2-3 weeks (update all components, fix all edge cases)
- With refactoring: ~3-5 days (update adapter + detection utils, test handlers)