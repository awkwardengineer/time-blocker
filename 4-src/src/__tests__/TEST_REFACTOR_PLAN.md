# Test Suite Refactor Plan

## Current Structure Analysis

### Test Files Organization
- `App.test.js` - Main integration tests (drag-and-drop, cross-list moves, persistence)
- `App.keyboardNavigation.test.js` - Basic keyboard navigation (Tab navigation)
- `App.focusManagement.test.js` - Focus management after actions (modal close, archive)
- `App.taskCreation.test.js` - Task creation UX behaviors
- `App.taskEditing.test.js` - Task editing modal behaviors
- `App.listCreation.test.js` - List creation behaviors
- `App.listEditing.test.js` - List editing behaviors
- `App.unnamedListCreation.test.js` - Unnamed list creation

### Strengths
1. **Good separation of concerns**: Each file focuses on a specific feature area
2. **Consistent structure**: All files use similar patterns (beforeEach, setupTestData)
3. **Helper functions**: Shared helpers in `appTestHelpers.js` reduce duplication
4. **Clear naming**: Test descriptions are descriptive

### Areas for Improvement

#### 1. Keyboard Navigation Tests
**Current State**: `App.keyboardNavigation.test.js` only has Tab navigation test
**Issue**: Missing tests for:
- Cross-list keyboard movement (ArrowDown/ArrowUp at boundaries)
- Keyboard drag-and-drop (Enter to start, arrow keys to move)
- Boundary crossing behavior

**Recommendation**: Add comprehensive keyboard navigation tests to `App.keyboardNavigation.test.js`

#### 2. Cross-List Movement Tests
**Current State**: Cross-list drag-and-drop tests are in `App.test.js` (integration tests)
**Issue**: No keyboard-based cross-list movement tests

**Recommendation**: Add keyboard cross-list movement tests to `App.keyboardNavigation.test.js`

#### 3. Test Helper Functions
**Current State**: Helpers exist but may need expansion
**Potential Addition**: Helper function to simulate keyboard cross-list movement

## Refactor Plan

### Phase 1: Add Missing Tests (Current Priority)
1. ✅ Fix failing test in `App.taskCreation.test.js` (completed)
2. Add keyboard cross-list movement tests to `App.keyboardNavigation.test.js`
   - Test moving down from last task in list → moves to next list
   - Test moving up from first task in list → moves to previous list
   - Test moving down from last task in last list → creates new unnamed list
   - Test focus management during cross-list moves

### Phase 2: Future Improvements (Not Urgent)
1. Consider splitting `App.test.js` if it grows too large
   - Could split into `App.dragAndDrop.test.js` and `App.persistence.test.js`
2. Add helper function for keyboard cross-list movement simulation
3. Document test patterns and conventions

## Implementation Notes

### Keyboard Cross-List Movement Testing
- Use `userEvent.keyboard()` to simulate ArrowDown/ArrowUp
- Focus on task text span (the focusable element)
- Verify task moves between lists in database
- Verify UI updates correctly
- Verify focus remains on moved task

### Test Patterns to Follow
1. Use `waitFor` for async DOM updates
2. Prefer positive assertions (element appears) over negative (element disappears)
3. Use `within()` to scope queries to specific sections
4. Wait for tasks to load before interacting

## No Major Refactoring Needed

The current test structure is well-organized and doesn't require major refactoring. The main gap is missing keyboard cross-list movement tests, which should be added to the existing `App.keyboardNavigation.test.js` file.

