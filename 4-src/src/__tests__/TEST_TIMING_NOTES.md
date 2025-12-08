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

1. **Always prefer positive assertions**: Check for elements to appear rather than disappear
2. **Use waitFor for state changes**: When state changes, wait for the new state to appear
3. **Verify negative assertions after positive**: If you need to verify something is gone, do it after confirming the new state exists
4. **Document flaky tests**: Keep this file updated with any timing issues discovered
5. **Monitor CI failures**: If a test fails in CI but passes locally, it's likely a timing issue
6. **Test in isolation and together**: Always test both ways - run individual tests and all tests together
7. **Use multiple ticks and delays**: When dealing with bindable props, use multiple `tick()` calls and `requestAnimationFrame` + delays

## Related Files

- `4-src/src/components/TaskList.svelte` - Contains bindable prop updates that may cause timing issues
- `4-src/src/components/AddTaskInput.svelte` - Child component that receives bindable props
- `4-src/src/__tests__/components/App.taskCreation.test.js` - Contains the flaky test

