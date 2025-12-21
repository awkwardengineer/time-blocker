# 070: Styling & Polish - Apply UI Kit Design System

## Goal
Update the application to use the same styling system developed in the ui-kit folder. This includes applying the complete design system (colors, typography, fonts, components) to all Svelte components to match the visual design established in the ui-kit reference.

## Acceptance Criteria
- [x] All fonts from ui-kit are configured (Urbanist, Gilda Display, Allura)
- [x] Complete color palette matches ui-kit (grey scale, accent colors)
- [x] Typography scale matches ui-kit (all font sizes and letter spacing)
- [x] Custom checkbox styling matches ui-kit (circular checkboxes with filled center when checked)
- [ ] Component styling matches ui-kit examples:
  - [ ] Task items (default, hover, checked states)
  - [ ] List titles (default, hover, focus states)
  - [ ] Buttons (primary, secondary, archive variants)
  - [ ] Modals (task edit, list edit, confirmation)
  - [ ] Empty states (no lists, no tasks)
  - [ ] Add task input
  - [ ] Create list input
- [ ] Print layout matches ui-kit specifications (1056px × 816px, inset border, 5-column layout)
- [ ] All hover and focus states match ui-kit examples
- [ ] Visual consistency across all components

## Implementation Steps

**Note: Tailwind CSS v3 Decision**
- The UI Kit uses Tailwind CSS v3 (via CDN), and the app has been downgraded from v4 to v3.4.1 to ensure compatibility
- This ensures hover states and other utilities work identically between the UI Kit and the app
- Future upgrade path: Upgrade both UI Kit and app to v4 together when ready

1. **Sync tailwind.config.js to Match UI Kit** ✅
   - **Current State**: The ui-kit uses CDN Tailwind with inline config in `template.html`, while the app uses `tailwind.config.js`. They are NOT currently synced.
   - **Goal**: Update `tailwind.config.js` to match the ui-kit configuration exactly
   - Sync `tailwind.config.js` with ui-kit template.html Tailwind config:
     - ✅ Add Allura font to fontFamily (currently missing)
     - ✅ Add missing decorative typography sizes (decorative-large, decorative-medium, decorative-small)
     - ✅ Add Allura letter spacing ('allura': '0.03em')
     - ✅ Fix letter spacing values to match ui-kit exactly ('gilda-main': '0.05em', 'gilda-sub': '0.03em' instead of '5%' and '3%')
     - ✅ Verify all colors match ui-kit exactly (they appear to match already)
     - ✅ Ensure all typography sizes match ui-kit
   - **Verification**: After updating, verify that `tailwind.config.js` contains all the same configuration as the ui-kit inline config ✅

2. **Update UI Kit to Use tailwind.config.js as Source of Truth** ✅
   - **Goal**: Make the ui-kit use `tailwind.config.js` instead of inline config
   - Update `ui-kit/template.html` to read from `tailwind.config.js`:
     - ✅ Research approach: Since ui-kit uses CDN Tailwind, we may need to:
       - ✅ Option A: Generate a config object from `tailwind.config.js` and inject it into the template
       - Option B: Use a build script to read `tailwind.config.js` and generate the inline config
       - Option C: Switch ui-kit to use local Tailwind build instead of CDN
     - ✅ Update `ui-kit/build.js` if needed to handle config injection
     - ✅ Remove inline Tailwind config from `template.html` and replace with reference to `tailwind.config.js`
   - **Verification**: After updating, verify that:
     - ✅ UI kit still renders correctly
     - ✅ UI kit uses the same config as the app
     - ✅ Changes to `tailwind.config.js` are reflected in the ui-kit

3. **Update Global Styles (app.css)** ✅
   - ✅ Add Allura font import (added to index.html)
   - ✅ Add custom checkbox styling (circular with filled center when checked) - moved to components/checkbox.css
   - ⏸️ Add column width CSS variables and utilities (if needed for print layout) - deferred to step 8 (print styling)
   - ✅ Ensure base body styling matches ui-kit (bg-grey-10, font-urbanist classes)

