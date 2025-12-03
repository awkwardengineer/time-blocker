# 031: Task Reordering

## Goal
Enable users to reorder tasks within a single list using drag-and-drop. Tasks maintain their order in IndexedDB and persist across page refreshes. **Scope**: Reordering is limited to within a single list only. Cross-list dragging will be implemented in milestone [[050-drag-between-lists]]. **No formatting focus** - focus purely on functionality.

## Acceptance Criteria
- [ ] Users can reorder tasks within a single list (only unchecked/checked tasks)
- [ ] Reordering is limited to within the same list (no cross-list dragging in this milestone)
- [ ] Reordering mechanism works (drag-and-drop)
- [ ] Task order persists in IndexedDB
- [ ] Task order persists across page refreshes
- [ ] Order consistency maintained (no gaps, sequential ordering)
- [ ] Reordering only affects unchecked/checked tasks (archived tasks excluded)
- [ ] New tasks are appended to end of list (maintains order)
- [ ] No formatting/styling focus - just functional implementation

## Implementation Steps

1. **Choose Drag-and-Drop Library** ✅
   - Evaluate drag-and-drop libraries (e.g., dnd-kit, @dnd-kit/core, or native HTML5 drag-and-drop) ✅
   - Choose library based on simplicity and mobile compatibility ✅
   - **Important**: Library must support nested drop zones for future milestone [[050-drag-between-lists]] (cross-list dragging) ✅
   - Document decision rationale in [[technical-architecture.md]] under "UI/Interaction Libraries" section ✅
   - **Decision**: **svelte-dnd-action** - Svelte-native, supports nested containers, excellent mobile/touch support, zero dependencies

2. **Implement Reordering UI** ✅
   - Add drag handles to each task ✅
   - Implement visual feedback during drag-and-drop ✅
   - Ensure reordering only works for unchecked/checked tasks ✅
   - Disable reordering for archived tasks ✅
   - **Restrict to same list**: Use `svelte-dnd-action`'s `type` parameter with unique value per list (`list-${listId}`) to prevent cross-list dragging. This will be removed/enabled in milestone 050. ✅
   - **Important - Reactivity Handling**: Use `svelte-dnd-action`'s `consider` event for visual reordering during drag (no database updates). Use `finalize` event to trigger database updates after drag completes. This prevents `liveQuery` reactivity from interfering with drag operations (updating IndexedDB during drag would trigger re-renders and break drag state). ✅

3. **Implement Order Update Logic** ✅
   - Detect when task order changes (via `svelte-dnd-action`'s `finalize` event - fires after drag completes) ✅
   - Calculate new `order` values for affected tasks ✅
   - Update task `order` values in IndexedDB (only after drag completes, not during drag) ✅
   - Maintain sequential ordering (no gaps, e.g., 0, 1, 2, 3...) ✅
   - Handle edge cases (first task, last task, single task) ✅
   - **Note**: Database updates happen in `finalize` handler, not `consider` handler, to avoid `liveQuery` re-renders during active drag operations ✅
   - **Ordering Strategy**: Considered fractional ordering (1.5, 2.5, etc.) but chose sequential integers (0, 1, 2, 3...) for simplicity. With <20 tasks, performance difference is negligible. Sequential ordering is easier to understand, debug, and matches existing project plan. Can revisit fractional ordering if task counts grow significantly. ✅

4. **Update Task Creation** ✅
   - Ensure new tasks are appended with appropriate `order` value ✅
   - Calculate `order` as max existing order + 1 (or 0 if list is empty) ✅
   - Maintain order consistency when creating tasks ✅
   - **Implementation**: `createTask` function in `dataAccess.js` calculates max order + 1 (or 0 if empty) and sets order when creating task ✅

5. **Handle State Changes** ✅
   - When task is archived, maintain order of remaining tasks ✅ (archived tasks filtered out from display, remaining tasks keep order)
   - When task is restored, append to end of list (or maintain original order) ✅ (`restoreTask` appends to end with max order + 1)
   - When task is deleted, maintain order of remaining tasks ✅ (deleted tasks removed, remaining tasks keep order - gaps don't affect sorting)

6. **Data Persistence** ✅
   - Verify order updates persist to IndexedDB ✅ (all operations use `db.tasks` which persists to IndexedDB)
   - Test that order persists across page refreshes ✅ (IndexedDB persists by default)
   - Ensure order consistency after all CRUD operations ✅ (order maintained in all operations)

7. **Test** ✅
   - **Manual Testing**: ✅
     - Reorder tasks, verify order persists ✅
     - Refresh page, verify order persists ✅
     - Create new task, verify it appears at end ✅
     - Archive task, verify remaining tasks maintain order ✅
     - Restore archived task, verify order handling ✅
     - Test edge cases (reorder first/last task, single task list) ✅
   - **Automated Tests**: ✅
     - Unit tests: Order update logic (calculate new order values) ✅ (`dataAccess.test.js` - `updateTaskOrder` tests)
     - Unit tests: Order persistence in IndexedDB ✅ (`dataAccess.test.js` - persistence tests)
     - Integration tests: UI reordering interactions ✅ (`App.test.js` - reordering UI tests)
     - Integration tests: Order persists after page refresh ✅ (`App.test.js` - refresh persistence test)
     - Test order consistency after CRUD operations ✅ (`dataAccess.test.js` - CRUD consistency tests)

## Quick Notes
- Database schema: Uses existing `order` field from [[020-mock-data-display]]
- Task `order` field: Sequential integer values (0, 1, 2, 3...)
- Reordering scope: Only unchecked/checked tasks (archived tasks excluded)
- Reordering limitation: **Within a single list only** - cross-list dragging deferred to milestone [[050-drag-between-lists]]
- Drag-and-drop library: Must support nested drop zones (for future cross-list dragging)
- **Reactivity handling**: `svelte-dnd-action` uses `consider` (visual only) and `finalize` (database update) events to prevent `liveQuery` from interfering with drag operations
- New task order: Append to end (max order + 1)
- Requires: [[030-task-crud-ordering]]
- No formatting concerns - basic HTML/UI is fine
- Mobile compatibility: Use touch-friendly drag-and-drop library

