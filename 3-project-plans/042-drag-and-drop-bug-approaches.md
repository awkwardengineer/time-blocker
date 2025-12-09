# Drag-and-Drop Bug Fix: Approach Analysis

## ELI5: The Problem

Imagine you have a row of picture frames (TaskList components), each showing photos from a specific album (liveQuery). 

**The Bug:**
1. When you drag a frame, the drag library temporarily replaces it with a placeholder frame that looks similar but has a fake ID
2. Your photo album query gets confused - it tries to load photos for the fake ID
3. When the real frame comes back, the query is already "broken" and stuck loading forever
4. This especially affects the last frame because placeholders often appear at the end

**Why it happens:**
- `svelte-dnd-action` needs to update `draggableLists` during drag for visual feedback
- Placeholder items with `isDndShadowItem: true` get mixed into `draggableLists`
- These placeholders get passed as `listId` props to `TaskList` components
- `TaskList` creates a `liveQuery` once when it mounts - if it gets a placeholder ID, the query never works
- The query doesn't get recreated when the real ID returns because `tasksQuery` is already set

## The Fix That Was Implemented (Then Rolled Back)

**What it did:**
1. Created `stableLists` - a clean copy of `$lists` that never has placeholders
2. Always rendered `TaskList` components from `stableLists` (not `draggableLists`)
3. This kept components mounted and queries stable during drag

**Why it might limit drag behavior:**
- If you want to show visual feedback during drag (like reordering), rendering from `stableLists` means the visual order doesn't change until drag completes
- The drag library still uses `draggableLists` for its operations, but the visual rendering is decoupled
- This is actually usually fine - most drag libraries handle visual feedback internally

## Approach 1: Pass `stableLists` as Prop to TaskList (Your Suggestion)

**Concept:** Instead of rendering from `stableLists` in App.svelte, pass it as a prop so TaskList can validate its `listId` against the stable list.

**Implementation:**
```javascript
// In App.svelte
let stableLists = $derived($lists || []);

// Render from draggableLists (for drag library), but pass stableLists
{#each draggableLists as list (list.id)}
  <TaskList
    listId={list.id}
    stableLists={stableLists}  // NEW: Pass stable lists
    // ... other props
  />
{/each}
```

```javascript
// In TaskList.svelte
let { listId, stableLists, ... } = $props();

$effect(() => {
  // Only create query if listId exists in stableLists
  const isValid = stableLists.some(list => list.id === listId);
  if (isValid && !tasksQuery) {
    tasksQuery = liveQuery(() => getTasksForList(listId));
  }
});
```

**Pros:**
- ✅ Prevents queries from being created with placeholder IDs
- ✅ Keeps rendering logic in App.svelte (can show drag order changes)
- ✅ TaskList component is defensive - validates its own props
- ✅ Minimal changes to existing code

