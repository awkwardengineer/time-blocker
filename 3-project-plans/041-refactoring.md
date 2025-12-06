 # 041: Code Refactoring

## Goal
Improve code maintainability, reduce duplication, and eliminate magic numbers by extracting reusable components, utilities, and constants.

## Refactoring Tasks

### 1. Extract AddTaskInput Component (DRY)
**Priority: High**  
**Files:** `4-src/src/components/TaskList.svelte`

**Problem:**
- "Add Task" button/input markup is duplicated 3 times:
  - Empty list state (line ~517)
  - Non-empty list state (line ~637)
  - Loading state (line ~706)

**Solution:**
- Create `AddTaskInput.svelte` component
- Accept props: `isInputActive`, `inputValue`, `onInputChange`, `onSave`, `onEscape`, `placeholder`, `buttonText`
- Replace all 3 instances with component usage

**Acceptance Criteria:**
- ✅ Component created with all necessary props
- ✅ All 3 instances replaced
- ✅ Tests still pass
- ✅ No visual changes

---

### 2. Extract Click-Outside Utility
**Priority: High**  
**Files:** `4-src/src/App.svelte`, `4-src/src/components/TaskList.svelte`

**Problem:**
- Click-outside-to-close logic duplicated in 3 places:
  - App.svelte: create list input (lines ~83-115)
  - App.svelte: unnamed list input (lines ~188-220)
  - TaskList.svelte: task input (lines ~133-174)

**Solution:**
- Create utility function: `useClickOutside(element, callback, options)`
- Options: `ignoreElements` (array of elements to ignore), `onlyCloseIfEmpty` (boolean)
- Use in all 3 locations

**Acceptance Criteria:**
- ✅ Utility function created
- ✅ All 3 instances replaced
- ✅ Tests still pass
- ✅ Behavior unchanged

---

### 3. Extract Textarea Auto-Resize Utility
**Priority: Medium**  
**Status: ⏸️ POSTPONED**  
**Files:** `4-src/src/App.svelte`, `4-src/src/components/TaskList.svelte`, `4-src/src/components/TaskEditModal.svelte`

**Problem:**
- Textarea auto-resize logic duplicated in multiple places:
  - App.svelte: unnamed list input (lines ~223-234, ~237-249)
  - TaskList.svelte: task input (lines ~177-189, ~192-204)
  - TaskEditModal.svelte: similar logic

**Solution:**
- Create Svelte action: `autoResizeTextarea(node, maxHeight = 160)`
- Use `use:autoResizeTextarea` directive on all textareas

**Acceptance Criteria:**
- [ ] Action created
- [ ] All instances replaced
- [ ] Tests still pass
- [ ] Textarea behavior unchanged

**Why Postponed (ELI5):**
Right now, all the textareas use the same hardcoded `160px` max height. But when we add styling later, different textareas might need different sizes (like a small input vs. a big modal textarea). If we extract this utility now with a fixed size, we'd have to change it later anyway. It's like buying shoes for a kid who's still growing - better to wait until they're done growing (styling is done) before buying the perfect pair (extracting the utility). Plus, the duplication isn't causing problems right now, so there's no rush.

---

### 4. Extract Input Validation Utilities
**Priority: Medium**  
**Files:** `4-src/src/App.svelte`, `4-src/src/components/TaskList.svelte`

**Problem:**
- Input validation logic duplicated:
  - Empty string checks: `if (inputValue === '')`
  - Whitespace-only checks: `trimmedValue === '' && inputValue.length > 0`
  - Appears in: `handleCreateList`, `handleUnnamedListCreateTask`, `handleCreateTask`

**Solution:**
- Create utility functions:
  - `isEmpty(input: string): boolean`
  - `isWhitespaceOnly(input: string): boolean`
  - `normalizeInput(input: string): { text: string, isBlank: boolean }`

**Acceptance Criteria:**
- ✅ Utility functions created
- ✅ All instances replaced
- ✅ Tests still pass
- ✅ Validation behavior unchanged

---

### 5. Refactor handleArchiveTask Function
**Priority: Medium**  
**Files:** `4-src/src/components/TaskList.svelte`

**Problem:**
- `handleArchiveTask` (lines ~249-315) does too much:
  - Archives task
  - Closes modal
  - Manages focus
  - Queries DOM
  - Retries focus attempts

**Solution:**
- Split into smaller functions:
  - `archiveTask(taskId)` - pure archiving logic
  - `findNextFocusTarget(listId, currentElement)` - focus management
  - `focusAddTaskButton(listId)` - retry logic for focusing button
