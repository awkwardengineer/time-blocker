# Refactoring Suggestions for Board.svelte and Related Components

## Priority 1: High Impact, Low Risk

### 1. Extract Drag Handlers to Utility Module ✅
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
- Cleaner code without debug noise

**Status**: ✅ Completed - Extracted to listDragHandlers.js, reduced handlers from 35+58 lines to 5+20 lines, all tests passing

### 2. Remove Debug Logging ✅
**Location**: Throughout `Board.svelte`

**Problem**: 30+ console.log statements, especially in drag handlers - leftover debug code that's not needed

**Solution**: Remove all console.log statements from drag handlers and other areas. Keep only console.error for actual error handling.

**Benefits**:
- Cleaner, more readable code
- No performance overhead
- Easier to maintain

**Status**: ✅ Completed - Removed 30+ console.log statements from Board.svelte, all tests passing

### 3. Extract Keyboard Drag Composable ✅
**Location**: `Board.svelte` lines 119-330

**Problem**: 
- 200+ lines of keyboard drag logic
- Similar pattern exists in TaskList.svelte
- Hard to test and reuse

**Solution**: Create `src/lib/useKeyboardListDrag.js`
```javascript
export function setupKeyboardListDragHandler(state, onMove, onStop, onBlur) {
  // Document-level keydown handler
  // Returns cleanup function
}
```

**Benefits**:
- Reusable for tasks and lists
- Easier to test
- Cleaner component code

**Status**: ✅ Completed - Extracted document-level handler to composable, reduced $effect from 88 lines to 10 lines, all tests passing

## Priority 2: Medium Impact, Medium Risk

### 4. Group Related State ✅
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

**Status**: ✅ Completed - Grouped 3 state variables into 1 object, updated all references, all tests passing

### 5. Extract List Creation Logic ✅
**Location**: `Board.svelte` lines 373-509

**Problem**: 130+ lines of list creation logic mixed with other concerns

**Solution**: Create `src/lib/useListCreation.js`
```javascript
export function useListCreation(state) {
  // Handlers and effect setup functions
  // Returns handlers and setup functions
}
```

**Benefits**:
- Separation of concerns
- Reusable if needed
- Easier to test

**Status**: ✅ Completed - Extracted to useListCreation.js, reduced Board.svelte by ~130 lines, all tests passing

### 6. Extract Focus Management Utilities ✅
**Location**: Scattered throughout `Board.svelte` and `TaskList.svelte`

**Problem**: Focus logic duplicated and hard to maintain

**Solution**: Create `src/lib/focusUtils.js`
```javascript
export async function focusElementWithRetry(getElement, options = {}) {
  // Retry logic with configurable attempts and intervals
  // Returns element or null
}

export function focusListCardForKeyboardDrag(listId) {
  // Focus list card for keyboard drag feedback
}

export function findNextFocusTarget(container, itemSelector, focusableSelector) {
  // Find next logical focus target
}
```

**Benefits**:
- DRY principle
- Consistent behavior
- Easier to maintain

**Status**: ✅ Completed - Extracted to focusUtils.js, updated Board.svelte and TaskList.svelte, all tests passing

## Priority 3: Low Impact, Low Risk (Nice to Have)

### 7. Extract Constants ✅
**Location**: Throughout components

**Problem**: Magic numbers and repeated values

**Solution**: 
```javascript
// src/lib/constants.js (extend existing)
export const FOCUS_RETRY_ATTEMPTS = 20;
export const FOCUS_RETRY_INTERVAL = 10;
export const FOCUS_RETRY_ATTEMPTS_EXTENDED = 40;
export const DOM_UPDATE_DELAY_MS = 200;
export const DOM_UPDATE_DELAY_SHORT_MS = 10;
export const DOM_UPDATE_DELAY_MEDIUM_MS = 20;
```

**Status**: ✅ Completed - Extracted magic numbers to constants.js, updated TaskList.svelte and ListColumn.svelte, all tests passing

### 8. Simplify State Initialization
**Location**: `Board.svelte` lines 48-77

**Problem**: Two separate effects for similar initialization

**Solution**: Combine into one effect with better logic

### 9. Extract Validation Helpers ✅
**Location**: `Board.svelte` lines 438-455, 483-499 (now in useListCreation.js)

**Problem**: Similar validation logic repeated

**Solution**: Create helper function
```javascript
function validateAndNormalizeListInput(input) {
  if (isEmpty(input)) return { valid: false, normalized: '' };
  const { text, isBlank } = normalizeInput(input);
  return { valid: !isBlank, normalized: text };
}
```

**Status**: ✅ Completed - Extracted to inputValidation.js, updated useListCreation.js to use helper, reduced duplicate validation logic from ~30 lines to ~10 lines, all tests passing

## Component-Specific Suggestions

### TaskList.svelte
- Similar keyboard drag extraction (Priority 1)
- Extract modal management to composable (Priority 2)
- Extract cross-list movement logic (Priority 2)

### ListColumn.svelte
- Already well-structured, minimal changes needed
- Consider extracting empty drop zone logic if reused

## Implementation Order

1. **Remove debug logging** (easiest, immediate benefit - cleanup leftover code)
2. **Extract drag handlers** (high impact, testable)
3. **Extract keyboard drag** (reusable, high value)
4. **Group state** (low risk, better organization)
5. **Extract list creation** (medium effort, cleaner code)

## Testing Strategy

- Extract pure functions first (easy to test)
- Keep existing behavior (refactor, don't rewrite)
- Test incrementally after each extraction
- Use existing test suite to verify no regressions

