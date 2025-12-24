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

## Keyboard Support Specification

### Overview
Since SortableJS has no built-in keyboard support, we need to implement custom keyboard handlers. This spec outlines the required functionality, taking guidance from the existing `svelte-dnd-action` implementation but simplified for SortableJS.

### Core Requirements

#### 1. **Start Keyboard Drag**
- **Trigger**: `Enter` or `Space` key when focused on a draggable item (task `<li>` or list container)
- **Behavior**:
  - Set keyboard drag state to active
  - Store the dragged item ID
  - Show visual indicator (e.g., highlight, border, or ghost)
  - Show available drop zones (highlight potential drop targets)
  - Focus remains on the dragged item

#### 2. **Move During Drag**
- **Arrow Keys** (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`):
  - Move the dragged item within the current container
  - At boundaries, move to adjacent container (next/previous list or column)
  - Update visual feedback to show new position
  - Update drop zone highlighting

#### 3. **Drop and End Drag**
- **Triggers**:
  - `Enter` or `Space` - Drop at current position
  - `Escape` - Cancel drag, revert to original position
  - `Tab` - Drop and blur (for Tab resume behavior)
- **Behavior**:
  - Execute the drop operation (update state)
  - Clear keyboard drag state
  - Remove visual indicators
  - Hide drop zones
  - For `Tab`: Store element for resume, then blur

#### 4. **Tab Resume Behavior**
- **After drop with Tab**: Store the dropped item element
- **Next Tab press**: Refocus the stored element (instead of normal Tab navigation)
- **After resume**: Clear stored element, Tab behaves normally again

#### 5. **Visual Feedback**
- **During drag**:
  - Highlight the dragged item (e.g., border, background color)
  - Show available drop zones (e.g., highlight list containers or task lists)
  - Show insertion indicator at current position
- **Drop zones**:
  - Highlight valid drop targets
  - Show invalid drop targets (if any restrictions)
  - Update as Arrow keys move the item

### Implementation Approach

#### Option 1: Simulate SortableJS Operations
- Use SortableJS API to programmatically move items
- Call `sortable.toArray()` to get current order
- Use `sortable.sort()` or manipulate DOM directly
- Trigger `onEnd` callback to update state

#### Option 2: Direct State Manipulation
- Skip SortableJS for keyboard operations
- Directly update state arrays
- Manually update DOM order
- Reinitialize Sortable instances after state change

**Recommendation**: Option 1 (simulate operations) - More consistent with mouse drag behavior

### State Management

```javascript
let keyboardDragState = {
  active: false,           // Is keyboard drag active?
  draggedItemId: null,     // ID of item being dragged
  draggedItemType: null,   // 'task' or 'list'
  lastBlurredElement: null, // Element to refocus on next Tab
  shouldRefocusOnNextTab: false // Should next Tab refocus?
}
```

### Key Handlers Needed

1. **Item-level handler** (on task `<li>` or list container):
   - `Enter`/`Space` - Start/stop drag
   - `Escape` - Cancel drag

2. **Document-level handler** (during drag):
   - `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` - Move item
   - `Tab` - Drop and blur
   - `Escape` - Cancel drag

3. **Tab resume handler**:
   - Intercept `Tab` after drop
   - Refocus stored element

### Edge Cases

- **Empty lists**: Can still be drop targets
- **Boundaries**: At first/last item, Arrow keys move to adjacent container
- **Nested containers**: Arrow keys navigate within current level first
- **Focus management**: Ensure focus doesn't get lost during drag
- **Multiple rapid key presses**: Debounce or queue operations

### Testing Checklist

- [ ] Enter/Space starts drag on task
- [ ] Enter/Space starts drag on list
- [ ] Arrow keys move within container
- [ ] Arrow keys move between containers at boundaries
- [ ] Enter drops at current position
- [ ] Escape cancels drag
- [ ] Tab drops and blurs
- [ ] Tab resume works after Tab drop
- [ ] Visual feedback shows during drag
- [ ] Drop zones highlight correctly
- [ ] Works with nested containers (columns → lists → tasks)

## Next Steps

1. **Implement keyboard support prototype** - Build according to spec above
2. **Test all edge cases** - Verify behavior matches spec
3. **Measure bundle size impact** - Compare before/after
4. **Performance comparison** - Measure drag smoothness, memory usage
5. **Decision point** - Based on keyboard support feasibility and complexity

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