**Cons:**
- ❌ Still allows TaskList to receive placeholder IDs (just doesn't create query)
- ❌ Component might mount/unmount during drag if draggableLists changes
- ❌ Need to handle query recreation if listId changes from invalid to valid

**Verdict:** Good defensive approach, but doesn't fully solve the remounting issue.

---

## Approach 2: Render from `$lists`, Use `draggableLists` Only for Drag Library (Recommended in Doc)

**Concept:** Completely separate drag state from render state. The drag library uses `draggableLists` for its operations, but we render from `$lists` (source of truth).

**Implementation:**
```javascript
// In App.svelte
<div
  use:dndzone={{
    items: draggableLists,  // Drag library uses this
    type: 'list'
  }}
  onconsider={handleListConsider}
  onfinalize={handleListFinalize}
>
  <!-- But render from $lists (source of truth) -->
  {#each $lists as list (list.id)}
    <div data-id={list.id} class="list-item-wrapper ...">
      <TaskList
        listId={list.id}
        // ... other props
      />
    </div>
  {/each}
</div>
```

**Pros:**
- ✅ Clean separation: drag state vs render state
- ✅ `$lists` never contains placeholders (it's the database source of truth)
- ✅ Components never unmount during drag
- ✅ Queries stay stable
- ✅ Most robust solution

**Cons:**
- ❌ Visual order doesn't change during drag (but drag library handles this internally)
- ❌ Need to ensure `data-id` attributes match between drag items and rendered components
- ❌ Slightly more complex (two sources of truth for ordering)

**Verdict:** Best long-term solution. Clean architecture, prevents the bug entirely.

---

## Approach 3: Filter Placeholders in Handlers (Simplest)

**Concept:** Just filter out placeholders before they enter `draggableLists` state.

**Implementation:**
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

**Pros:**
- ✅ Very simple - minimal code changes
- ✅ Prevents placeholders from ever entering state
- ✅ Keeps current rendering logic intact

**Cons:**
- ❌ Might break drag library visual feedback (it expects placeholders in the array)
- ❌ Need to test that drag library still works correctly
- ❌ Doesn't solve component remounting if array structure changes

**Verdict:** Simple but risky - might break drag library behavior.

---

## Approach 4: Validate `listId` in TaskList + Make Query Reactive

**Concept:** Make TaskList defensive - validate `listId` and recreate query when it changes from invalid to valid.

**Implementation:**
```javascript
// In TaskList.svelte
let previousListId = $state(null);

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
  } else {
    // Invalid listId - clear query
    tasksQuery = null;
    previousListId = null;
  }
});
```

**Pros:**
- ✅ Defensive programming - handles invalid IDs gracefully
- ✅ Query automatically fixes itself when `listId` becomes valid
- ✅ No changes needed in App.svelte

**Cons:**
- ❌ Doesn't prevent the root cause (placeholders still enter state)
- ❌ Query gets destroyed/recreated (might cause flicker)
- ❌ More complex query lifecycle management

**Verdict:** Good defensive approach, but doesn't solve remounting issue.

---

## Approach 5: Don't Update `draggableLists` During `consider`

**Concept:** Only update `draggableLists` in `finalize`, let drag library handle visual feedback internally.

**Implementation:**
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

**Pros:**
- ✅ Placeholders never enter `draggableLists` state
- ✅ Simplest state management
- ✅ Components stay stable

**Cons:**
- ❌ May affect visual feedback during drag (though drag library might handle this internally)
- ❌ Need to verify drag library works correctly without state updates during `consider`

**Verdict:** Simplest, but need to test drag library behavior.

---

## Approach 6: Hybrid - stableLists + Validation (Best of Both Worlds)

**Concept:** Combine Approach 1 and Approach 2 - use `stableLists` for rendering, but also validate in TaskList.

**Implementation:**
```javascript
// In App.svelte
let stableLists = $derived($lists || []);

<div
  use:dndzone={{
    items: draggableLists,  // For drag library
    type: 'list'
  }}
>
  <!-- Render from stableLists -->
  {#each stableLists as list (list.id)}
    <div data-id={list.id} class="list-item-wrapper ...">
      <TaskList
        listId={list.id}
        stableLists={stableLists}  // For validation
        // ... other props
      />
    </div>
  {/each}
</div>
```

```javascript
// In TaskList.svelte
let { listId, stableLists, ... } = $props();

$effect(() => {
  // Double-check: listId must exist in stableLists
  const isValid = stableLists.some(list => list.id === listId);
  if (isValid && !tasksQuery) {
    tasksQuery = liveQuery(() => getTasksForList(listId));
  }
});
```

**Pros:**
- ✅ Components never unmount (render from stableLists)
- ✅ Defensive validation in TaskList
- ✅ Clean separation of concerns
- ✅ Most robust

**Cons:**
- ❌ Slightly more complex
- ❌ Two sources of truth (but stableLists is derived from $lists)

**Verdict:** Most robust solution - combines benefits of multiple approaches.

---

## Recommendation

**For immediate fix:** **Approach 2** (Render from `$lists`, use `draggableLists` only for drag library)
- Clean, simple, prevents the bug entirely
- Aligns with principle that `$lists` is source of truth

**For maximum robustness:** **Approach 6** (Hybrid - stableLists + Validation)
- Combines rendering stability with defensive validation
- Best of both worlds

**For your specific question about passing stableLists as prop:** **Approach 1** is good, but **Approach 6** is better because it also solves the remounting issue by rendering from stableLists.

---

## Key Insight: Why stableLists Helps

The core issue is that **component identity is tied to array position** in Svelte's `{#each}`. When `draggableLists` changes during drag:
- Array items shift positions
- Svelte's keyed `{#each}` sees different items at different positions
- Components unmount/remount
- Queries get destroyed/recreated

By rendering from `stableLists` (which doesn't change during drag), components maintain their identity and queries stay alive.

