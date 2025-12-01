# 031: Task Reordering

## Goal
Enable users to reorder tasks within lists using drag-and-drop or buttons. Tasks maintain their order in IndexedDB and persist across page refreshes. **No formatting focus** - focus purely on functionality.

## Acceptance Criteria
- [ ] Users can reorder tasks within a list (only unchecked/checked tasks)
- [ ] Reordering mechanism works (drag-and-drop OR up/down buttons)
- [ ] Task order persists in IndexedDB
- [ ] Task order persists across page refreshes
- [ ] Order consistency maintained (no gaps, sequential ordering)
- [ ] Reordering only affects unchecked/checked tasks (archived tasks excluded)
- [ ] New tasks are appended to end of list (maintains order)
- [ ] No formatting/styling focus - just functional implementation

## Implementation Steps

1. **Choose Reordering Approach**
   - Evaluate drag-and-drop libraries (e.g., dnd-kit, @dnd-kit/core, or native HTML5 drag-and-drop)
   - OR evaluate button-based approach (up/down arrows)
   - Choose approach based on simplicity and mobile compatibility
   - Document decision rationale

2. **Implement Reordering UI**
   - Add drag handles or up/down buttons to each task
   - Implement visual feedback during reordering (if drag-and-drop)
   - Ensure reordering only works for unchecked/checked tasks
   - Disable reordering for archived tasks

3. **Implement Order Update Logic**
   - Detect when task order changes
   - Calculate new `order` values for affected tasks
   - Update task `order` values in IndexedDB
   - Maintain sequential ordering (no gaps, e.g., 0, 1, 2, 3...)
   - Handle edge cases (first task, last task, single task)

4. **Update Task Creation**
   - Ensure new tasks are appended with appropriate `order` value
   - Calculate `order` as max existing order + 1 (or 0 if list is empty)
   - Maintain order consistency when creating tasks

5. **Handle State Changes**
   - When task is archived, maintain order of remaining tasks
   - When task is restored, append to end of list (or maintain original order)
   - When task is deleted, maintain order of remaining tasks

6. **Data Persistence**
   - Verify order updates persist to IndexedDB
   - Test that order persists across page refreshes
   - Ensure order consistency after all CRUD operations

7. **Test**
   - **Manual Testing**:
     - Reorder tasks, verify order persists
     - Refresh page, verify order persists
     - Create new task, verify it appears at end
     - Archive task, verify remaining tasks maintain order
     - Restore archived task, verify order handling
     - Test edge cases (reorder first/last task, single task list)
   - **Automated Tests**:
     - Unit tests: Order update logic (calculate new order values)
     - Unit tests: Order persistence in IndexedDB
     - Integration tests: UI reordering interactions
     - Integration tests: Order persists after page refresh
     - Test order consistency after CRUD operations

## Quick Notes
- Database schema: Uses existing `order` field from [[020-mock-data-display]]
- Task `order` field: Sequential integer values (0, 1, 2, 3...)
- Reordering scope: Only unchecked/checked tasks (archived tasks excluded)
- New task order: Append to end (max order + 1)
- Requires: [[030-task-crud-ordering]]
- No formatting concerns - basic HTML/UI is fine
- Mobile compatibility: Consider touch-friendly drag-and-drop or button approach

