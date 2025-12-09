# Test Suite Timing & Isolation Issues Review

## Summary
Review completed on all test files to identify potential timing issues and test isolation problems.

## Issues Found

### 1. **Missing Test Timeouts**
Several tests don't have explicit timeouts and rely on default 5000ms, which may be insufficient in CI:

**High Priority:**
- `App.focusManagement.test.js` - "Focus moves to next task after archiving" - queries element outside waitFor (potential stale reference)
- `App.listCreation.test.js` - "Multiple lists can be created in sequence" - no timeout, sequential operations
- Most tests in `App.test.js` - no explicit timeouts on test functions

**Medium Priority:**
- Tests that interact with liveQuery (database updates) without sufficient delays
- Tests that perform multiple sequential operations

### 2. **Stale Element References**
Found in:
- `App.focusManagement.test.js:75` - `task2TextSpan` queried outside waitFor, then checked inside
  - **Fix**: Query inside waitFor to ensure fresh reference

### 3. **Missing Delays for Async Operations**
Tests that interact with:
- Database updates (liveQuery)
- Focus management (setTimeout-based)
- State changes (bindable props)

**Pattern**: Tests that click/type and immediately check state without waiting

### 4. **Test Isolation**
- ✅ Good: `beforeEach` properly clears database in `appTestSetup.js`
- ✅ Good: Each test renders fresh App component
- ⚠️ Potential: Tests that modify database state might affect subsequent tests if cleanup fails

## Recommendations

### Immediate Fixes Needed:
1. Fix stale element reference in `App.focusManagement.test.js`
2. Add timeouts to tests that perform multiple sequential operations
3. Add delays after database operations that use liveQuery

### Best Practices to Follow:
1. Always query elements inside `waitFor` when checking state after actions
2. Add explicit test timeouts for tests with multiple async operations
3. Use `findBy*` queries when waiting for elements to appear
4. Add small delays (100-200ms) after actions that trigger async state updates
5. Re-query elements inside waitFor to avoid stale references

## Files Reviewed
- ✅ App.test.js
- ✅ App.addTaskButton.test.js  
- ✅ App.taskCreation.test.js
- ✅ App.focusManagement.test.js
- ✅ App.listCreation.test.js
- ✅ App.archivedView.test.js
- ✅ App.unnamedListCreation.test.js
- ✅ App.listEditing.test.js
- ✅ App.emptyState.test.js
- ✅ App.listArchiving.test.js
- ✅ App.keyboardNavigation.test.js
- ✅ App.taskEditing.test.js