4. **Update Board and Layout Components** ✅
   - ✅ **Board.svelte**: Ensure column layout matches ui-kit (5-column grid, proper spacing)
   - ✅ **Board.svelte**: Apply column borders (border-r border-grey-50)
   - ✅ **App.svelte**: Update print layout styling (1056px × 816px container, inset border)
   - ✅ **App.svelte**: Ensure print CSS matches ui-kit specifications

5. **Update List Components** ✅
   - ✅ **ListColumn.svelte**: Apply list title styling (font-gilda, text-[24px], text-grey-110)
   - ✅ **ListColumn.svelte**: Update hover and focus states (hover:bg-grey-20, focus:ring-2 focus:ring-blue-500)
   - ✅ **ListColumn.svelte**: Update drag handle styling (text-grey-60, cursor-grab)
   - ✅ **CreateListDropZone.svelte**: Apply create list button styling (text-grey-60, font-gilda, hover:underline)
   - ✅ **CreateListDropZone.svelte**: Update input state styling (border-b-2 border-grey-60, focus:border-blue-500)
   - ✅ **ListEditModal.svelte**: Apply modal styling to match ui-kit
   - ✅ **ListEditModal.svelte**: Update archive button variants (border border-grey-50, bg-grey-20)
   - ✅ **ListEditModal.svelte**: Update confirmation modal styling

6. **Update Task Components**
   - **TaskList.svelte**: Apply task item styling (border-b border-grey-50, hover:bg-grey-20, etc.)
   - **TaskList.svelte**: Update task text styling (text-grey-100, hover:underline)
   - **TaskList.svelte**: Update checked task styling (line-through)
   - **TaskList.svelte**: Update archive button styling (bg-grey-30, hover:bg-grey-40)
   - **AddTaskInput.svelte**: Apply add task input styling (border-b border-grey-50, hover:bg-grey-20)
   - **AddTaskInput.svelte**: Update placeholder text styling (text-grey-60)
   - **AddTaskInput.svelte**: Update input state styling (textarea with focus ring)
   - **TaskEditModal.svelte**: Apply modal styling (bg-grey-10, border-2 border-grey-50, shadow-2xl)
   - **TaskEditModal.svelte**: Update button styling to match ui-kit
   - **TaskEditModal.svelte**: Update validation error styling

7. **Update Shared Components** ✅
   - ✅ **ConfirmationModal.svelte**: Apply modal styling to match ui-kit (bg-grey-10, border-grey-50, text-grey-110)
   - ✅ **ConfirmationModal.svelte**: Update button styling (border-grey-50, hover:bg-grey-20)
   - ✅ **ArchivedView.svelte**: Apply archived view styling (line-through text with text-grey-100, restore button)
   - ✅ **ArchivedView.svelte**: Update list badge styling (bg-grey-30, text-grey-60, border-grey-50)

8. **Update Empty States**
   - Apply empty state styling for "no lists" (text-grey-60, font-gilda)
   - Apply empty state styling for "no tasks" (border-dashed, text-grey-60)
   - Ensure empty states match ui-kit examples exactly

9. **Update Print Styling**
   - Ensure print layout matches ui-kit (fixed 1056px × 816px container)
   - Apply inset border (16px inset, border-grey-80)
   - Ensure 5-column layout works in print
   - Hide interactive elements in print (print:hidden classes)

10. **Verify Typography Usage**
   - Ensure all text uses appropriate typography classes from ui-kit
   - List titles use font-gilda with proper sizing
   - Task text uses text-body font-urbanist
   - Buttons use appropriate text sizes
   - Labels and captions use correct typography

11. **Test and Refine**
    - **Visual Comparison**: Compare each component side-by-side with ui-kit
    - **Interactive States**: Test all hover, focus, and active states
    - **Print Preview**: Verify print output matches ui-kit layout
    - **Responsive**: Ensure mobile layout still works
    - **Accessibility**: Verify focus indicators match ui-kit (blue-500 ring)
    - **Browser Testing**: Test in Chrome, Firefox, Safari, Edge

## Key Styling Details from UI Kit

