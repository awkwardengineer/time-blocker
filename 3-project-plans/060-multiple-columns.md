# 060: Multiple Columns

## Goal
Enable multiple columns layout for displaying lists. Lists are arranged in 5 columns to better utilize screen space and provide a multi-column view similar to paper planners. **No formatting focus** - focus purely on functionality and layout structure.

**Future-proofing**: This milestone should be designed with future multiple rows in mind. The architecture should support both column and row configurations, with user settings to control the layout.

## Acceptance Criteria
- [ ] Lists are displayed in 5 columns
- [ ] Column layout is responsive and adapts to screen size
- [ ] Lists maintain their order within columns
- [ ] Tasks can be moved between lists across columns (extends milestone [[050-drag-between-lists]])
- [ ] Keyboard navigation works across columns (extends milestone [[050-drag-between-lists]])
- [ ] Print layout handles multiple columns appropriately
- [ ] Column layout persists user preferences (if implemented)
- [ ] **Column placement preservation**: When reducing column count (e.g., from 5 to 3), items labeled in columns beyond the available count (e.g., columns 4-5 when only 3 columns exist) display in the last available column. This preserves column placement so that if the user changes back to 5 columns, items return to their original column positions.
- [ ] **Future-proofing**: Architecture supports future multiple rows configuration (not just columns)
- [ ] **User settings foundation**: Design supports future user settings for rows and columns configuration
- [ ] No formatting/styling focus - just functional implementation

## Implementation Steps

1. **Define Column Layout Structure**
   - Set column count to 5 columns (fixed for this milestone, configurable in future)
   - **Column distribution**: 5 columns should be evenly distributed across the page area (equal width)
   - **Mobile responsive behavior**: On mobile devices, the page area takes up the full width, and each column takes the full width (single column layout on mobile)
   - Plan responsive breakpoints for column layout (mobile vs desktop)
   - Consider print layout implications
   - **Design for future rows**: Structure should accommodate both column and row configurations
   - **Column placement system**: Design a system to track which column each list belongs to (column indices 0, 1, 2, 3, 4 for 5 columns), independent of the current column count
   - **Column overflow handling**: When column count is reduced, items in "overflow" columns (e.g., columns 3-4 when only 3 columns exist) should display in the last available column

