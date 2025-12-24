# SortableJS Prototype Findings

## Summary
SortableJS **works** for nested drag-and-drop, but requires **more manual work** than `svelte-dnd-action`. It's a viable candidate, but migration would require significant effort.

## What Works ✅

1. **Basic drag-and-drop** - Works perfectly
2. **Cross-list dragging** - Works with `group` option
3. **Nested containers** - Columns → Lists → Tasks works
4. **Visual feedback** - Ghost classes and animations work well
5. **State management** - Works with Svelte 5 `$state` (manual updates required)

## Challenges ⚠️

### 1. Manual Reactivity Handling
**Current library (`svelte-dnd-action`):**
- Automatically handles Svelte reactivity
- Components just update `draggableTasks` and it works

**SortableJS:**
- Must manually update state in `onEnd` callbacks
- Must trigger reactivity manually (e.g., `column1Lists = [...column1Lists]`)
- More code required per drag handler

**Impact:** Medium - More boilerplate, but manageable

### 2. Multiple Sortable Instances
**Current library:**
- One `use:dndzone` per list, handles everything

**SortableJS:**
- Need separate Sortable instance for:
  - Each column (for list dragging)
  - Each task list (for task dragging)
- Must manage lifecycle: create, destroy, reinitialize
- Complex cleanup required

**Impact:** High - More complex, more error-prone

### 3. Reinitialization After DOM Changes
**Problem:** When a list moves between columns, DOM structure changes. Task sortables must be:
1. Destroyed
2. Wait for Svelte to re-render
3. Wait for action bindings to complete
4. Recreated

**Solution found:**
```javascript
await tick() // Wait for Svelte DOM updates
await tick() // Extra tick for bindings
await new Promise(resolve => setTimeout(resolve, 100)) // Wait for actions
// Then reinitialize
```

**Impact:** Medium - Timing-sensitive, but we found a working pattern

### 4. No Built-in Keyboard Support
**Current library:**
- Has keyboard drag support (Enter/Space to start, Arrow keys to move)
- Has known bugs, but it exists

**SortableJS:**
- No keyboard support
- Would need to implement custom keyboard handlers
- Would need to:
  - Detect keyboard drag start (Enter/Space)
  - Simulate drag operations
  - Handle Arrow key navigation
  - Handle Tab resume behavior
  - Handle cross-list boundary movement

**Impact:** High - Significant development effort required

## Comparison Table

| Feature | svelte-dnd-action | SortableJS |
|---------|-------------------|------------|
| Svelte-native | ✅ Yes | ❌ No (framework-agnostic) |
| Automatic reactivity | ✅ Yes | ❌ No (manual) |
| Keyboard support | ✅ Yes (buggy) | ❌ No |
| Nested containers | ✅ Yes | ✅ Yes (with setup) |
| Maintenance status | ⚠️ Less active | ✅ Active |
| Bundle size | Smaller | Larger |
| Documentation | Good | Excellent |
| Community | Smaller | Larger |

## Migration Effort Estimate

### Low Effort (Already Done in Prototype)
- ✅ Basic drag-and-drop setup
- ✅ Cross-list dragging
- ✅ Nested containers pattern

### Medium Effort (Would Need to Do)
- ⚠️ Integrate with existing drag handlers (`taskDragHandlers.js`)
- ⚠️ Integrate with state sync (`syncDragState.js`)
- ⚠️ Update `dragAdapter.js` to use SortableJS
- ⚠️ Handle all edge cases from current implementation

### High Effort (Major Work Required)
- ❌ **Keyboard drag support** - Would need to build from scratch
  - Estimate: 2-3 days of development
  - Would need to replicate all current keyboard drag features:
    - Enter/Space to start drag
    - Arrow keys to move
    - Tab resume behavior
    - Cross-list boundary movement
    - Focus management
- ❌ **Capture-phase handlers** - May need adjustment
- ❌ **Testing** - All keyboard drag tests would need updates

## Recommendation

**SortableJS is a viable candidate IF:**
1. ✅ You're willing to build custom keyboard drag support
2. ✅ You're comfortable with more manual state management
3. ✅ You want better maintenance status and community support

**Consider staying with svelte-dnd-action IF:**
1. ✅ Keyboard drag is critical and you want it "out of the box"
2. ✅ You prefer automatic reactivity handling
3. ✅ Current bugs are manageable

## Next Steps

1. **Test keyboard support** - Try to implement basic keyboard drag in prototype
2. **Measure bundle size impact** - Compare before/after
3. **Test edge cases** - Empty lists, rapid drags, etc.
4. **Performance comparison** - Measure drag smoothness, memory usage
5. **Decision point** - Based on keyboard support feasibility

## Code Patterns Discovered

### Pattern 1: Nested Sortable Setup
```javascript
// Column-level (lists)
new Sortable(columnElement, {
  group: 'lists',
  draggable: '.list-container',
  filter: 'ul, li' // Prevent task dragging
})

// Task-level (tasks within lists)
new Sortable(taskListElement, {
  group: 'tasks',
  draggable: 'li[data-task-id]'
})
```

### Pattern 2: Reinitialization After DOM Changes
```javascript
async function reinitializeAfterMove() {
  // Destroy old
  taskSortables.forEach(s => s.destroy())
  taskSortables.clear()
  
  // Wait for Svelte
  await tick()
  await tick()
  await new Promise(r => setTimeout(r, 100))
  
  // Recreate
  initializeTaskSortables()
}
```

### Pattern 3: Manual State Updates
```javascript
// Must manually update state and trigger reactivity
sourceList.tasks = reordered
column1Lists = [...column1Lists] // Trigger reactivity
```

