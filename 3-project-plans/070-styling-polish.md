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

5. **Update List Components**
   - **ListColumn.svelte**: Apply list title styling (font-gilda, text-[24px], text-grey-110)
   - **ListColumn.svelte**: Update hover and focus states (hover:bg-grey-20, focus:ring-2 focus:ring-blue-500)
   - **ListColumn.svelte**: Update drag handle styling (text-grey-60, cursor-grab)
   - **CreateListDropZone.svelte**: Apply create list button styling (text-grey-60, font-gilda, hover:underline)
   - **CreateListDropZone.svelte**: Update input state styling (border-b-2 border-grey-60, focus:border-blue-500)
   - **ListEditModal.svelte**: Apply modal styling to match ui-kit
   - **ListEditModal.svelte**: Update archive button variants (border border-grey-50, bg-grey-20)
   - **ListEditModal.svelte**: Update confirmation modal styling

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

7. **Update Shared Components**
   - **ConfirmationModal.svelte**: Apply modal styling to match ui-kit
   - **ConfirmationModal.svelte**: Update button styling
   - **ArchivedView.svelte**: Apply archived view styling (line-through text, restore button)
   - **ArchivedView.svelte**: Update list badge styling

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