2. **Implement Column Container**
   - ✅ Create column container structure in App.svelte
   - ✅ Distribute lists across columns based on their stored column index
   - ✅ **Column overflow logic**: When rendering, if a list's column index exceeds available columns, render it in the last available column
   - ✅ Handle list ordering within columns
   - ✅ Ensure proper spacing and layout
   - ✅ **Visual separator**: Add thin vertical lines between columns for visual separation
   - **Create new list per column**: "Create new list" should appear in each column - at the bottom of columns that have lists, or in empty columns. When a list is created, it should be created within that specific column (using the column's index).
   - ✅ **Empty board still shows 5 columns**: When no lists exist at all, render the full 5-column grid with per-column "Create new list" controls.
   - ✅ **Update create new list behavior**:
     - ✅ After creating a new list, the "add a new task" empty state should appear below the newly created list
     - ✅ Focus should move to the input for creating another new list (in the same column)
     - ✅ **Important**: The "Add your first task" button should only appear below named lists (via TaskList empty state), NOT in the "Create new list" section
     - ✅ **Note**: This behavior was updated in milestone [[040-list-crud-ordering]]
     - ✅ Undo old behaviors that conflict with this new behavior
     - ✅ Update tests to reflect the new behavior
   - **Future rows consideration**: Structure should be extensible to support row-based layouts

3. **Update Drag-and-Drop for Columns** ✅ COMPLETE
   - ✅ **Issues Fixed:**
     - ✅ Placeholders appear correctly during drag
     - ✅ Lists displace properly in dropzone
     - ✅ Lists don't disappear on drop (fixed by always looking up from stableLists with fallback)
     - ✅ Tasks still drag and drop between lists properly (existing functionality preserved)
   
   - **Root Cause Analysis:**
     - Each column has its own dndzone with `items: columnLists` (derived from `listsByColumn()`)
     - `handleListConsider` is empty - not updating `draggableLists` during drag
     - When dragging between columns, the drag library needs `draggableLists` to reflect the move for visual feedback
     - `listsByColumn` is derived from `draggableLists`, so it should update automatically IF we update `draggableLists`
     - Multiple dndzones (one per column) all fire events - need to coordinate them
   
   - **Solution Approach (Based on 042-drag-and-drop-bug.md):**
     - MUST update `draggableLists` during `consider` (drag library requires this)
     - Rebuild `draggableLists` from all columns' current states during drag
     - Update `columnIndex` of moved items in `draggableLists` during `consider` for visual feedback
     - Use placeholder detection and `stableLists` validation (already implemented)
     - Handle cross-column moves by tracking which column items came from and where they're going
   
   - **Implementation Plan:**
     
     ✅ **Step 1: Add Debugging & Logging**
     - ✅ Add comprehensive logging to `handleListConsider` and `handleListFinalize`
     - ✅ Log: columnIndex, event.detail.items, current draggableLists state, placeholder detection
     - ✅ Log: which lists are moving, their old/new columnIndex values
     - ✅ Add visual debugging: log when placeholders are detected, when lists move columns
     
     ✅ **Step 2: Fix `handleListConsider` to Update State**
     - ✅ The drag library REQUIRES the items array to match DOM structure during drag
     - ✅ **Key Challenge:** `listsByColumn` is derived from `draggableLists`, so we can't use it to rebuild (circular dependency)
     - ✅ **Solution:** Update `draggableLists` by replacing items for the current column only
     - ✅ When a column's dndzone fires `consider`, we need to:
       1. ✅ Get the new items array for that column (includes placeholders)
       2. ✅ Update `draggableLists` by:
          - ✅ Removing all items that belong to this column (based on current columnIndex)
          - ✅ Adding the new items from this column (with columnIndex set correctly)
          - ✅ Keeping items from other columns unchanged
       3. ✅ Set `columnIndex` for all items in the new column items array
     - Implementation approach:
       ```javascript
       function handleListConsider(event, columnIndex) {
         console.log('[DRAG] consider - column:', columnIndex);
         console.log('[DRAG] consider - items:', event.detail.items);
         console.log('[DRAG] consider - current draggableLists:', draggableLists);
         
         // Get items for this column (includes placeholders for visual feedback)
         const newColumnItems = event.detail.items;
         
         // Update draggableLists:
         // 1. Remove items that were in this column (based on current columnIndex)
         // 2. Add new items for this column (with columnIndex set)
         // 3. Keep items from other columns unchanged
         
         const updatedLists = draggableLists.filter(list => {
           const listColumnIndex = list.columnIndex ?? 0;
           return listColumnIndex !== columnIndex;
         });
         
         // Add new items for this column, setting columnIndex
         for (const item of newColumnItems) {
           const listItem = { ...item, columnIndex };
           updatedLists.push(listItem);
         }
         
         console.log('[DRAG] consider - updated draggableLists:', updatedLists);
         draggableLists = updatedLists;
       }
       ```
     - **Important:** This approach ensures:
       - Items moving TO this column get their columnIndex updated
       - Items moving FROM this column are removed (they'll be added to their new column when that column's consider fires)
       - Items in other columns remain unchanged
       - Placeholders are included (drag library needs them)
     
     ✅ **Step 3: Handle Cross-Column Detection**
     - ✅ Detect when an item moved from one column to another
     - ✅ Compare current `columnIndex` in `draggableLists` vs new column
     - ✅ Log cross-column moves for debugging
     - ✅ Ensure `columnIndex` is updated in `draggableLists` during `consider`
     - ✅ **Event Ordering Note:**
       - When dragging between columns, both source and target columns fire `consider` events
       - Order doesn't matter: source removes item, target adds item
       - When dragging within a column, only that column fires `consider` (reordering)
       - The approach handles both cases correctly
     - ✅ Source column detection: Skip database updates for columns that lost items and didn't receive any
     
     ✅ **Step 4: Fix `handleListFinalize`**
     - ✅ Filter placeholders (already done) - CRITICAL: must filter before database writes
     - ✅ Update database with `updateListOrderWithColumn` (already done)
     - ✅ **Important:** Don't update `draggableLists` in finalize - let the `$effect` sync from liveQuery
     - ✅ The `$effect` that syncs `draggableLists` from `$lists` will automatically update after database changes
     - ✅ Add logging to track:
       - Column index where drop occurred
       - Valid items (after filtering placeholders)
       - Database update result
       - Final `draggableLists` state after sync
     - ✅ **Note:** Only the target column's finalize fires (the column where item was dropped)
       - Source column doesn't fire finalize when item moves away
       - This is correct - we only update the target column in the database
     - ✅ Prevent duplicate database updates: Source columns that lost items skip database updates
     
     **Step 5: Test & Debug**
     - Test dragging within same column (should work like before)
     - Test dragging between columns (should update columnIndex visually)
     - Test rapid drag operations (click-drag-redrag)
     - Verify placeholders appear correctly
     - Verify lists don't disappear on drop
     - Verify tasks still drag between lists (don't break existing functionality)
     
     **Step 6: Edge Cases**
     - Handle empty columns
     - Handle dragging to last position in column
     - Handle dragging from last position in column
     - Handle dragging when only one list exists
     - Handle rapid drag operations (multiple considers before finalize)
   
   - **Key Principles (from 042):**
     - ✅ Update `draggableLists` during `consider` (drag library requirement)
     - ✅ Use `stableLists` for validation (prevents invalid queries)
     - ✅ Filter placeholders before database writes
     - ✅ Render from `draggableLists` but look up real lists from `stableLists`
     - ✅ Components will remount during drag (expected behavior)
     - ✅ Queries recreate correctly when components remount (already implemented)
   
   - **Debugging Checklist:**
     - [x] Add logging to `handleListConsider` - log columnIndex, items, placeholders
     - [x] Add logging to `handleListFinalize` - log columnIndex, validItems, database updates
     - [x] Add logging to track `draggableLists` state changes
     - [x] Add logging to track `listsByColumn` derived value changes
     - [x] Add visual indicators: log when placeholders detected, when lists move columns
     - [x] Test with browser console open to see all logs
     - [x] Verify placeholders appear in DOM during drag
     - [x] Verify lists don't disappear after drop (fixed by always looking up from stableLists with fallback)
     - [x] Verify database updates correctly (check IndexedDB after drop)
   
   - **Success Criteria:**
     - ✅ Placeholders appear correctly during drag
     - ✅ Lists displace properly in dropzone
     - ✅ Lists don't disappear on drop (fixed by always looking up from stableLists with fallback to dragItem)
     - ✅ Cross-column dragging works (columnIndex updates)
     - ✅ Tasks still drag between lists (existing functionality preserved)
     - ✅ No console errors
     - ✅ Database state matches UI state after drag
     - ✅ Source columns skip database updates (prevents duplicate updates)
     - ✅ Empty columns have minimum height for easier dropping

4. **Update Keyboard Navigation for Columns**
   - Extend keyboard cross-list movement to work across columns
   - Handle boundary crossing between columns (last task in column moves to first task of next column)
   - Ensure keyboard navigation flows naturally across column boundaries
   - Maintain existing keyboard navigation functionality

4.5. **Keyboard Focus Actions - Feature Checklist**

   Work through these features one at a time, testing and running drag-and-drop integration tests after each:

   - [x] **Fix: List title keyboard editing** - Currently causes console error when pressing Enter/Space on list title. Fix the `handleListNameKeydown` function in `TaskList.svelte` (lines 654-673).
   
   - [x] **Checkbox keyboard toggle** - Add `onkeydown` handler to task checkbox in `TaskList.svelte` (line ~765). When Enter or Space is pressed while checkbox is focused, toggle task checked state (call `handleToggleTaskStatus`).
   
   - [x] **Task text keyboard editing** - Verify Enter/Space on task text works correctly. Already has `handleTaskTextKeydown` (lines 554-579), but verify no console errors and behavior matches click.
   
   - [x] **"Add your first task" button** - Verify Enter/Space works. Already has `handleButtonKeydown` in `AddTaskInput.svelte` (lines 67-72), but verify no issues.
   
   - [x] **"Add Task" button** - Verify Enter/Space works. Same handler as above, verify no issues.
   
   - [x] **"Create new list" button** - Verify Enter/Space works. Already has `handleCreateListKeydown` in `App.svelte` (lines 178-184), but verify no issues.
   
   - [x] **Task keyboard drag-and-drop entry** - Make task list items focusable (add `tabindex="0"` to task `li` elements) and add keyboard handler to enter drag mode (Space key to start, Arrow keys to move, Enter/Escape to finish).
   
   - [x] **List keyboard drag-and-drop entry** - Make list containers focusable (add `tabindex="0"` to list section element) and add keyboard handler to enter drag mode (Space key to start, Arrow keys to move, Enter/Escape to finish).
   
   - [x] **Fix: column container focus** - Ensure entire column containers are not focusable; only interactive elements within a column should receive focus.
   
   - [x] **Fix: task list `<ul>` focus** - Prevent whole task list `<ul>` elements from being focusable; focus should land on individual tasks or interactive controls instead.
   
   - [x] **Prevent tabbing out of modals** - Trap focus within the list title modal and task modal so Tab/Shift+Tab cycles inside the modal until it is closed.
   
   - [x] **Tabbing out of list creation input** - When tabbing away from the "create new list" input, close the input if empty; if it contains text, create the list before moving focus.
   
   - [x] **Tabbing out of task creation input** - When tabbing away from the "add task" input, close the input if empty; if it contains text, create the task before moving focus.
   
   - [x] **Task blur on Escape** - Ensure task-related interactive elements (e.g., task text, inputs, modals) blur or close appropriately when pressing Escape, without leaving stray focus.
   
   - [x] **Task Tab resume after blur** - After a blur or close action on a task (e.g., Escape), ensure the next Tab re-focuses the task element that was just blurred (mirroring list behavior) so keyboard users can resume interaction with that item before moving on. Implemented via keyboard drag state tracking and Tab-resume logic in `TaskList.svelte`, with coverage in `App.taskKeyboardDrag.test.js`.
   
   - [ ] **Fix: Escape blur for all focus states** - Currently, pressing Escape only causes blur when focused on task text. When focused on task lists, tasks, task checkboxes, "add task" button, or "add your first task" button, pressing Escape does nothing (unless in a drag state, where it does blur). Add Escape key handlers to blur these elements appropriately, ensuring consistent behavior across all interactive elements.
 
5. **Handle Print Layout**
   - Determine how multiple columns should render in print
   - Ensure print layout is readable and functional
   - Consider single-column print layout vs multi-column
   - Test print output with multiple columns

6. **User Settings Foundation (Future-proofing)**
   - Design data structure to store column/row configuration preferences
   - Plan for future user settings UI (not implemented in this milestone)
   - Ensure column placement data persists independently of column count setting
   - Consider how settings will affect both columns and rows in the future

7. **Test**
   - **Manual Testing**:
     - Verify lists display correctly in multiple columns
     - Test drag-and-drop between lists in different columns
     - Test keyboard navigation across column boundaries
     - Verify print layout with multiple columns
     - Test responsive behavior (resize window, verify column layout)
   - **Automated Tests**:
     - Unit tests: Column distribution logic
     - Integration tests: Drag-and-drop across columns
     - Integration tests: Keyboard navigation across columns

## Quick Notes
- **Important**: This milestone extends [[050-drag-between-lists]] functionality
- **Keyboard Navigation**: When implementing keyboard cross-list movement in milestone 050, ensure it works seamlessly across column boundaries
- **Drag-and-Drop**: Cross-list dragging from milestone 050 should work naturally across columns
- **Column Placement Preservation**: Each list should have a stored column index (0, 1, 2, 3, 4 for 5 columns). When column count is reduced, lists with indices beyond the available columns should render in the last column. This preserves placement for when column count increases again.
- **Sort Order Consideration**: When items overflow to the last column, sort order may need to restart from the bottom or allow mixing. This is a future milestone concern - for now, maintain existing sort order within each column.
- **Future Rows**: Architecture should be designed to support multiple rows in addition to columns. Consider a grid-based approach (rows × columns) that can be configured via user settings.
- **User Settings**: Plan for future user settings that control both row and column counts. Settings should be stored separately from list column placement data.
- Column layout: Consider CSS Grid or Flexbox for implementation (Grid may be better for future rows support)
- Responsive design: May need different column counts for different screen sizes
- Print considerations: May need single-column layout for print or special print CSS
- Requires: [[050-drag-between-lists]] (cross-list movement must work across columns)
- Requires: [[040-list-crud-ordering]] (list management)
- No formatting concerns - basic HTML/UI is fine
- Mobile compatibility: May need single-column layout on mobile devices

