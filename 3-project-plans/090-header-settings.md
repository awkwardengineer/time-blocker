# 090: Header / Settings / Settings Flyout

## Goal
Add a header component with branding and settings access. The header displays "MERINI" in the top left and includes a settings button in the top right that will open a settings flyout panel.

## Acceptance Criteria
- [x] Header component displays "MERINI" text in top left
- [x] Header component displays settings button in top right
- [x] Header is positioned above main content
- [x] Header is hidden during print (print:hidden)
- [x] Settings button is accessible via keyboard (Tab navigation, Enter/Space to activate)
- [x] Settings button has proper ARIA labels
- [x] Settings flyout panel opens from the right side when settings button is clicked
- [x] Settings flyout has close button (X) in top right
- [x] Settings flyout closes when X button is clicked
- [x] Settings flyout closes when clicking outside (on backdrop)
- [x] Settings flyout is keyboard accessible (Tab navigation, Escape to close)
- [x] Settings flyout has proper ARIA labels and roles
- [x] Settings flyout content is placeholder for now

## Implementation Steps

1. **Create Header Component** ✅
   - Create `Header.svelte` component
   - Display "MERINI" text in top left
   - Add settings button in top right
   - Style to match design system
   - Ensure keyboard accessibility

2. **Integrate Header into App** ✅
   - Add Header component to `App.svelte`
   - Position header above main content area
   - Ensure header width matches content width
   - Hide header during print

3. **Settings Flyout Component** ✅
   - ✅ Create `SettingsFlyout.svelte` component
   - ✅ Flyout slides in from right side (fixed right-0, w-[400px])
   - ✅ Backdrop overlay (semi-transparent, bg-black bg-opacity-50)
   - ✅ Close button (X) in top right of flyout
   - ✅ Click outside (on backdrop) to close (with mousedown/mouseup tracking to prevent drag issues)
   - ✅ Escape key to close
   - ✅ Tab focus trapping within flyout
   - ✅ Proper ARIA labels and roles (role="dialog", aria-modal="true")
   - ✅ Placeholder content for now

4. **Settings State Management** ✅
   - ✅ Manage open/closed state in Header component
   - ✅ Pass state to SettingsFlyout component
   - ✅ Handle open/close actions

5. **Tests** ✅
   - ✅ Create `App.headerSettings.test.js` test file
   - ✅ Test header displays with MERINI and Settings button
   - ✅ Test settings flyout opens when Settings button is clicked
   - ✅ Test settings flyout opens via keyboard (Enter key)
   - ✅ Test settings flyout closes when X button is clicked
   - ✅ Test settings flyout closes when clicking outside (backdrop)
   - ✅ Test settings flyout closes when Escape key is pressed
   - ✅ Test focus trapping within flyout (Tab navigation)
   - ✅ Test placeholder content displays
   - ✅ Test header is hidden during print

## Design Notes
- Header should match the width of the main content area (1056px)
- "MERINI" should use appropriate typography (likely Gilda Display based on design system)
- Settings button should match existing button styles
- Header should have appropriate spacing from content below
- Settings flyout should slide in from the right side
- Flyout should have a backdrop overlay (semi-transparent, clickable to close)
- Flyout width should be appropriate (e.g., 400px or similar)
- Close button (X) should be clearly visible in top right of flyout
- Flyout should have smooth slide-in animation

## Testing
- [x] Header displays correctly in browser (tested)
- [x] Header is hidden during print (tested)
- [x] Settings button is keyboard accessible (tested)
- [x] Settings button has proper ARIA labels (tested)
- [x] Header width matches content width (verified)
- [x] Settings flyout opens when settings button is clicked (tested)
- [x] Settings flyout opens when settings button is activated via keyboard (tested)
- [x] Settings flyout closes when X button is clicked (tested)
- [x] Settings flyout closes when clicking outside (on backdrop) (tested)
- [x] Settings flyout closes when Escape key is pressed (tested)
- [x] Settings flyout is keyboard accessible (Tab navigation, focus trapping) (tested)
- [x] Settings flyout has proper ARIA labels and roles (tested)
- [x] Placeholder content displays (tested)
- [ ] Manual testing: Verify in browser
- [ ] No console errors (to be verified)

