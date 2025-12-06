# 075: Fix Tab Key Not Canceling Drag Mode

## Goal
Fix the bug where pressing Tab while a task is in drag mode (initiated by pressing Enter) does not cancel the drag mode, leaving the drop zones highlighted with yellow borders. Pressing Escape correctly cancels drag mode, but Tab does not.

## Problem Description

When a user:
1. Focuses on a task item
2. Presses Enter to start keyboard drag mode (svelte-dnd-action enters drag state)
3. Presses Tab to navigate away

**Expected behavior**: Tab should cancel drag mode (like Escape does) and allow normal tab navigation.

**Actual behavior**: Tab does not cancel drag mode, leaving visual indicators (yellow borders on drop zones) active, and tab navigation behaves strangely.

## Root Cause

The issue appears to be that `svelte-dnd-action` listens for Escape key events to cancel drag mode, but does not respond to Tab key events. This may be an upstream issue in the `svelte-dnd-action` library itself, or it may require a different approach to programmatically cancel drag mode.

## Acceptance Criteria

- [ ] Pressing Tab while a task is in drag mode (after pressing Enter) cancels drag mode
- [ ] Visual indicators (yellow borders on drop zones) are removed when Tab is pressed
- [ ] Tab navigation works normally after canceling drag mode
- [ ] No regression: Escape still cancels drag mode as before
- [ ] No regression: Tab works normally when drag mode is not active

## Implementation Attempts

### Attempt 1: Dispatch Escape Event on Tab Press
**Approach**: Intercept Tab key press in capture phase, check if drag mode is active, dispatch Escape event programmatically.

**Code location**: `TaskList.svelte` - `handleKeydownCapture` function

**What was tried**:
- Added Tab key detection in capture-phase keyboard handler
- Checked for dragged items using `document.querySelectorAll('li[aria-grabbed="true"], li.svelte-dnd-action-dragged')`
- Dispatched Escape `KeyboardEvent` on `ulElement`, `activeElement`, and `document`
- Used `requestAnimationFrame` to wait for Escape to process before manually triggering Tab

**Result**: ❌ Did not work. Tab navigation was broken, and drag mode was not canceled.

### Attempt 2: Always Dispatch Escape on Tab (Simplified)
**Approach**: Always dispatch Escape when Tab is pressed on a list item, regardless of drag mode detection.

**What was tried**:
- Removed drag mode detection check
- Always prevent Tab, dispatch Escape, then manually trigger Tab after Escape processes
- Used double `requestAnimationFrame` to ensure Escape has time to process

**Result**: ❌ Did not work. Tab navigation was completely broken.

### Attempt 3: Multiple Event Targets
**Approach**: Dispatch Escape on multiple targets (activeElement, ulElement, document) with `composed: true` flag.

**What was tried**:
- Created Escape events with `composed: true` to match browser behavior
- Dispatched on active element first, then ul element, then document
- Used `requestAnimationFrame` to wait before triggering Tab

**Result**: ❌ Did not work.

## Investigation Notes

- **Escape works manually**: When user physically presses Escape, drag mode is canceled correctly
- **Programmatic Escape doesn't work**: Dispatching Escape programmatically does not seem to trigger the same behavior in `svelte-dnd-action`
- **Event timing**: The issue may be related to event timing or event propagation
- **Library internals**: May need to investigate `svelte-dnd-action` source code to understand how it handles Escape events
- **Alternative approaches**: May need to directly manipulate DOM or call internal library methods if they exist

## Next Steps

1. **Investigate svelte-dnd-action source code**: Understand how Escape events are handled internally
2. **Check for public API**: Look for a method to programmatically cancel drag mode
3. **DOM manipulation**: Try directly removing classes/attributes that indicate drag mode
4. **Event simulation**: Try different event properties or event types (keyup, keypress)
5. **Library issue**: If no solution works, may need to file an issue with `svelte-dnd-action` or consider alternative libraries

## Related Milestones

- [[050-drag-between-lists]]: This bug was discovered while working on keyboard cross-list movement
- [[031-task-reordering]]: Original drag-and-drop implementation using svelte-dnd-action

## Testing

### Manual Testing Steps

1. Focus on a task item
2. Press Enter to start drag mode
3. Verify yellow borders appear on drop zones
4. Press Tab
5. **Expected**: Drag mode cancels, yellow borders disappear, tab navigation works
6. **Actual**: Drag mode remains active, yellow borders remain, tab navigation broken

### Regression Testing

- [ ] Escape still cancels drag mode correctly
- [ ] Tab works normally when drag mode is not active
- [ ] Enter still starts drag mode correctly
- [ ] Drag-and-drop still works correctly
- [ ] Keyboard cross-list movement still works correctly

