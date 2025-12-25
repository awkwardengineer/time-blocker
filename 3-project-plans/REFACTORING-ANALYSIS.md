# Drag-and-Drop Refactoring Analysis

## Executive Summary

The drag-and-drop system is well-architected with clear separation of concerns. However, there are opportunities to consolidate keyboard and mouse handling, reduce duplication, and create a more unified state management approach.

## Current Architecture Strengths

✅ **Clean State Machines**: Both `DragStateManager` and `TaskDragStateManager` are well-designed, event-driven, and decoupled from Svelte reactivity.

✅ **Good Separation**: Keyboard handling, mouse handling, and state management are in separate modules.

✅ **Library Abstraction**: `dragAdapter.js` and `dragDetectionUtils.js` provide good abstraction layers.

## Refactoring Opportunities

### 1. **Consolidate Keyboard and Mouse Drag Handlers**

**Current State:**
- Mouse drags: Handled via SortableJS callbacks (`onStart`, `onMove`, `onEnd`) directly in components
- Keyboard drags: Handled via separate handlers in `taskKeyboardDrag.js` and `useKeyboardListDrag.js`
- Both paths call the same state manager methods but through different code paths

**Recommendation:**
Create a unified drag operation interface that both keyboard and mouse handlers use:

```javascript
// lib/drag/unifiedDragHandler.js
export function createUnifiedDragHandler(config) {
  return {
    startDrag: (sourceId, targetId) => {
      // Common logic for starting drag (state manager, visual feedback)
    },
    updateDrag: (targetId, items) => {
      // Common logic for updating during drag
    },
    completeDrag: (sourceId, targetId, success) => {
      // Common logic for completing drag
    }
  };
}
```

**Benefits:**
- Single source of truth for drag operations
- Easier to maintain and test
- Consistent behavior between keyboard and mouse

**Complexity:** Medium - Requires refactoring both keyboard and mouse handlers

---

### 2. **Extract Mouse Drag Handlers from Components**

**Current State:**
- SortableJS callbacks (`onStart`, `onMove`, `onEnd`) are embedded in `TaskList.svelte` and `Board.svelte`
- Similar patterns repeated in both components

**Recommendation:**
Extract to dedicated handler files, similar to keyboard handlers:

```javascript
// lib/drag/taskMouseDrag.js
export function createTaskMouseDragHandlers(config) {
  return {
    onStart: (evt) => { /* ... */ },
    onMove: (evt) => { /* ... */ },
    onEnd: (evt) => { /* ... */ }
  };
}
```

**Benefits:**
- Components become thinner and more focused
- Mouse handlers become testable in isolation
- Consistent pattern with keyboard handlers

**Complexity:** Low - Mostly moving existing code

---

### 3. **Unify State Manager Pattern**

**Current State:**
- `DragStateManager` (for lists) and `TaskDragStateManager` (for tasks) have similar patterns but are separate classes
- Both implement: `startDrag`, `updateDragState`, `completeDrag`, `initializeFromQuery`

**Recommendation:**
Create a base class or shared utilities:

```javascript
// lib/drag/baseDragStateManager.js
export class BaseDragStateManager {
  constructor(config) {
    this.state = config.initialState;
    this.listeners = new Map();
  }
  
  // Common methods: subscribe, notify, getState, etc.
}

// Then extend:
export class TaskDragStateManager extends BaseDragStateManager {
  // Task-specific logic
}
```

**Benefits:**
- DRY principle - shared logic in one place
- Easier to add new drag types (e.g., column resizing)
- Consistent API across all drag state managers

**Complexity:** Medium - Requires careful refactoring to maintain backward compatibility

---

### 4. **Consolidate Tab Resume Behavior**

**Current State:**
- Tab resume logic is duplicated in:
  - `taskKeyboardDrag.js` (lines 260-294)
  - `useKeyboardListDrag.js` (lines 44-58)
  - Similar patterns in both

**Recommendation:**
Extract to shared utility:

```javascript
// lib/drag/tabResumeUtils.js
export function createTabResumeHandler(config) {
  return {
    setupTabResume: (element, onResume) => { /* ... */ },
    handleTabResume: (e, shouldResume, element) => { /* ... */ }
  };
}
```

**Benefits:**
- Single implementation to maintain
- Consistent behavior across all drag types
- Easier to test

**Complexity:** Low - Extract and reuse existing logic

---

### 5. **Unify Capture Phase Handlers**

**Current State:**
- `capturePhaseHandlers.js` has three separate functions:
  - `setupListTitleKeydownCapture`
  - `setupAddTaskButtonKeydownCapture`
  - `setupTaskTextKeydownCapture`
- All follow similar pattern: check key, check target, prevent default, call callback

**Recommendation:**
Create a generic capture handler factory:

```javascript
// lib/drag/capturePhaseHandlers.js
export function createCaptureHandler(config) {
  return function handleCapture(e) {
    if (config.keyMatches(e.key) && config.targetMatches(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      config.onMatch(e);
    }
  };
}
```

**Benefits:**
- Less boilerplate
- Easier to add new capture handlers
- More maintainable

**Complexity:** Low - Refactor existing handlers to use factory

---

### 6. **Consolidate Drag Detection**

**Current State:**
- `dragDetectionUtils.js` has good abstraction
- But `isDragActive()` is called from multiple places with slightly different logic

**Recommendation:**
Keep as-is, but ensure all drag detection goes through this utility (already mostly done).

**Complexity:** None - Already well-abstracted

---

## Priority Recommendations

### High Priority (Do First)
1. **Extract Mouse Drag Handlers** - Low complexity, high value
2. **Consolidate Tab Resume Behavior** - Low complexity, reduces duplication

### Medium Priority (Do Next)
3. **Unify Capture Phase Handlers** - Low complexity, improves maintainability
4. **Consolidate Keyboard and Mouse Drag Handlers** - Medium complexity, but creates unified interface

### Low Priority (Nice to Have)
5. **Unify State Manager Pattern** - Medium complexity, but current separation is fine

## Implementation Strategy

### Phase 1: Extract and Consolidate (Low Risk)
1. Extract mouse drag handlers from components
2. Consolidate Tab resume behavior
3. Unify capture phase handlers

### Phase 2: Unify Interfaces (Medium Risk)
1. Create unified drag handler interface
2. Refactor keyboard and mouse handlers to use it
3. Update components to use new interface

### Phase 3: Refactor State Managers (Low Priority)
1. Create base class for state managers
2. Refactor existing state managers to extend it
3. Test thoroughly

## Testing Strategy

For each refactoring:
1. **Unit Tests**: Test extracted functions in isolation
2. **Integration Tests**: Verify keyboard and mouse drags still work
3. **Regression Tests**: Run full test suite
4. **Manual Testing**: Verify all drag scenarios (within list, cross-list, cross-column)

## Risk Assessment

**Low Risk:**
- Extracting mouse handlers (mostly moving code)
- Consolidating Tab resume (extracting shared logic)
- Unifying capture handlers (refactoring similar code)

**Medium Risk:**
- Creating unified drag handler interface (touches many files)
- Refactoring state managers (core functionality)

**Mitigation:**
- Do refactorings incrementally
- Keep old code until new code is tested
- Run full test suite after each change

## Conclusion

The current architecture is solid, but there are clear opportunities to reduce duplication and create more unified interfaces. The recommended refactorings will:

1. Make the codebase more maintainable
2. Reduce duplication
3. Create consistent patterns
4. Make it easier to add new drag types in the future

Start with low-risk, high-value refactorings (extract mouse handlers, consolidate Tab resume), then move to more complex unifications.

