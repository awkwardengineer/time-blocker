# Refactoring Suggestions for Board.svelte and Related Components

## Priority 1: High Impact, Low Risk

### 1. Extract Drag Handlers to Utility Module
**Location**: `Board.svelte` lines 531-726

**Problem**: 
- `handleListConsider` (98 lines) and `handleListFinalize` (95 lines) are very long
- Heavy debug logging makes code hard to read
- Logic is tightly coupled to component state

**Solution**: Create `src/lib/listDragHandlers.js`
```javascript
// Pure functions for drag handling logic
export function processListConsider(items, columnIndex, currentLists) {
  // Core logic without logging
  // Returns updated lists array
}

export function shouldSkipFinalizeUpdate(items, columnIndex, sourceLists) {
  // Decision logic extracted
  // Returns boolean
}
```

**Benefits**:
- Testable in isolation
- Easier to read component code
- Can conditionally enable logging

### 2. Conditional Debug Logging
**Location**: Throughout `Board.svelte`

**Problem**: 30+ console.log statements, especially in drag handlers

**Solution**: 
```javascript
// src/lib/debug.js
export const DEBUG_DRAG = import.meta.env.DEV && false; // Toggle easily

export function debugLog(category, ...args) {
  if (DEBUG_DRAG && category === 'drag') {
    console.log(...args);
  }
}
```

**Benefits**:
- Easy to enable/disable
- No performance impact in production
- Cleaner code

### 3. Extract Keyboard Drag Composable
**Location**: `Board.svelte` lines 119-330

**Problem**: 
- 200+ lines of keyboard drag logic
- Similar pattern exists in TaskList.svelte
- Hard to test and reuse

**Solution**: Create `src/lib/useKeyboardDrag.js`
```javascript
export function useKeyboardDrag(options) {
  const { 
    active, 
    listId, 
    onMove, 
    onStop,
    focusElement 
  } = options;
  
  // Document-level keydown handler
  // Focus management
  // Return cleanup function
}
```

**Benefits**:
- Reusable for tasks and lists
- Easier to test
- Cleaner component code

## Priority 2: Medium Impact, Medium Risk

### 4. Group Related State
**Location**: `Board.svelte` lines 40-46

**Problem**: Multiple related state variables scattered

**Current**:
```javascript
let keyboardListDrag = $state({ active: false, listId: null });
let lastKeyboardDraggedListId = $state(null);
let shouldRefocusListOnNextTab = $state(false);
```

**Solution**:
```javascript
let keyboardDrag = $state({
  active: false,
  listId: null,
  lastDraggedId: null,
  shouldRefocusOnNextTab: false
});
```

**Benefits**:
- Better organization
- Easier to pass around
- Clearer relationships

### 5. Extract List Creation Logic
**Location**: `Board.svelte` lines 373-509

**Problem**: 130+ lines of list creation logic mixed with other concerns

**Solution**: Create `src/lib/useListCreation.js`
```javascript
export function useListCreation() {
  let columnIndex = $state(null);
  let input = $state('');
  let inputElement = $state(null);
  
  // All handlers and effects
  // Return public API
}
```

**Benefits**:
- Separation of concerns
- Reusable if needed
- Easier to test

### 6. Extract Focus Management Utilities
**Location**: Scattered throughout `Board.svelte` and `TaskList.svelte`

**Problem**: Focus logic duplicated and hard to maintain

**Solution**: Create `src/lib/focusUtils.js`
```javascript
export async function focusElementWithRetry(selector, options = {}) {
  // Retry logic
  // Returns element or null
}

export function setupTabResume(element, onTab) {
  // Tab-resume behavior
  // Returns cleanup
}
```

**Benefits**:
- DRY principle
- Consistent behavior
- Easier to maintain

## Priority 3: Low Impact, Low Risk (Nice to Have)

### 7. Extract Constants
**Location**: Throughout components

**Problem**: Magic numbers and repeated values

**Solution**: 
```javascript
// src/lib/constants.js (extend existing)
export const DRAG_DEBUG = false;
export const FOCUS_RETRY_ATTEMPTS = 20;
export const FOCUS_RETRY_INTERVAL = 10;
```

### 8. Simplify State Initialization
**Location**: `Board.svelte` lines 48-77

**Problem**: Two separate effects for similar initialization

**Solution**: Combine into one effect with better logic

### 9. Extract Validation Helpers
**Location**: `Board.svelte` lines 438-455, 483-499

**Problem**: Similar validation logic repeated

**Solution**: Create helper function
```javascript
function validateAndNormalizeListInput(input) {
  if (isEmpty(input)) return { valid: false, normalized: '' };
  const { text, isBlank } = normalizeInput(input);
  return { valid: !isBlank, normalized: text };
}
```

## Component-Specific Suggestions

### TaskList.svelte
- Similar keyboard drag extraction (Priority 1)
- Extract modal management to composable (Priority 2)
- Extract cross-list movement logic (Priority 2)

### ListColumn.svelte
- Already well-structured, minimal changes needed
- Consider extracting empty drop zone logic if reused

## Implementation Order

1. **Start with logging** (easiest, immediate benefit)
2. **Extract drag handlers** (high impact, testable)
3. **Extract keyboard drag** (reusable, high value)
4. **Group state** (low risk, better organization)
5. **Extract list creation** (medium effort, cleaner code)

## Testing Strategy

- Extract pure functions first (easy to test)
- Keep existing behavior (refactor, don't rewrite)
- Test incrementally after each extraction
- Use existing test suite to verify no regressions

