# 079: Refactor and Migration Plan

## Goal
Refactor the drag-and-drop implementation to improve maintainability and prepare for migrating to a more reliable drag-and-drop library. This milestone focuses on code organization first, then prototyping and testing alternative libraries before committing to a migration.

## Background
The current implementation uses `svelte-dnd-action` (v0.9.68) and has several issues:
- **Unresolved edge cases**: Resize bug partially fixed, sliding/offset issue remains (see [[078-drag-edge-case-bug]])
- **Complex workarounds**: Polling, dimension locking attempts, timing hacks
- **Large component files**: `TaskList.svelte` is ~1161 lines, mixing drag logic with component logic
- **Complex state management**: `draggableTasks`/`draggableLists` syncing pattern adds complexity
- **Hard to test**: Drag logic tightly coupled to components

Refactoring first will:
- Make migration easier (less code to move)
- Improve testability (isolated drag handlers)
- Reduce risk (can test new library alongside old one)
- Improve maintainability regardless of migration outcome

## Acceptance Criteria

### Part 1: Refactoring
- [ ] Drag handlers extracted from components into separate modules
- [ ] `TaskList.svelte` reduced to <800 lines (target: <600 lines)
- [ ] Drag-related state management simplified or abstracted
- [ ] All existing tests pass after refactoring
- [ ] No functionality changes (refactor only, no behavior changes)
- [ ] Code is more maintainable and testable

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

#### 1. **Extract Task Drag Handlers**
   - Create `src/lib/drag/taskDragHandlers.js`
   - Move `handleConsider` and `handleFinalize` logic from `TaskList.svelte`
   - Extract validation logic (placeholder detection, item filtering)
   - Extract order calculation logic
   - Make handlers pure functions where possible (take state as parameters, return new state)
   - Update `TaskList.svelte` to use extracted handlers

#### 2. **Extract List Drag Handlers**
   - Review existing `src/lib/listDragHandlers.js` (already extracted)
   - Ensure all list drag logic is in this file
   - Move any remaining drag logic from `Board.svelte` or `ListColumn.svelte`
   - Verify handlers are pure functions

#### 3. **Extract Keyboard Drag Logic**
   - Create `src/lib/drag/keyboardDrag.js` (or enhance existing `useKeyboardListDrag.js`)
   - Extract keyboard drag state management
   - Extract keyboard drag event handlers
   - Separate keyboard drag from mouse drag logic
   - Ensure keyboard drag works with extracted handlers

#### 4. **Create Drag Adapter/Abstraction Layer**
   - Create `src/lib/drag/dragAdapter.js`
   - Abstract `svelte-dnd-action` API behind a consistent interface
   - Define standard drag events/handlers that any library could implement
   - This makes switching libraries easier later
   - Example interface:
     ```javascript
     // dragAdapter.js
     export function createDragZone(config) {
       // Returns standardized drag zone configuration
     }
     
     export function handleDragConsider(items, handler) {
       // Standardized consider handler
     }
     
     export function handleDragFinalize(items, handler) {
       // Standardized finalize handler
     }
     ```

#### 5. **Simplify State Management**
   - Review `draggableTasks`/`draggableLists` pattern
   - Consider if we can work directly with source data during drag
   - Document why the current pattern exists (if it's necessary)
   - If possible, simplify to reduce sync complexity
   - Update components to use simplified pattern

#### 6. **Reduce Component Size**
   - Split large components if needed:
     - Consider extracting drag-related UI into sub-components
     - Extract keyboard navigation logic
     - Extract focus management logic
   - Target: `TaskList.svelte` <800 lines (ideally <600)
   - Keep component focused on rendering and user interaction
   - Move business logic to handlers/utilities

#### 7. **Update Tests**
   - Ensure all existing tests still pass
   - Update test helpers if needed (they may reference old structure)
   - Add tests for extracted handlers if missing
   - Verify test coverage hasn't decreased

#### 8. **Document Refactored Structure**
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