### Colors
- Background: grey-10 (#FCFCFC)
- Borders: grey-50 (#DBDBD5), grey-60 (#BCBCBC), grey-80 (#B6B6B0)
- Text: grey-60 (#BCBCBC) for placeholders, grey-100 (#757373) for body, grey-110 (#323232) for headings
- Hover backgrounds: grey-20 (#F0F0EE)
- Focus rings: blue-500 (#6B8FD9)

### Typography
- List titles: font-gilda, text-[24px], text-grey-110, leading-none
- Task text: text-body, font-urbanist, text-grey-100
- Placeholder text: text-grey-60
- Buttons: appropriate text sizes based on variant

### Components
- Checkboxes: Circular (16px), border-grey-60, filled center (8px) when checked
- Buttons: Primary (bg-blue-500), Secondary (border border-grey-50), Archive variants
- Modals: bg-grey-10, border-2 border-grey-50, shadow-2xl, rounded-xl
- Task items: border-b border-grey-50, hover:bg-grey-20, gap-2
- List titles: hover:bg-grey-20, focus:ring-2 focus:ring-blue-500

### Print Layout
- Container: 1056px × 816px (11" × 8.5" at 96 DPI)
- Inset border: 16px inset, border-grey-80
- 5 columns: Each ~198.4px wide with 16px gaps
- Hide: print:hidden on interactive elements

## Quick Notes
- **Shared Configuration**: After steps 1-2, `tailwind.config.js` will be the single source of truth for all Tailwind styling. Both the app and the ui-kit will use this shared config, ensuring they stay in sync.
- **Reference**: Use ui-kit HTML files as the visual reference for component styling and layout
- **Fonts**: Ensure Google Fonts are loaded (Urbanist, Gilda Display, Allura)
- **Consistency**: Every component should match its ui-kit example exactly
- **Print**: Print layout must match ui-kit full-page-layout.html
- **Accessibility**: Maintain focus indicators and keyboard navigation
- Requires: All previous milestones (functionality must be complete)
- This milestone focuses on visual design application, not new functionality

## Bottom-Up Refactor Plan

### Strategy
Instead of applying styling piecemeal, refactor components to match the UI kit HTML structure exactly. This "lift and shift" approach ensures:
- Exact structural match with UI kit
- All classes match exactly (no missing or incorrect classes)
- Easier to spot discrepancies
- Should resolve font and hover state issues

### Approach: Bottom-Up (Leaf to Root)
Start with the smallest components and work up to the container:

1. **TaskList.svelte** (Leaf component) ✅
   - Copy exact HTML structure from `ui-kit/sections/full-page-layout.html`
   - Match list wrapper: `flex flex-col mb-6 w-full`
   - Match list title container: `flex items-center gap-2 rounded transition-colors hover:bg-grey-20`
   - Match list title: `cursor-pointer m-0 px-2 py-2 leading-none text-grey-110 font-gilda text-[24px] rounded -my-1 transition-colors flex-1 min-w-0`
   - Match task list: `space-y-0 m-0 p-0 list-none w-full`
   - Match task items: `flex items-center gap-2 py-1 border-b border-grey-50 cursor-move hover:bg-grey-20 w-full`
   - Preserve all functionality (drag-and-drop, keyboard navigation, modals)

2. **ListColumn.svelte** (Parent component) ✅
   - Match column structure: `flex flex-col pt-0 min-w-0 px-2 border-r border-grey-50`
   - Match "Create new list" button structure
   - Preserve all functionality

3. **Board.svelte** (Container component) ✅
   - Match grid structure: `grid grid-cols-5 w-full py-4 px-1`
   - Ensure proper nesting

4. **App.svelte** (Root component) ✅
   - Already matches UI kit structure from step 4

### Key Differences to Fix
- TaskList: Change `gap-1` to `mb-6` on list wrapper, remove `px-1 py-1` from title container
- Ensure all classes match UI kit exactly (no extra classes, no missing classes)
- Verify hover states work (they're on parent containers in UI kit)

### Benefits
- Structural match ensures styling works correctly
- Easier to maintain - UI kit is the source of truth
- Reduces styling bugs from class mismatches
- Makes it obvious when something doesn't match

## Additional UI Tweaks & Bug Fixes

### Styling Fixes (Easy Implementation)

1. **Fix List Title Input Font and Size** ✅
   - Apply correct font (font-gilda) and font size (text-[24px]) to list title input
   - Ensure it matches the list title display styling

2. **Fix List Focus Ring Shape** ✅
   - When focused on a list, the focus ring should be square/rectangular to match the list container
   - Update focus ring styling to match the list title container shape

3. **Update Dropzone Styling** ✅
   - Change dropzone color from yellow to match design system ✅
   - Ensure dropzones fit the area properly ✅
   - Fix list dropzones so they appear correctly ✅
   
   **Implementation Notes:**
   - Added UI Kit section with 3 dropzone styling options (Option 2: Light Blue selected)
   - Library uses `outline` property, not `border` for default dropzone styling (`rgba(255, 255, 102, 0.7)`)
   - Library has `dropTargetStyle` configuration option that can be used to customize styling
   - **Final Implementation:**
     - Using `dropTargetStyle` with Option 2 styling (light blue):
       - `outline: 'none'` - removes yellow outline
       - `boxShadow: 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)'` - to avoid layout shifts
       - `backgroundColor: 'rgba(107, 143, 217, 0.04)'` - blue-500 with 4% opacity (applied to TaskList, removed from ListColumn due to resize issues)
       - `borderRadius: '4px'`
     - Applied to: TaskList.svelte, ListColumn.svelte, CreateListDropZone.svelte
     - **Fixes applied:**
       - Fixed drop zones not appearing during keyboard list drag (manually apply dropTargetStyle when keyboard drag is active)
       - Fixed drop zones not clearing on first Escape press during keyboard task drag (detect active drags via computed styles)
       - Increased empty column drop zone size from 48px to 96px for better visibility
       - Updated negative margin on "Create new list" button to maintain proper positioning
     - **Status**: Complete ✅

4. **Update Button Styling** ✅
   - Apply button styling from Figma design files ✅
   - Ensure all button variants match the design system ✅
   - Extract buttons into reusable Button component for maintainability ✅

5. **Fix Task Edit Modal Alignment and Layout**
   - Fix modal "shifting" issue - ensure proper alignment
   - Fix button spillover - ensure buttons fit within modal boundaries
   - May need to address overall modal design/layout

6. **Fix List Title Edit Modal Alignment and Typography**
   - Fix modal "shifting" issue similar to task edit modal
   - Fix button/content spillover
   - Apply correct font (font-gilda) to match list title styling

### Behavior Changes (Medium Implementation)

7. **Update List Input Behavior** ✅
   - ✅ Make list input fill the full width of the column (removed save button, input takes full width)
   - ✅ Remove save button - input creates lists automatically on Enter, Tab, or Escape
   - ✅ Updated keyboard behavior:
     - If column is empty and user presses Escape → cancel (close input without creating list)
     - If input contains whitespace (e.g., " ") and user presses Escape, Enter, or Tab → create list (unnamed list)
     - If input contains text and user presses Escape, Enter, or Tab → create list
   - ✅ Input field appears when clicking "Create new list" button
   - ✅ Placeholder text updated to italic "start typing..."

8. **Update Task Input Behavior** ✅
   - ✅ Make task input fill the same width as task text (removed save button, input takes full width)
   - ✅ Remove save button - input creates tasks automatically on Enter, Tab, or Escape
   - ✅ Updated keyboard behavior:
     - If list is empty and user presses Escape → cancel (close input without creating task)
     - If input contains whitespace (e.g., " ") and user presses Escape, Enter, or Tab → create task
     - If input contains text and user presses Escape, Enter, or Tab → create task
   - ✅ Input field appears when clicking "Add Task" or "Add your first task" button

### Drag and Drop Changes (Complex Implementation)

9. **Eliminate All Drag Handles** ✅
   - ✅ Removed drag handles from list titles in TaskList.svelte
   - ✅ Removed drag handles from task items in TaskList.svelte
   - ✅ Removed invisible drag handles from AddTaskInput.svelte
   - ✅ Drag-and-drop functionality still works without visible handles (svelte-dnd-action handles drag on entire items)
   - ✅ Removed gap spacing where drag handles were located