- Update `handleArchiveTask` to orchestrate these

**Acceptance Criteria:**
- ✅ Function split into focused utilities
- ✅ Tests still pass
- ✅ Focus behavior unchanged
- ✅ Code is more testable

---

### 6. Extract Remaining Magic Numbers
**Priority: Low**  
**Files:** Multiple

**Problem:**
- Pixel values hard-coded: `160px`, `150px`, `1056px`, `816px`, `16px`
- Other timing values may exist

**Solution:**
- Create constants file: `4-src/src/lib/constants.js`
- Define: `MAX_TEXTAREA_HEIGHT`, `TASK_WIDTH`, `PRINT_WIDTH`, `PRINT_HEIGHT`, etc.
- Replace all hard-coded values

**Acceptance Criteria:**
- ✅ Constants file created
- ✅ All magic numbers replaced
- ✅ Tests still pass
- ✅ Visual appearance unchanged

---

### 7. Replace DOM Queries with Reactive References
**Priority: Low**  
**Status: ✅ COMPLETED**  
**Files:** `4-src/src/components/TaskList.svelte`, `4-src/src/components/AddTaskInput.svelte`

**Problem:**
- `document.querySelector('[data-list-id="${listId}"]')` called multiple times (7 instances)
- Traditional caching could cause stale references if DOM changes

**Solution:**
- Use Svelte reactive references (`bind:this`) instead of querying DOM
- Added reactive references: `listSectionElement`, `addTaskContainerElement`, `addTaskTextareaElement`
- Exposed container and textarea elements from `AddTaskInput` component via bindable props
- Updated all functions to use reactive references instead of `listId` parameter
- Used existing `ulElement` reference for finding tasks (tasks are in `<ul>`, not directly in list section)

**Acceptance Criteria:**
- ✅ DOM queries replaced with reactive references
- ✅ Tests still pass (117/117)
- ✅ No stale reference issues - Svelte automatically maintains references
- ✅ Cleaner code - direct element access instead of repeated queries

---

### 8. Extract Modal Positioning Logic
**Priority: Low**  
**Files:** `4-src/src/components/TaskEditModal.svelte`, `4-src/src/components/ListEditModal.svelte`

**Problem:**
- Task and list modals have similar positioning logic
- Could be shared

**Solution:**
- Create utility function: `calculateModalPosition(buttonPosition, options)`
- Options: `offset`, `minWidth`, `placement` (below, above, etc.)
- Use in both modals

**Acceptance Criteria:**
- [ ] Utility function created
- [ ] Both modals use it
- [ ] Tests still pass
- [ ] Modal positioning unchanged

---

## Implementation Order

1. **Start with high-priority items** (1-2) - biggest impact, most duplication
2. **Then medium-priority** (4-5) - good improvements, manageable scope
   - ⏸️ Task 3 (auto-resize utility) postponed - sizes will change with styling
3. **Finish with low-priority** (6-8) - polish and optimization

## Testing Strategy

- Run full test suite after each refactoring task
- Verify no visual/behavioral changes
- Check for performance regressions (if applicable)
- Ensure accessibility is maintained

## Regression Fixes

### Regression: Enter key on Archive/Cancel buttons triggers Save
**Priority: High**  
**Status: ✅ FIXED**  
**Files:** `4-src/src/components/TaskEditModal.svelte`

**Problem:**
- When focus is on Archive or Cancel button in task edit modal, pressing Enter triggers Save instead of the button's action
- The `handleKeydown` function on backdrop/textarea handles all Enter presses globally
- Buttons should handle their own Enter key behavior (default button behavior)

**Solution:**
- Check if active element is the textarea before handling Enter in `handleKeydown`
- Only trigger save on Enter when focus is on the textarea
- Let buttons handle their own Enter key behavior (native button behavior - buttons automatically click on Enter)

**Acceptance Criteria:**
- ✅ Enter on Archive button archives the task (button's natural behavior)
- ✅ Enter on Cancel button cancels and closes modal (button's natural behavior)
- ✅ Enter on textarea still saves (existing behavior preserved)
- ✅ All tests pass (117/117)

## Notes

- All refactoring should maintain existing functionality
- No breaking changes to public APIs
- Keep commits focused (one refactoring task per commit when possible)
- Document any new utilities/components created
- TODO: Check back on GitHub deployments which are failing

