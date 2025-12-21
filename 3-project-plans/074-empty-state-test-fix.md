# 074: Fix Empty State Test Issues

## Goal
Fix the issue preventing empty state tests from running, specifically the `document is not defined` error when creating the first task from empty state.

## Problem
One integration test in `App.emptyState.test.js` is currently skipped:
1. `allows creating first task via "Add your first task" button`

The test fails with: `ReferenceError: document is not defined` at `activateAddTaskInput` function in `Board.svelte`.

**Note:** The second test (`shows "Create List" button after creating first task`) was removed as it's no longer relevant - it was checking for a "Create Your First List" button variant that no longer exists in the codebase. The UI always shows "Create new list" regardless of state.

## Root Cause
The `activateAddTaskInput` function uses `document.querySelector` which is not available in the test context when creating the first task from empty state. The function is called from `handleUnnamedListCreateTask` after creating a task in an unnamed list.

## Additional Fixes Completed
- **Escape key behavior unified**: Fixed inconsistent behavior where pressing Escape with text entered would cancel for empty state "Add your first task" button but create task for regular "Add Task" button. Now both behave consistently: Escape with text creates task, Escape without text cancels.

## User Stories

| As a... | I need... | So that... |
|---------|-----------|------------|
| **Developer** | Empty state tests to pass | I can verify empty state functionality works correctly |
| **Tester** | All tests to run without skipping | I have confidence in test coverage |

## Implementation Steps

1. **Investigate the Issue** ✅
   - Understand why `document` is not available in test context
   - Check if it's a timing issue or environment issue
   - Verify if `activateAddTaskInput` is being called at the right time

2. **Fix the Code** ✅
   - Update `activateAddTaskInput` to handle cases where `document` might not be available
   - Added guard: `if (typeof document === 'undefined') return;` at the start of the function
   - Ensure the function works in both browser and test environments

3. **Enable Skipped Test** ✅
   - Removed `it.skip` from the remaining empty state test
   - Test should now pass after fix

4. **Verify All Tests Pass**
   - Run full test suite
   - Ensure no regressions

## Acceptance Criteria
- ✅ `activateAddTaskInput` works in test environment (added document guard)
- ✅ The skipped empty state test is enabled (removed `it.skip`)
- ✅ Escape key behavior is consistent between empty state and regular Add Task button
- ⏳ Verify no regressions in existing functionality (run full test suite)
- ⏳ Verify all tests in test suite pass

## Technical Notes
- The issue occurs in `Board.svelte` at line ~249 in `activateAddTaskInput` function
- The function is called from `handleUnnamedListCreateTask` after creating a task
- May need to add guards or use a different approach to find DOM elements in test context
- Escape key logic was refactored in `TaskList.svelte` `handleInputEscape` to unify behavior

## Attempted Fix for Loading State Flicker (Reverted)

**Problem:** When creating a new task list, there was a brief loading state flicker before showing the empty state.

**Attempted Solution:** Used `$derived.by()` to create a `shouldShowContent` derived state that:
- Checked if listId exists in stableLists/allLists
- If query exists, checked if it's resolved (undefined = loading, array = loaded)
- If query doesn't exist yet, optimistically showed content (return true)

**Why it failed:** Accessing `$tasksQuery` inside `$derived.by()` created a reactive dependency loop:
- The derived state accessed `$tasksQuery` (reactive value from liveQuery)
- This created a dependency that triggered re-evaluation
- The re-evaluation somehow triggered effects that modified state
- This caused `effect_update_depth_exceeded` infinite loop error

**Error:** `effect_update_depth_exceeded` / `infinite_loop_guard` - page wouldn't load

**Next approach:** Use a simpler optimistic approach - track query state separately without accessing reactive values inside derived state, or use a simple flag that gets set optimistically when list is created.

