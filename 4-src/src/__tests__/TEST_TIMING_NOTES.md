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

**Issue**: Test checks for textarea to disappear before checking for button to appear. In CI, the DOM may not have updated yet when checking for textarea removal, even with `tick()` and delays in the implementation.

**Root Cause**: Bindable prop updates in Svelte 5 may not propagate synchronously, especially in CI environments. The `isInputActive = false` update in the parent component may not immediately cause the child component to re-render.

**Fixes Applied**: 
1. Increased delay in implementation from 0ms to 10ms (commit b3fee26)
2. Increased test timeout from 3000ms to 5000ms for the first waitFor check

**Status**: Fixed with increased timeouts. Monitor CI for continued flakiness. If it persists, consider:
- Further increasing the delay in implementation
- Using a different approach to ensure state updates (e.g., using `$effect` to watch for state changes)
- Making the test more resilient by checking for button appearance first

## Recommendations

1. **Always prefer positive assertions**: Check for elements to appear rather than disappear
2. **Use waitFor for state changes**: When state changes, wait for the new state to appear
3. **Verify negative assertions after positive**: If you need to verify something is gone, do it after confirming the new state exists
4. **Document flaky tests**: Keep this file updated with any timing issues discovered
5. **Monitor CI failures**: If a test fails in CI but passes locally, it's likely a timing issue

## Related Files

- `4-src/src/components/TaskList.svelte` - Contains bindable prop updates that may cause timing issues
- `4-src/src/components/AddTaskInput.svelte` - Child component that receives bindable props
- `4-src/src/__tests__/components/App.taskCreation.test.js` - Contains the flaky test

