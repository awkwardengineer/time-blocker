# 078: Fix Drag-and-Drop Edge Case Bug

## Goal
Resolve the drag-and-drop resize bug where dragged items (particularly lists) are resizing during drag operations. This is a follow-up to milestone 042, which fixed the main drag-and-drop bug but left this visual issue.

## Background
Milestone 042 fixed the main drag-and-drop bug by implementing reactive query validation. However, a visual issue remains:
- **Occurs:** During drag operations, the dragged item resizes
- **Symptom:** Lists resize vertically during drag, tasks do not resize
- **Previous investigation:** Attempted to add red borders to drag clones to distinguish them, but the borders were never visible, suggesting the clone may not be where expected or may not exist
- **Focus:** Understanding why the dragged item is resizing and identifying where the drag clone/visual element is created

## Root Cause - CONFIRMED

**The dragged clone element is resizing because it loses column width constraints when moved to `position: fixed`.**

### Evidence from Logs:
- Fixed-positioned clone element found with `position: fixed`, `zIndex: 9999`
- Clone height changes observed: 101px → 120px → 191px → 184px → 139px → 164px during drag
- Resize happens quickly after grab (within 50ms) and when order changes
- Clone has `dataId: "1"` (library quirk, but doesn't affect functionality)

### Root Cause:
1. **Drag Clone Creation:** The `svelte-dnd-action` library creates a clone element and moves it to `position: fixed` for visual feedback
2. **Width Constraint Lost:** When moved to fixed position, the clone loses the column's width constraint (from `grid-cols-5` layout)
3. **TaskList Expansion:** Without width constraint, the TaskList component inside can expand/contract based on content
4. **Height Changes:** As the TaskList expands, the overall list height changes, causing the visual resize

### Why Tasks Don't Resize:
Tasks are likely simpler components without nested content that expands, or they have explicit width constraints that prevent expansion.

## Previous Investigation Notes
- Attempted to add red borders to drag clones to distinguish them from original elements
- Red borders were never visible, suggesting:
  - The clone may not exist where expected
  - The clone may be in a different DOM location (e.g., body, portal)
  - The clone may be created differently than expected
  - The styling may be applied to a different element than anticipated

## Investigation Areas

1. **Clone Detection:** Identify where and when the drag clone is created, and what element it actually is
2. **Dimension Tracking:** Log element dimensions (width, height) before drag starts, during drag, and after drag ends
3. **Style Inspection:** Compare computed styles of original element vs clone during drag
4. **Container Context:** Check if clone is moved to a different container (body, portal) that lacks column width constraints
5. **Library Configuration:** Review `svelte-dnd-action` options for controlling clone creation and styling

## Implementation Steps

1. **Reproduce and Document** ✅
   - Documented exact steps to trigger the resize issue
   - Added comprehensive instrumentation to track:
     - Element dimensions before/during/after drag
     - Clone creation and location (found fixed-positioned clone)
     - CSS styles applied during drag
     - DOM structure changes

2. **Investigate Root Cause** ✅
   - Identified where the drag clone is created (fixed-positioned element)
   - Compared dimensions and styles of original vs clone
   - Confirmed container context differences (clone loses column width constraint)
   - Identified what causes vertical resizing (TaskList expansion without width constraint)

3. **Evaluate Solutions** ✅
   - Chose Svelte action approach to lock width when element becomes fixed-positioned
   - Action monitors all elements with same `data-id` (original + clones)
   - Captures original width and applies it when element becomes fixed-positioned

4. **Implement Fix** ✅
   - Created `lockDragCloneWidth` Svelte action in `ListColumn.svelte`
   - Action polls every 16ms (~60fps) to detect fixed-positioned elements
   - Locks width to original width when element becomes fixed-positioned
   - Works for both original element and any clones with same `data-id`
   - Applied action to list wrapper divs

5. **Verify and Document** ✅
   - Fix implemented and verified
   - Resize issue resolved
   - Documentation updated

## Acceptance Criteria
- Lists no longer resize vertically during drag operations
- Tasks continue to not resize (maintain current behavior)
- Normal drag operations continue to work correctly
- No performance degradation from fix

## Solution: Fixing the Resize Issue ✅

### Implementation: `lockOriginalDimensions` Svelte Action

The fix uses a Svelte action (`lockOriginalDimensions`) that locks the dimensions of list elements before and during drag operations.

#### How It Works:

1. **Capture Dimensions on Pointer Down:**
   - Listens for `mousedown`/`touchstart` events on the list element (capture phase)
   - Captures the element's bounding box dimensions using `getBoundingClientRect()`
   - Calculates `originalWidth` (full width) and `originalHeight` (height minus `margin-bottom`)
   - Captures mouse position relative to the element for later position adjustments

2. **Lock Original Element Dimensions:**
   - Immediately applies inline styles with `!important` to the original element:
     - `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`
     - `box-sizing: border-box`
   - This happens BEFORE the drag library processes the event (using `requestAnimationFrame`)
   - The locked dimensions ensure the clone inherits the correct size

3. **Find and Fix Clone Dimensions:**
   - Continuously polls (every 8ms) to find the fixed-positioned clone
   - Searches for clones by:
     - `data-id` attribute match (most reliable)
     - Width similarity (within 10px of original width)
     - Height similarity (within 30px, accounting for initial collapse)
   - When clone is found, applies the same dimension locks:
     - Same width/height constraints as original
     - Removes `margin-bottom` from clone (to avoid extra space at bottom)
     - Uses `!important` to override library's styles

4. **Unlock After Drag:**
   - Monitors `aria-grabbed` attribute to detect when drag ends
   - Waits for 5 consecutive checks (≈80ms) where drag appears ended AND clone is removed
   - Removes all dimension locks from original element
   - Falls back to `mouseup`/`touchend` with 300ms delay if needed

#### Key Technical Details:

- **Height Calculation:** `originalHeight = rect.height - marginBottom`
  - Lists have `mb-6` (24px margin-bottom) that creates spacing between lists
  - Tasks don't have margin-bottom, so they don't have this issue
  - By subtracting margin from height, the clone matches the visual size of tasks during drag

- **Timing:** Uses `requestAnimationFrame` to ensure styles are applied before the library processes the event

- **Clone Detection:** Handles timing issues where:
  - Clone may start at 0x0 dimensions before library sizes it
  - Clone's `data-id` may not be set immediately
  - Multiple fixed-positioned elements may exist (library internals)

- **Content Visibility:** Intentionally does NOT set `overflow: hidden` or `contain` properties, as these would hide content in the clone

#### Code Location:
- File: `4-src/src/components/ListColumn.svelte`
- Function: `lockOriginalDimensions(node, listId)`
- Applied to: List wrapper divs via `use:lockOriginalDimensions={listToRender.id}`

## Attempted Fixes for Sliding/Offset Issue ❌

### Problem
The dragged clone appears offset from where the user initially grabbed it, sliding downward by approximately 20-24px (equal to the `margin-bottom` value).

### Root Cause Hypothesis
The drag library (`svelte-dnd-action`) calculates the initial clone position based on:
1. The original element's bounding box (which includes `margin-bottom`)
2. The mouse position relative to that bounding box

However, we make the clone shorter by subtracting `margin-bottom` from the height. This creates a mismatch:
- Library expects clone height = original bounding box height (with margin)
- Actual clone height = original height - margin
- Result: Clone is positioned as if it's taller than it actually is, causing downward offset

### Attempted Solutions

#### Attempt 1: Transform Adjustment Based on Mouse Position
**Approach:** Adjust the clone's `transform` matrix to compensate for the height difference.

**Implementation:**
- Parse the existing `transform` matrix from the clone
- Calculate adjustment: `adjustment = marginBottom * (mouseOffsetY / originalRectHeight)`
- Adjust `transformY`: `transformY -= adjustment`
- Apply adjusted transform with `!important`

**Result:** ❌ Still offsetting. The adjustment formula may be incorrect, or the library overwrites the transform after we apply it.

#### Attempt 2: Keep Full Height (Including Margin)
**Approach:** Don't subtract margin from height, keep the full bounding box height.

**Implementation:**
- Changed `originalHeight = rect.height - marginBottom` to `originalHeight = rect.height`
- Removed margin-bottom from clone via `margin-bottom: 0 !important`

**Result:** ❌ Clone had extra space at bottom (equal to margin), and still offsetting.

#### Attempt 3: Improved Clone Detection
**Approach:** Better matching logic to find the correct clone element.

**Implementation:**
- Prioritize matching by `data-id` attribute
- Fall back to width similarity (within 10px)
- Also match by height similarity (within 30px)
- Don't skip clones with 0 dimensions if they match by data-id or width

**Result:** ❌ Clone detection improved, but position adjustment still not working correctly.

#### Attempt 4: Measure Actual Visual Offset
**Approach:** Log and measure the actual visual offset to understand the exact problem.

**Implementation:**
- Calculate `topOffset = cloneTop - nodeTop`
- Log transform values, mouse position, and offsets
- Measure offset before and after adjustment

**Result:** ❌ Provided diagnostic information but didn't fix the issue. Logs showed:
- Clone has transform like `matrix(1, 0, 0, 1, 1, 5)` with +5px Y offset
- Our adjustment calculations weren't being applied (clone not found in time)
- Timing issues: clone starts at 0x0, data-id not set immediately

### Current Status
The sliding/offset issue remains unresolved. The clone detection has timing issues:
- Clone may not have `data-id` set when we check (returns `null`)
- Clone may start at 0x0 dimensions before library sizes it
- By the time clone is properly sized and detectable, the library has already calculated and applied the initial position

### Potential Next Steps
1. **Intercept at Library Level:** Hook into the library's position calculation before it's applied
2. **CSS-Based Fix:** Use CSS transforms or positioning to adjust the clone's visual position
3. **Different Approach:** Keep full height including margin, but use CSS to hide/remove the visual margin space
4. **Library Configuration:** Check if `svelte-dnd-action` has options to control initial position calculation

## Related Milestones
- **042:** Drag-and-Drop Bug (main fix implemented)
- This milestone addresses the remaining edge case from 042

