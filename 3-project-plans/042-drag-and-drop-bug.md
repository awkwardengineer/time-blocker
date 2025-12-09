## Bug Pattern Summary
Based on user report:
1. **Only occurs on the last list** - suggests boundary condition or array-end handling issue
2. **Only after dragging another list first** - suggests state corruption or timing issue that accumulates
3. **Shows "Loading tasks..." indefinitely** - query observable exists but never emits
4. **Refresh fixes it** - confirms data is in database, issue is with query subscription

## Debugging Notes
During debugging, we discovered that the drag-and-drop library (`svelte-dnd-action`) creates placeholder elements with IDs like `'id:dnd-shadow-placeholder-0000'` during drag operations. These placeholder IDs are passed as `listId` props to `TaskList` components, which can cause queries to be created with invalid IDs or interfere with component lifecycle.

## Root Cause Analysis

**The Problem:**
- `svelte-dnd-action` creates placeholder elements with IDs like `'id:dnd-shadow-placeholder-0000'` during drag operations
- These placeholder IDs get passed as `listId` props to `TaskList` components
- In `TaskList.svelte` (lines 44-49), the `$effect` creates a `liveQuery` once when `listId` is available and `tasksQuery` is null
- If a placeholder ID is passed, the query gets created with an invalid ID and never emits
- The query never gets recreated when `listId` becomes valid because `tasksQuery` is already set

**Why it affects the last list:**
- Placeholders may be added at the end of the `draggableLists` array during drag operations, affecting the last rendered list

## Additional Insights (from Gemini)

**How svelte-dnd-action works:**
- The library inserts a temporary data object into `e.detail.items` array for the placeholder during drag operations
- This placeholder object has the unique ID of the dragged item, but the placeholder itself in the DOM uses an internal ID like `id:dnd-shadow-placeholder-0000`
- If not handled correctly, this placeholder object can end up in your actual data array after a drag operation

**Best Practice with svelte-dnd-action + Dexie:**
- **In `consider` handler**: Update local Svelte array with `e.detail.items` (includes placeholder) - NO Dexie write
- **In `finalize` handler**: Update local Svelte array with `e.detail.items` (no placeholder), THEN do Dexie write
- The placeholder should be filtered out before any data reaches Dexie or gets used as component props

**Current Implementation Status:**
- ✅ `TaskList.svelte`: `handleConsider` and `handleFinalize` correctly update `draggableTasks` from `e.detail.items`
- ✅ `App.svelte`: `handleListConsider` and `handleListFinalize` correctly update `draggableLists` from `e.detail.items`
- ❌ **Issue**: Placeholder items in `draggableLists` are being passed as `listId` props to `TaskList` components
- ❌ **Issue**: No validation to prevent invalid `listId` values from creating queries

## Implementation Summary

### Initial Problem
When dragging lists, the last list would show "Loading tasks..." indefinitely after drag operations. The root cause was:
- `svelte-dnd-action` creates placeholder items with `isDndShadowItem: true` during drag operations
- These placeholder items have the same `id` as the real list but are temporary visual elements
- When placeholders appeared in `draggableLists`, they were being passed to `TaskList` components
- `TaskList` components were being unmounted/remounted during drag, causing queries to be destroyed and recreated
- This led to the "Loading tasks..." state because queries were being recreated as "new" instead of staying mounted

### Fix Implemented
1. **Created validation functions** (`isValidListId()` and `isValidList()`) to detect placeholder items by checking for `isDndShadowItem: true`
2. **Created `stableLists`** - a derived state from `$lists` (source of truth) that always contains all valid lists, independent of drag operations
3. **Updated rendering logic** - Always render `TaskList` components from `stableLists`, even when placeholders appear in `draggableLists`
4. **Fixed query recreation** - Added tracking of `previousListId` to prevent unnecessary query recreation when `listId` hasn't actually changed
5. **Placeholder handling** - When placeholders appear, we look up the corresponding real list from `stableLists` and render it (with reduced opacity for placeholders)

**Result**: Lists no longer disappear during drag, queries stay mounted, and the "Loading tasks..." bug is fixed.

### Current Issue: Drag Alignment Problem
When dragging a list, the dragged element "floats" away from the mouse cursor. The offset varies based on where you click:
- Clicking near the top of the list: ~1rem offset
- Clicking near the bottom of the list: Much larger offset (several rem)

**Root Cause**: The drag library (`svelte-dnd-action`) calculates the drag offset from the click point to the top of the draggable element. The original structure had:
- A wrapper div with `flex items-center` containing a drag handle and the TaskList
- The drag handle was outside the TaskList component
- This caused the drag library to use the wrapper div's top as the reference point, but the visual content (TaskList) starts lower due to the h2 spacing

**Attempted Fix**: Moved the drag handle inside the `TaskList` component to align it with the h2 (top of visual content). This should make the offset calculation more accurate, but needs testing to confirm it resolves the issue.

