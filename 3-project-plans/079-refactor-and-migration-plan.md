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
- [ ] Keyboard drag logic extracted (state management, event handlers, Tab resume behavior)
- [ ] Capture-phase keyboard handlers extracted (prevent library interception)
- [ ] Cross-list boundary movement logic extracted
- [ ] Library-specific code abstracted behind adapter/detection utilities
- [ ] Components are library-agnostic (only adapter knows about `svelte-dnd-action`)
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

#### 3. **Extract Task Keyboard Drag Logic**
   - Create `src/lib/drag/taskKeyboardDrag.js` (mirroring structure of `useKeyboardListDrag.js` for lists)
   - Extract keyboard drag state management:
     - `isKeyboardTaskDragging`, `lastKeyboardDraggedTaskId` (lines 52-53)
     - `lastBlurredTaskElement`, `shouldRefocusTaskOnNextTab` (lines 47-48)
   - Extract keyboard drag event handlers:
     - `handleTaskItemKeydownCapture` (lines 340-416) - capture-phase handler for task items
     - `handleTaskItemBlur` (lines 424-432) - blur handler for keyboard drag tracking
     - Document-level keyboard handler (lines 436-601) - Tab/Escape/Arrow key handling
   - Extract library-specific detection utilities:
     - Active drag detection (checking for `aria-grabbed`, `svelte-dnd-action-dragged` classes)
     - Drop zone detection (checking for box-shadow styles on ul elements)
     - Create `src/lib/drag/dragDetectionUtils.js` for library-specific queries
   - Extract cross-list boundary movement keyboard handlers (lines 241-293, 550-592)
   - Separate keyboard drag from mouse drag logic
   - Ensure keyboard drag works with extracted handlers
   - Note: Task keyboard drag is more complex than list keyboard drag due to:
     - Cross-list boundary movement at first/last task
     - Multiple capture-phase handlers to prevent library interception
     - Tab resume behavior after keyboard drop

#### 4. **Create Library Detection Utilities**
   - Create `src/lib/drag/dragDetectionUtils.js` (extract BEFORE adapter, needed by keyboard drag)
   - Abstract library-specific DOM queries:
     - `isDragActive()` - detect if drag is currently active (library-agnostic interface)
       - Currently checks for `li[aria-grabbed="true"]`, `li.svelte-dnd-action-dragged`
       - Checks for active drop zones via box-shadow detection
     - `getDraggedElements()` - get currently dragged elements
     - `hasActiveDropZone(element)` - check if element has active drop zone styling
       - Currently checks for `boxShadow` with `inset` keyword
     - `getAllActiveDropZones()` - get all active drop zones (for cross-list drags)
   - These utilities abstract away library-specific DOM queries
   - All library-specific class names, attributes, and style detection go here
   - When migrating to new library, only this file needs updating for detection logic

#### 5. **Create Drag Adapter/Abstraction Layer**
   - Create `src/lib/drag/dragAdapter.js`
   - Abstract `svelte-dnd-action` API behind a consistent interface
   - Define standard drag events/handlers that any library could implement
   - This makes switching libraries easier later
   - Extract library-specific code:
     - `dndzone` action wrapper (currently `use:dndzone` in components)
       - Wraps `dndzone` from `svelte-dnd-action`
       - Standardizes configuration options
     - Event naming (`onconsider`, `onfinalize` → standardized names)
       - Components use `onDragConsider`, `onDragFinalize`
       - Adapter maps to library's event names
     - Configuration options (`dropTargetStyle`, `zoneTabIndex`, `type`)
       - Standardize config interface, map to library-specific options
   - Example interface:
     ```javascript
     // dragAdapter.js
     import { dndzone } from 'svelte-dnd-action';
     
     export function createDragZone(config) {
       // Returns standardized drag zone configuration
       // Wraps svelte-dnd-action's dndzone
       return dndzone({
         items: config.items,
         type: config.type,
         zoneTabIndex: config.zoneTabIndex ?? -1,
         dropTargetStyle: config.dropTargetStyle
       });
     }
     
     export function handleDragConsider(event, handler) {
       // Standardized consider handler
       // Extracts items from event.detail.items (svelte-dnd-action format)
       handler(event.detail.items);
     }
     
     export function handleDragFinalize(event, handler) {
       // Standardized finalize handler
       // Extracts items from event.detail.items (svelte-dnd-action format)
       handler(event.detail.items);
     }
     ```
   - Move all library-specific code (DOM queries, class names, attributes) into adapter/detection utils
   - Components should only use adapter interface, never directly reference `svelte-dnd-action`
   - When migrating to new library, only adapter needs updating (components unchanged)

