# 060: Multiple Columns

## Goal
Enable multiple columns layout for displaying lists. Lists are arranged in columns (e.g., 2-3 columns) to better utilize screen space and provide a multi-column view similar to paper planners. **No formatting focus** - focus purely on functionality and layout structure.

## Acceptance Criteria
- [ ] Lists are displayed in multiple columns (configurable number, e.g., 2-3 columns)
- [ ] Column layout is responsive and adapts to screen size
- [ ] Lists maintain their order within columns
- [ ] Tasks can be moved between lists across columns (extends milestone [[050-drag-between-lists]])
- [ ] Keyboard navigation works across columns (extends milestone [[050-drag-between-lists]])
- [ ] Print layout handles multiple columns appropriately
- [ ] Column layout persists user preferences (if implemented)
- [ ] No formatting/styling focus - just functional implementation

## Implementation Steps

1. **Define Column Layout Structure**
   - Determine column count (fixed or configurable)
   - Decide on column distribution strategy (equal width, flexible)
   - Plan responsive breakpoints for column layout
   - Consider print layout implications

2. **Implement Column Container**
   - Create column container structure in App.svelte
   - Distribute lists across columns
   - Handle list ordering within columns
   - Ensure proper spacing and layout

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

6. **Test**
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
- Column layout: Consider CSS Grid or Flexbox for implementation
- Responsive design: May need different column counts for different screen sizes
- Print considerations: May need single-column layout for print or special print CSS
- Requires: [[050-drag-between-lists]] (cross-list movement must work across columns)
- Requires: [[040-list-crud-ordering]] (list management)
- No formatting concerns - basic HTML/UI is fine
- Mobile compatibility: May need single-column layout on mobile devices

