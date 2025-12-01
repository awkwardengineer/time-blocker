# 032: Task UX Behaviors

## Goal
Refine task interaction patterns and keyboard behaviors. Define and implement UX behaviors for task creation, editing, focus management, and keyboard navigation. **No formatting focus** - focus purely on interaction behavior.

## Acceptance Criteria
- [ ] Enter key behavior defined and implemented (create new task, focus management)
- [ ] Focus management works correctly (where focus goes after actions)
- [ ] Click behavior on existing tasks defined and implemented (edit mode, etc.)
- [ ] Keyboard navigation works (Tab, Enter, Escape, etc.)
- [ ] Task editing flow is intuitive and consistent
- [ ] No formatting/styling focus - just functional interaction behavior

## Implementation Steps

1. **Define UX Behaviors**
   - Document desired behaviors:
     - What happens when user presses Enter in task input?
     - Where does focus go after creating a task?
     - What happens when user clicks on an existing task?
     - What happens when user presses Escape during editing?
     - Tab navigation between tasks
     - Other keyboard shortcuts/interactions
   - Document edge cases and error states

2. **Implement Enter Key Behavior**
   - Create new task on Enter (if input has content)
   - Handle focus after task creation
   - Handle empty input (prevent creation or clear focus)
   - Handle Enter in edit mode (save changes)

3. **Implement Focus Management**
   - Focus new task input after creation
   - Focus task being edited
   - Handle focus when archiving/restoring tasks
   - Handle focus when deleting tasks
   - Maintain focus order for keyboard navigation

4. **Implement Click Behavior**
   - Define what happens when clicking existing task
   - Implement edit mode activation
   - Handle click outside to save/cancel edit
   - Handle double-click behavior (if applicable)

5. **Implement Keyboard Navigation**
   - Tab navigation between tasks
   - Enter to create/edit
   - Escape to cancel edit
   - Arrow keys for navigation (if applicable)
   - Other keyboard shortcuts

6. **Handle Edge Cases**
   - Empty input handling
   - Canceling edit (revert changes)
   - Focus when list is empty
   - Focus when all tasks are archived
   - Keyboard navigation with no tasks

7. **Test**
   - **Manual Testing**:
     - Test Enter key behavior in various scenarios
     - Test focus management after all actions
     - Test click behaviors on tasks
     - Test keyboard navigation
     - Test edge cases (empty input, canceling edit, etc.)
   - **Automated Tests**:
     - Integration tests: Enter key creates task and manages focus
     - Integration tests: Click behavior activates edit mode
     - Integration tests: Keyboard navigation works
     - Integration tests: Focus management after CRUD operations

## Quick Notes
- Focus on interaction behavior, not visual styling
- Ensure keyboard accessibility
- Consider mobile/touch interactions (may defer to later milestone)
- Requires: [[030-task-crud-ordering]] (and optionally [[031-task-reordering]])
- No formatting concerns - basic HTML/UI is fine

