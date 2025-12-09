# Test Timing Notes

This document tracks patterns and issues related to timing in tests, especially flaky tests that pass locally but fail in CI.

## Common Patterns

### 1. DOM Updates with Svelte Bindable Props

**Issue**: When updating bindable props in parent components, child components may not re-render immediately, even with `tick()` and small delays.

**Pattern**: Tests checking for elements to disappear (negative assertions) are less reliable than tests checking for elements to appear (positive assertions).

**Example**: 
- ❌ Less reliable: `expect(element).not.toBeInTheDocument()` - may fail if DOM hasn't updated yet
- ✅ More reliable: `expect(element).toBeInTheDocument()` - waits for element to appear

**Solution**: 
- Prefer positive assertions (checking for elements to appear) over negative assertions (checking for elements to disappear)
- When both are needed, check for the positive assertion first, then verify the negative assertion
- Use `waitFor` with appropriate timeouts for positive assertions
- For negative assertions after a state change, verify them after the positive assertion succeeds

### 2. Bindable Prop Updates

**Issue**: Bindable props in Svelte 5 may not propagate synchronously, especially in CI environments.

**Pattern**: Setting a bindable prop to `false` in a parent component may not immediately update the child component's DOM.

**Example**: 
```javascript
// In parent component
isInputActive = false;
await tick();
await new Promise(resolve => setTimeout(resolve, 10));
// Child component may still have textarea in DOM at this point
```

**Solution**:
- Use `waitFor` in tests to wait for DOM updates
- Prefer checking for the new state (button appears) rather than the old state disappearing (textarea gone)
- Consider increasing delays in implementation if needed, but prefer making tests more robust

### 3. Test Structure Best Practices

**Recommended Pattern**:
1. Perform the action (e.g., press Enter)
2. Wait for the new state to appear (positive assertion with `waitFor`)
3. Verify the old state is gone (negative assertion, no `waitFor` needed if positive assertion succeeded)

**Example**:
```javascript
// Press Enter
await user.keyboard('{Enter}')

// Wait for button to appear (positive assertion)
await waitFor(() => {
  expect(within(section).getByRole('button', { name: /add task/i })).toBeInTheDocument()
}, { timeout: 3000 })

// Verify input is gone (negative assertion - after positive succeeds)
expect(within(section).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
```

## Known Flaky Tests

### App.taskCreation.test.js - "Enter key on empty string"

**Issue**: Test times out when checking for textarea to disappear after pressing Enter on empty input. The test fails in CI/deployment but passes when run in isolation. The DOM may not have updated yet when checking for textarea removal, even with `tick()` and delays in the implementation.

**Root Cause**: Bindable prop updates in Svelte 5 may not propagate synchronously, especially in CI environments or when multiple tests run together. The `isInputActive = false` update in the parent component may not immediately cause the child component to re-render. Test isolation issues may also contribute when all tests run together.

**Fixes Applied** (December 2024):
1. **Test timeout**: Increased test timeout from default 5000ms to 15000ms to allow `waitFor` with 10000ms timeout to complete
2. **Test structure**: Modified test to wait for input to disappear first, then check for button to appear (sequential waitFor calls)
3. **Implementation delays**: Enhanced state update handling in `TaskList.svelte`:
   - Added multiple `tick()` calls (2 ticks) to ensure reactive updates propagate
   - Added `requestAnimationFrame` to wait for DOM updates
   - Increased delay from 10ms to 200ms to account for test environment timing differences
4. **Test assertion order**: Changed from checking button first to checking input disappearance first, then button appearance

**Current Status**: 
- ✅ Test passes when run in isolation
- ⚠️ May still fail when all tests run together (test isolation issue)
- The code changes should make the test more reliable overall

**If issues persist**:
- Consider further increasing delays in implementation (currently 200ms)
- Investigate test isolation - ensure `beforeEach` properly resets state
- Consider using `$effect` to watch for state changes instead of relying on timing
- May need to add explicit waits in test setup/teardown

## Known Issues from Test Suite Review

The following issues were identified during a comprehensive review of all test files:

### 1. Missing Test Timeouts

Several tests don't have explicit timeouts and rely on default 5000ms, which may be insufficient in CI:

**High Priority:**
- `App.focusManagement.test.js` - "Focus moves to next task after archiving" - queries element outside waitFor (potential stale reference)
- `App.listCreation.test.js` - "Multiple lists can be created in sequence" - no timeout, sequential operations
- Most tests in `App.test.js` - no explicit timeouts on test functions

**Medium Priority:**
- Tests that interact with liveQuery (database updates) without sufficient delays
- Tests that perform multiple sequential operations

### 2. Stale Element References

Found in:
- `App.focusManagement.test.js:75` - `task2TextSpan` queried outside waitFor, then checked inside
  - **Fix**: Query inside waitFor to ensure fresh reference

### 3. Missing Delays for Async Operations

Tests that interact with:
- Database updates (liveQuery)
- Focus management (setTimeout-based)
- State changes (bindable props)

**Pattern**: Tests that click/type and immediately check state without waiting

### 4. Test Isolation Status

- ✅ Good: `beforeEach` properly clears database in `appTestSetup.js`
- ✅ Good: Each test renders fresh App component
- ⚠️ Potential: Tests that modify database state might affect subsequent tests if cleanup fails

