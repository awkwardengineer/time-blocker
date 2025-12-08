# 074: Fix Empty State Test Issues

## Goal
Fix the issue preventing empty state tests from running, specifically the `document is not defined` error when creating the first task from empty state.

## Problem
Two integration tests in `App.emptyState.test.js` are currently skipped:
1. `allows creating first task via "Add your first task" button`
2. `shows "Create List" button after creating first task`

Both tests fail with: `ReferenceError: document is not defined` at `activateAddTaskInput` function in `App.svelte`.

## Root Cause
The `activateAddTaskInput` function uses `document.querySelector` which is not available in the test context when creating the first task from empty state. The function is called from `handleUnnamedListCreateTask` after creating a task in an unnamed list.

## User Stories

| As a... | I need... | So that... |
|---------|-----------|------------|
| **Developer** | Empty state tests to pass | I can verify empty state functionality works correctly |
| **Tester** | All tests to run without skipping | I have confidence in test coverage |

## Implementation Steps

1. **Investigate the Issue**
   - Understand why `document` is not available in test context
   - Check if it's a timing issue or environment issue
   - Verify if `activateAddTaskInput` is being called at the right time

2. **Fix the Code**
   - Update `activateAddTaskInput` to handle cases where `document` might not be available
   - Or refactor to avoid needing `document` in the test context
   - Ensure the function works in both browser and test environments

3. **Enable Skipped Tests**
   - Remove `it.skip` from the two empty state tests
   - Verify tests pass after fix

4. **Verify All Tests Pass**
   - Run full test suite
   - Ensure no regressions

## Acceptance Criteria
- `activateAddTaskInput` works in test environment
- Both skipped empty state tests pass
- No regressions in existing functionality
- All tests in test suite pass

## Technical Notes
- The issue occurs in `App.svelte` at line ~94 in `activateAddTaskInput` function
- The function is called from `handleUnnamedListCreateTask` after creating a task
- May need to add guards or use a different approach to find DOM elements in test context

