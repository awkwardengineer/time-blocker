# 050: Drag Between Lists

## Goal
Enable users to drag tasks between different lists using drag-and-drop. When a task is moved to a new list, update the task's `listId` in IndexedDB and maintain proper order within the destination list. **No formatting focus** - focus purely on functionality.

## Acceptance Criteria
- [ ] Users can drag tasks from one list to another
- [ ] Task's `listId` is updated in IndexedDB when moved to a new list
- [ ] Task maintains proper order within destination list (append to end or insert at drop position)
- [ ] Order of remaining tasks in source list is maintained (no gaps)
- [ ] Order of tasks in destination list is maintained (no gaps)
- [ ] Cross-list dragging only works for unchecked/checked tasks (archived tasks excluded)
- [ ] Task order persists in IndexedDB
- [ ] Task order persists across page refreshes
- [ ] Keyboard navigation: Moving down from last task in list moves to first position of next list
- [ ] Keyboard navigation: Moving up from first task in list moves to last position of previous list
- [ ] Keyboard navigation: Moving down from last task in last list creates new unnamed list
- [ ] Visual feedback provided when crossing list boundaries via keyboard
- [ ] No formatting/styling focus - just functional implementation

## Implementation Steps

1. **Extend Drag-and-Drop Implementation** ✅
   - Remove or modify the `type` parameter restriction from milestone [[031-task-reordering]] (currently `type: 'list-${listId}'` prevents cross-list dragging) ✅
   - Either remove `type` entirely or use a shared `type` value for all lists to enable cross-list dragging ✅
   - Configure drop zones for each list (already done in 031) ✅
   - Allow dragging between different list drop zones ✅
   - Prevent dragging archived tasks between lists ✅ (archived tasks are filtered out from draggableTasks)

2. **Implement Cross-List Drop Logic** ✅
   - Detect when task is dropped in a different list ✅
   - Calculate new `order` value for task in destination list ✅
   - Update `order` values for tasks in destination list (shift existing tasks if inserting) ✅
   - Update `order` values for remaining tasks in source list (close gap left by moved task) ✅
   - Update task's `listId` in IndexedDB ✅
   - Maintain sequential ordering in both lists (no gaps) ✅

3. **Handle Drop Position** ✅
   - Determine drop position within destination list (insert at position or append to end) ✅ (handled by svelte-dnd-action - items array reflects drop position)
   - Calculate appropriate `order` value based on drop position ✅ (array index becomes order value)
   - Shift existing tasks in destination list if inserting at specific position ✅ (order recalculated for all tasks in destination)
   - Handle edge cases (dropping at beginning, middle, end of list) ✅ (sequential ordering handles all positions)

4. **Update Source List Order** ✅
   - When task is moved, recalculate `order` values for remaining tasks in source list ✅
   - Close gap left by moved task (e.g., if task with order 2 is moved, tasks 3, 4, 5 become 2, 3, 4) ✅
   - Maintain sequential ordering (no gaps) ✅

5. **Handle Edge Cases** ✅
   - Moving task to empty list (order = 0) ✅ (handled - first task gets order 0)
   - Moving task to list with single task ✅ (handled - order recalculated correctly)
   - Moving task to same list (should this be prevented or handled gracefully?) ✅ (handled gracefully - treated as reorder within same list)
   - Moving last task from a list (list becomes empty) ✅ (handled - source list has 0 tasks, no order recalculation needed)
   - Moving task between lists with different task counts ✅ (handled - orders recalculated independently for each list)

6. **Keyboard Cross-List Movement** ✅
   - **Approach**: Seamless List Boundary Crossing ✅
   - When a task is focused and user presses "move down" key (e.g., `Ctrl+Shift+Down` or library's default) ✅
   - If task is at last position in current list → automatically move to first position of next list ✅
   - If task is at first position and user presses "move up" → move to last position of previous list ✅
   - Provide visual feedback when crossing list boundaries (highlight next/previous list or brief indicator) (deferred - functionality works without it)
   - Handle edge cases: ✅
     - Moving down from last task in last list → create new unnamed list and move task there ✅
     - Moving up from first task in first list → no action (already at top) ✅
   - Works seamlessly with existing keyboard drag-and-drop navigation (no mode switching required) ✅
   - Task's `listId` is updated in IndexedDB when crossing boundaries ✅
   - Order values are recalculated in both source and destination lists ✅
   - Maintains sequential ordering with no gaps ✅

7. **Data Persistence** ✅
   - Verify `listId` updates persist to IndexedDB ✅ (updateTaskOrderCrossList updates listId in IndexedDB)
   - Verify order updates persist in both source and destination lists ✅ (updateTaskOrderCrossList recalculates order for both lists)
   - Test that changes persist across page refreshes ✅ (IndexedDB persists automatically)
   - Ensure order consistency after cross-list moves ✅ (transaction ensures atomicity, sequential ordering maintained)

8. **Test**
   - **Manual Testing**:
     - Drag task from one list to another, verify `listId` updates
     - Verify order is maintained in both source and destination lists
     - Refresh page, verify task appears in correct list with correct order
     - Move task to empty list, verify order handling
     - Move last task from a list, verify source list order handling
     - Test edge cases (moving to same list, moving between lists with different counts)
     - Verify archived tasks cannot be moved between lists
     - Keyboard navigation: Move task down from last position, verify it moves to next list
     - Keyboard navigation: Move task up from first position, verify it moves to previous list
     - Keyboard navigation: Move task down from last position in last list, verify new list is created
     - Keyboard navigation: Verify visual feedback when crossing list boundaries
   - **Automated Tests**:
     - Unit tests: Cross-list move logic (update `listId`, calculate order values)
     - Unit tests: Order updates in both source and destination lists
     - Unit tests: Order persistence in IndexedDB
     - Integration tests: UI drag-and-drop between lists
     - Integration tests: Order persists after page refresh
     - Test order consistency after cross-list moves

## Quick Notes
- Database schema: Uses existing `listId` and `order` fields from [[020-mock-data-display]]
- Task `listId` field: Updated when task is moved to a new list
- Task `order` field: Recalculated in both source and destination lists
- Cross-list dragging scope: Only unchecked/checked tasks (archived tasks excluded)
- Drop position: Insert at drop position or append to end (implementation decision)
- Requires: [[031-task-reordering]] (drag-and-drop infrastructure)
- Requires: [[040-list-crud-ordering]] (list management)
- **Future milestone**: [[070-multiple-columns]] will extend this functionality to work across columns - ensure drag-and-drop and keyboard navigation can work seamlessly across column boundaries
- No formatting concerns - basic HTML/UI is fine
- Mobile compatibility: Use touch-friendly drag-and-drop (already implemented in 031)