#### 6. **Simplify State Management**
   - Review `draggableTasks`/`draggableLists` pattern
   - Consider if we can work directly with source data during drag
   - Document why the current pattern exists (if it's necessary)
   - If possible, simplify to reduce sync complexity
   - Update components to use simplified pattern

#### 7. **Extract Capture-Phase Keyboard Handlers**
   - Create `src/lib/drag/capturePhaseHandlers.js` or integrate into keyboard drag modules
   - Extract capture-phase handlers that prevent drag library from intercepting keyboard events:
     - List title keydown handler (lines 148-176) - prevents library from intercepting Enter/Space on list title
     - Add Task button keydown handler (lines 179-207) - prevents library from intercepting Enter/Space on Add Task button
     - Task text keydown handler (lines 209-293) - prevents library from intercepting Enter/Space on task text, handles cross-list boundary movement
   - These handlers use capture phase (`addEventListener(..., true)`) to run before drag library
   - Abstract library-specific event prevention logic
   - Update components to use extracted handlers

#### 8. **Reduce Component Size**
   - Split large components if needed:
     - Consider extracting drag-related UI into sub-components
     - Extract keyboard navigation logic (already partially done with capture-phase handlers)
     - Extract focus management logic (Tab resume behavior, focus restoration)
   - Target: `TaskList.svelte` <800 lines (ideally <600)
     - Current: 1161 lines
     - Drag handlers: ~50 lines → extract
     - Keyboard drag logic: ~300 lines → extract
     - Capture-phase handlers: ~150 lines → extract
     - Cross-list movement: ~100 lines → extract
     - Focus management: ~100 lines → extract
     - Estimated reduction: ~700 lines → target achievable
   - Keep component focused on rendering and user interaction
   - Move business logic to handlers/utilities

#### 9. **Update Component Imports and Usage**
   - Update `TaskList.svelte` to import from new modules:
     - Import `taskDragHandlers` instead of inline handlers
     - Import `taskKeyboardDrag` utilities instead of inline keyboard logic
     - Import `dragAdapter` instead of direct `dndzone` usage
     - Import `dragDetectionUtils` instead of library-specific DOM queries
     - Import capture-phase handlers from extracted module
   - Update `ListColumn.svelte` similarly (if needed)
   - Update `Board.svelte` similarly (if needed)
   - Replace all library-specific code with adapter/utility calls
   - Verify components are now library-agnostic (only adapter knows about `svelte-dnd-action`)

#### 10. **Update Tests**
   - Ensure all existing tests still pass
   - Update test helpers if needed (they may reference old structure)
   - Update test mocks to work with adapter pattern
   - Add tests for extracted handlers if missing:
     - Test `taskDragHandlers.js` functions
     - Test `taskKeyboardDrag.js` utilities
     - Test `dragDetectionUtils.js` functions
     - Test adapter interface
   - Verify test coverage hasn't decreased
   - Update tests that mock `svelte-dnd-action` to mock adapter instead

#### 11. **Document Refactored Structure**
   - Update code comments explaining new structure
   - Document drag flow (consider → finalize → database update)
   - Document state management pattern
   - Add README in `src/lib/drag/` explaining architecture

### Part 2: Prototyping and Testing Alternative Libraries

#### 1. **Research and Evaluate Alternatives**
   - **Primary candidates:**
     - `sortablejs` + `svelte-sortablejs` wrapper
       - Pros: Mature, well-documented, good mobile support, handles nested containers
       - Cons: Not Svelte-native, may need wrapper work
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
     - Keyboard drag support
     - Bundle size
     - Documentation quality
     - Maintenance status
     - Community adoption

#### 2. **Create Minimal Prototype Environment**
   - Create `src/prototypes/dnd-prototype/` directory
   - Set up isolated prototype with minimal dependencies
   - Create simple test page with:
     - One list with 5-10 tasks
     - Basic drag within list
     - Cross-list drag (2 lists)
     - Keyboard drag support
     - Mobile touch testing capability
   - Use feature flag or separate route to access prototype

#### 3. **Prototype Library 1: sortablejs**
   - Install `sortablejs` and `svelte-sortablejs` (if available)
   - Implement basic drag within list
   - Implement cross-list drag
   - Test nested containers (lists in columns)
   - Test keyboard support
   - Test mobile touch
   - Document:
     - Setup complexity
     - API differences from current library
     - Performance observations
     - Any issues encountered
     - Bundle size impact

#### 4. **Prototype Library 2: Alternative or Custom**
   - If `sortablejs` doesn't work well, try second option
   - Or prototype custom Pointer Events implementation
   - Same testing as Library 1
   - Document findings

#### 5. **Test Edge Cases from Milestone 078**
   - Test resize bug scenario (does it occur with new library?)
   - Test sliding/offset issue (does it occur with new library?)
   - Test rapid drag operations
   - Test drag with many items
   - Test drag with empty lists
   - Test drag across columns
   - Document results for each library

#### 6. **Performance Comparison**
   - Measure drag performance:
     - Time to start drag
     - Smoothness during drag (FPS)
     - Time to complete drag
     - Memory usage during drag
   - Compare old library vs prototypes
   - Test on mobile device if possible
   - Document findings

#### 7. **Migration Decision**
   - Review all prototype findings
   - Compare against current implementation
   - Consider:
     - Will new library solve current issues?
     - Migration effort required
     - Risk vs benefit
     - Maintenance burden
   - Document decision with rationale
   - If migration approved: proceed to migration planning
   - If migration not approved: document why and what improvements can be made to current library

#### 8. **Prepare Feature Flag (If Migration Approved)**
   - Create feature flag: `USE_NEW_DND_LIBRARY`
   - Implement adapter pattern to support both libraries
   - Ensure both implementations can coexist
   - Set up parallel testing capability
   - Document how to switch between implementations

### Part 3: Cutover (If Migration Approved)

#### 1. **Implement New Library via Adapter**
   - Update `src/lib/drag/dragAdapter.js` to support new library
   - Implement adapter methods for new library API
   - Ensure adapter provides same interface as old implementation
   - Test adapter in isolation
   - Verify adapter handles all drag scenarios:
     - Within-list drag
     - Cross-list drag
     - Cross-column drag
     - Keyboard drag
     - Mobile touch drag

#### 2. **Migrate Task Drag Implementation**
   - Update `TaskList.svelte` to use new library via adapter
   - Update `taskDragHandlers.js` if needed for new library
   - Test task drag within list
   - Test task drag between lists
   - Test task drag between columns
   - Verify all edge cases work
   - Ensure placeholder handling works correctly

#### 3. **Migrate List Drag Implementation**
   - Update `ListColumn.svelte` to use new library via adapter
   - Update `Board.svelte` if needed
   - Update `listDragHandlers.js` if needed for new library
   - Test list drag within column
   - Test list drag between columns
   - Verify all edge cases work
   - Ensure placeholder handling works correctly

#### 4. **Migrate Keyboard Drag Support**
   - Update keyboard drag handlers for new library
   - Test keyboard drag for tasks
   - Test keyboard drag for lists
   - Verify keyboard navigation still works
   - Test keyboard drag across lists/columns
   - Ensure focus management works correctly

#### 5. **Parallel Testing with Feature Flag**
   - Enable feature flag for internal testing
   - Test both implementations side-by-side
   - Compare behavior between old and new
   - Document any differences (should be minimal)
   - Fix any issues found in new implementation
   - Verify performance is acceptable

#### 6. **Update Tests**
   - Update test helpers to work with new library
   - Update drag simulation functions if needed
   - Ensure all existing tests pass with new library
   - Add tests for any new library-specific behavior
   - Verify test coverage maintained or improved
   - Run full test suite: `npm test`

#### 7. **Comprehensive Manual Testing**
   - Test all drag scenarios manually:
     - Task drag within list
     - Task drag between lists
     - Task drag between columns
     - List drag within column
     - List drag between columns
     - Keyboard drag (tasks and lists)
     - Mobile touch drag
   - Test edge cases:
     - Drag with empty lists
     - Drag with many items
     - Rapid drag operations
     - Drag with resizing (verify no resize bug)
     - Drag with offset (verify no sliding bug)
   - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
   - Test on mobile devices (iOS and Android)

#### 8. **Performance Validation**
   - Measure drag performance with new library
   - Compare to old library benchmarks
   - Verify no performance regression
   - Test with large datasets (many lists, many tasks)
   - Profile memory usage during drag
   - Document performance findings

#### 9. **Remove Old Library**
   - Remove `svelte-dnd-action` from `package.json`
   - Remove old library imports
   - Remove old library-specific code/workarounds
   - Remove dimension locking workarounds (if no longer needed)
   - Clean up any old library-specific CSS
   - Remove prototype code if no longer needed

#### 10. **Remove Feature Flag**
   - Remove `USE_NEW_DND_LIBRARY` feature flag
   - Remove conditional logic for old/new implementations
   - Simplify adapter if it was only needed for migration
   - Clean up any migration-specific code
   - Ensure codebase only uses new library

#### 11. **Update Documentation**
   - Update `technical-architecture.md` with new library choice
   - Update drag-related code comments
   - Update README in `src/lib/drag/` if needed
   - Document any API differences or gotchas
   - Update any user-facing documentation if applicable

#### 12. **Final Validation**
   - Run full test suite: `npm test`
   - Run E2E tests: `npm run test:e2e`
   - Manual smoke test of all drag functionality
   - Verify no console errors
   - Verify no performance issues
   - Check bundle size impact
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
- **Incremental migration**: Migrate tasks first, then lists, then keyboard support
- **Feature flag safety**: Keep old implementation available until fully validated
- **Rollback plan**: Be able to revert to old library if critical issues found
- **Testing rigor**: Comprehensive testing before removing feature flag
- **User impact**: Migration should be invisible (no functionality changes)
- **Performance**: Must meet or exceed old implementation

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