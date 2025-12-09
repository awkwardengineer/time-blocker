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
   - **Future rows consideration**: Structure should be extensible to support row-based layouts

3. **Update Drag-and-Drop for Columns**
   - Extend cross-list dragging to work across columns
   - Ensure drop zones work correctly in multi-column layout
   - Handle visual feedback when dragging between columns
   - Maintain existing drag-and-drop functionality

4. **Update Keyboard Navigation for Columns**
   - Extend keyboard cross-list movement to work across columns
   - Handle boundary crossing between columns (last task in column moves to first task of next column)
   - Ensure keyboard navigation flows naturally across column boundaries
   - Maintain existing keyboard navigation functionality

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