**Next Steps**: 
- Test if moving the drag handle inside TaskList fixes the alignment
- If not, may need to adjust the drag library's offset calculation or restructure the component hierarchy
- Consider using CSS to ensure the drag handle aligns perfectly with the visual content top

## Alternative Approaches (Post-Rollback)

After rolling back the complex fix, here are simpler alternative approaches to prevent placeholder items from breaking TaskList components:

### Approach 1: Filter Placeholders in Handlers (Simplest)
**Implementation:**
- Filter out items with `isDndShadowItem: true` when updating `draggableLists` in `handleListConsider` and `handleListFinalize`
- Use a helper function to check for placeholder items before updating state

**Pros:**
- Minimal code changes
- Prevents placeholders from ever entering `draggableLists` state
- Keeps current rendering logic intact

**Cons:**
- Still renders from `draggableLists` (could have edge cases if filtering misses something)
- Need to ensure filtering works correctly in both handlers

**Code changes:**
```javascript
function isPlaceholderItem(item) {
  return item && (item.isDndShadowItem === true || 
                  typeof item.id === 'string' && item.id.startsWith('id:dnd-shadow-placeholder-'));
}

function handleListConsider(event) {
  // Filter out placeholders before updating state
  draggableLists = event.detail.items.filter(item => !isPlaceholderItem(item));
}

async function handleListFinalize(event) {
  // Filter out placeholders before updating state
  draggableLists = event.detail.items.filter(item => !isPlaceholderItem(item));
  // ... rest of function
}
```

### Approach 2: Render from `$lists`, Use `draggableLists` Only for Drag Library (Recommended)
**Implementation:**
- Keep `draggableLists` for the drag library's `items` array (it needs this for drag operations)
- Render `TaskList` components from `$lists` (source of truth) instead of `draggableLists`
- Match items by ID to ensure correct rendering order

**Pros:**
- Clean separation of concerns: drag state vs. render state
- `$lists` is always valid (never contains placeholders)
- Placeholders never affect component rendering
- Most robust solution

**Cons:**
- Need to ensure `data-id` attributes match between drag library items and rendered components
- Slightly more complex rendering logic (need to match by ID)

**Code changes:**
```svelte
<!-- Keep draggableLists for drag library -->
<div
  use:dndzone={{
    items: draggableLists,
    type: 'list'
  }}
  onconsider={handleListConsider}
  onfinalize={handleListFinalize}
>
  <!-- But render from $lists (source of truth) -->
  {#each $lists as list (list.id)}
    <div data-id={list.id} class="list-item-wrapper flex items-center gap-2 cursor-move">
      <span class="drag-handle ...">⋮⋮</span>
      <TaskList
        listId={list.id}
        listName={list.name ?? 'Unnamed list'}
        newTaskInput={newTaskInputs[list.id] || ''}
        onInputChange={(value) => handleInputChange(list.id, value)}
        allLists={$lists}
      />
    </div>
  {/each}
</div>
```

### Approach 3: Validate `listId` in TaskList + Make Query Reactive
**Implementation:**
- Add simple numeric validation for `listId` in `TaskList.svelte` before creating queries
- Make the query reactive to `listId` changes (recreate when `listId` changes from invalid to valid)

**Pros:**
- Defensive programming - handles invalid IDs gracefully
- Prevents queries from being created with invalid IDs
- Query automatically fixes itself when `listId` becomes valid

**Cons:**
- Doesn't prevent the root cause (placeholders still enter state)
- More complex query lifecycle management

**Code changes:**
```javascript
// In TaskList.svelte
function isValidListId(id) {
  return id != null && typeof id === 'number' && !isNaN(id);
}

$effect(() => {
  // Only create/update query with valid listId
  if (isValidListId(listId)) {
    // Recreate query if listId changed
    if (!tasksQuery || previousListId !== listId) {
      tasksQuery = liveQuery(() => getTasksForList(listId));
      previousListId = listId;
    }
  }
});
```

### Approach 4: Don't Update `draggableLists` During `consider`
**Implementation:**
- Only update `draggableLists` in `handleListFinalize`, not in `handleListConsider`
- Let the drag library handle visual feedback internally

**Pros:**
- Placeholders never enter `draggableLists` state
- Simplest state management

**Cons:**
- May affect visual feedback during drag (though drag library might handle this internally)
- Need to verify drag library works correctly without state updates during `consider`

**Code changes:**
```javascript
function handleListConsider(event) {
  // Don't update draggableLists - let drag library handle visual feedback
  // draggableLists = event.detail.items; // REMOVED
}

async function handleListFinalize(event) {
  // Only update here, after drag is complete (no placeholders)
  draggableLists = event.detail.items;
  // ... rest of function
}
```

### Recommendation
**Approach 2** is recommended because:
1. It cleanly separates drag state from render state
2. It's the most robust (placeholders can never affect rendering)
3. It aligns with the principle that `$lists` is the source of truth
4. It's simpler than the previous complex fix (no `stableLists`, no complex matching logic)

If Approach 2 seems too complex, **Approach 1** is a good fallback - it's very simple and should work well.