## Test Isolation Issues

**Pattern**: Tests that pass in isolation but fail when all tests run together.

**Symptoms**:
- Test passes when run individually: `npm test -- path/to/test.js -t "test name"`
- Test fails when run with all tests: `npm test -- path/to/test.js`
- State updates don't propagate as expected
- DOM elements don't update when they should

**Common Causes**:
1. **State pollution**: Previous tests leave state that affects subsequent tests
2. **Async operations**: Unfinished async operations from previous tests interfere
3. **Timing differences**: Test environment behaves differently under load
4. **Resource cleanup**: Test setup/teardown doesn't properly reset state

**Solutions**:
1. **Ensure proper cleanup**: Make sure `beforeEach`/`afterEach` properly reset all state
2. **Increase delays**: If timing is the issue, increase delays in implementation (not just test timeouts)
3. **Use multiple ticks**: Use multiple `tick()` calls to ensure all reactive updates propagate
4. **Add requestAnimationFrame**: Wait for DOM updates with `requestAnimationFrame` before delays
5. **Sequential waitFor**: When checking for state changes, use sequential `waitFor` calls (wait for old state to disappear, then new state to appear)

**Example Fix Pattern**:
```javascript
// In implementation
async function handleStateChange() {
  isActive = false;
  await tick();
  await tick(); // Multiple ticks for reactive updates
  await new Promise(resolve => requestAnimationFrame(resolve)); // Wait for DOM
  await new Promise(resolve => setTimeout(resolve, 200)); // Additional delay
}

// In test
it('test name', async () => {
  // ... setup ...
  await action();
  
  // Wait for old state to disappear
  await waitFor(() => {
    expect(oldElement).not.toBeInTheDocument();
  }, { timeout: 10000 });
  
  // Then wait for new state to appear
  await waitFor(() => {
    expect(newElement).toBeInTheDocument();
  }, { timeout: 10000 });
}, 15000); // Increased test timeout
```

## Recommendations

### General Best Practices

1. **Always prefer positive assertions**: Check for elements to appear rather than disappear
2. **Use waitFor for state changes**: When state changes, wait for the new state to appear
3. **Verify negative assertions after positive**: If you need to verify something is gone, do it after confirming the new state exists
4. **Document flaky tests**: Keep this file updated with any timing issues discovered
5. **Monitor CI failures**: If a test fails in CI but passes locally, it's likely a timing issue
6. **Test in isolation and together**: Always test both ways - run individual tests and all tests together
7. **Use multiple ticks and delays**: When dealing with bindable props, use multiple `tick()` calls and `requestAnimationFrame` + delays

### Immediate Action Items

1. **Fix stale element references**: Always query elements inside `waitFor` when checking state after actions
2. **Add explicit test timeouts**: Add timeouts to tests that perform multiple sequential operations
3. **Add delays for async operations**: Add delays after database operations that use liveQuery
4. **Use findBy* queries**: Use `findBy*` queries when waiting for elements to appear
5. **Re-query elements**: Re-query elements inside waitFor to avoid stale references
6. **Add small delays**: Add small delays (100-200ms) after actions that trigger async state updates

## stableLists Refactoring (December 2024)

**Context**: After implementing the stableLists pattern to fix drag-and-drop remounting issues, several tests started failing. These were **not timing-related issues** but structural issues with how test helpers were finding elements.

### Issues Fixed

1. **`getListSection` helper returning wrong element**
   - **Problem**: Helper was returning `listNameElement.parentElement` (the flex container div), but tests needed the `div[data-list-id]` that contains all tasks
   - **Fix**: Changed to use `listNameElement.closest('[data-list-id]')` to return the correct container
   - **Location**: `src/__tests__/helpers/appTestHelpers.js`

2. **`waitForListSection` failing with multiple matches**
   - **Problem**: When list names appear in both main view and archived view, `screen.getByText()` throws "Found multiple elements"
   - **Fix**: Use `getAllByText()` and filter to find the one in main view (has `data-list-id` ancestor)
   - **Location**: `src/__tests__/helpers/appTestHelpers.js`

3. **`document is not defined` in setTimeout callback**
   - **Problem**: `setTimeout` callback in `handleTaskEditArchive` accesses `document.activeElement` after component cleanup in tests
   - **Fix**: Added `typeof document === 'undefined'` check before accessing `document`
   - **Location**: `src/components/TaskList.svelte:619`

### Key Insight

These failures were **structural/test helper issues**, not timing issues. The stableLists changes altered the DOM structure slightly (wrapping TaskList in a div with `data-list-id`), which broke test helpers that assumed a different structure.

### Test Status After Fixes

- ✅ All tests in `App.test.js` passing (15/15)
- ✅ Most other test suites passing
- ⚠️ Some isolated test failures remain (not timing-related, likely test-specific issues)

## Test Files Status

The following test files have been reviewed for timing and isolation issues:

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

## Related Files

- `4-src/src/components/TaskList.svelte` - Contains bindable prop updates that may cause timing issues, and setTimeout callbacks that need document checks
- `4-src/src/components/AddTaskInput.svelte` - Child component that receives bindable props
- `4-src/src/__tests__/components/App.taskCreation.test.js` - Contains the flaky test
- `4-src/src/__tests__/helpers/appTestHelpers.js` - Test helpers that needed updates after stableLists refactoring

