# 078: Fix Drag-and-Drop Edge Case Bug

## Goal
Resolve the occasional "Loading tasks..." bug that occurs after rapid drag operations (click-drag-redrag quickly). This is a follow-up to milestone 042, which fixed the main drag-and-drop bug but left this edge case.

## Background
Milestone 042 fixed the main drag-and-drop bug by implementing reactive query validation. However, an edge case remains:
- **Occurs:** Only after clicking and dragging, then quickly redragging
- **Symptom:** "Loading tasks..." appears indefinitely on a list
- **Self-healing:** Clears automatically when dragging other items
- **Frequency:** Rare, but reproducible with rapid drag operations

## Root Cause Hypothesis
The bug appears to be a limitation of the `svelte-dnd-action` library's interaction with Svelte 5's reactivity system:
1. **Component Remounting:** The library's drag operations cause Svelte components to unmount/remount, creating timing windows where queries might not be ready
2. **Rapid Drag Operations:** When dragging quickly, the library's internal state might not fully settle before the next drag starts, causing components to not remount correctly
3. **Reactivity Timing:** There's a race condition between:
   - The drag library updating DOM structure
   - Svelte's reactivity system detecting changes
   - Dexie's `liveQuery` emitting updates
   - Components remounting with correct props

## Investigation Areas

1. **Different Drag Library:** Evaluate alternatives like `@dnd-kit/core` or `svelte-sortable` that might have better Svelte 5 reactivity integration
2. **Debouncing Drag Operations:** Add a small delay or debounce to prevent rapid successive drag operations from interfering with each other
3. **Query State Persistence:** Instead of recreating queries on remount, try to preserve query state across component lifecycle (though this might conflict with Svelte's reactivity model)
4. **Drag Library Source Code:** Review `svelte-dnd-action` source code to understand exactly how it manipulates the DOM and whether there's a way to prevent component remounting
5. **Svelte 5 Compatibility:** Check if `svelte-dnd-action` is fully compatible with Svelte 5's new reactivity system (`$state`, `$derived`, `$effect`). The library might have been designed for Svelte 4

## Implementation Steps

1. **Reproduce and Document**
   - Create a test case that reliably reproduces the bug
   - Document exact steps to trigger the issue
   - Add debug logging to capture component lifecycle during rapid drags

2. **Investigate Root Cause**
   - Review component lifecycle during rapid drag operations
   - Check if queries are being created but not emitting
   - Verify if components are remounting correctly
   - Identify the exact timing window where the bug occurs

3. **Evaluate Solutions**
   - Test debouncing approach
   - Evaluate alternative drag libraries
   - Check Svelte 5 compatibility of current library
   - Consider query state persistence approach

4. **Implement Fix**
   - Choose best approach based on investigation
   - Implement fix
   - Add tests to prevent regression
   - Verify fix resolves the edge case

5. **Verify and Document**
   - Test that fix doesn't break normal drag operations
   - Verify fix resolves the edge case
   - Update documentation if needed

## Acceptance Criteria
- The "Loading tasks..." bug no longer occurs after rapid drag operations
- Normal drag operations continue to work correctly
- No performance degradation from fix
- Tests added to prevent regression

## Related Milestones
- **042:** Drag-and-Drop Bug (main fix implemented)
- This milestone addresses the remaining edge case from 042

