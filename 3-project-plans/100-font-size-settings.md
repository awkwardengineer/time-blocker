# 100: Font Size Settings & Grid System

## Goal
Add a font size setting (Small/Medium/Large) that adjusts font sizes, line heights, and spacing throughout the application to maintain a consistent grid system. The setting should be accessible via the settings flyout and persist across sessions.

## Design System Overview

### Font Size Presets

**Body Text (Urbanist):**
- Small: 10px
- Medium: 12px (default)
- Large: 14px

**Headings (Gilda Display):**
- Small: 12px
- Medium: 14px (default)
- Large: 16px

**Checkboxes:**
- Small: 16px × 16px
- Medium: 18px × 18px (default)
- Large: 20px × 20px

### Grid System
The grid system ensures that task headers, task items, and add task buttons align to a consistent vertical rhythm. The grid unit should scale with font size:

**Small (10px body):**
- Grid unit: 20px
- Sequence: 20px, 28px, 36px, 44px, 52px, etc.

**Medium (12px body):**
- Grid unit: 24px (default)
- Sequence: 24px, 32px, 40px, 48px, 56px, etc.

**Large (14px body):**
- Grid unit: 28px
- Sequence: 28px, 36px, 44px, 52px, 60px, etc.

### Component Spacing Requirements

For each size preset, the following components must align to the grid:

1. **List Title (Heading)**
   - Font size: 12px/14px/16px (small/medium/large)
   - Vertical padding: Grid unit (20px/24px/28px)
   - Line height: Should match grid unit or be a multiple

2. **Space Above Task List**
   - Margin/padding: Grid unit (20px/24px/28px)

3. **Task Items**
   - Font size: 10px/12px/14px (small/medium/large)
   - Vertical padding: Grid unit / 2 (10px/12px/14px)
   - Line height: Grid unit (20px/24px/28px)
   - Border spacing: Should align to grid
   - Checkbox size: 16px/18px/20px (small/medium/large)

4. **Add Task Button**
   - Font size: 10px/12px/14px (small/medium/large)
   - Vertical padding: Grid unit / 2 (10px/12px/14px)
   - Line height: Grid unit (20px/24px/28px)

## Implementation Strategy

### 1. Theme System Architecture

Create a centralized theme system using CSS custom properties (CSS variables) that can be updated dynamically. This approach is **fully compatible with Tailwind CSS** and allows all components to reference the same values and update instantly when the setting changes.

**Why CSS Variables + Tailwind Works:**
- Tailwind classes (like `text-grey-110`, `font-gilda`, `cursor-pointer`) stay the same
- Only dynamic values (font sizes, spacing) use CSS variables via inline styles
- CSS variables update at runtime without rebuilding Tailwind
- This is the same pattern your codebase already uses (see `checkbox.css` and inline styles like `style="width: {PRINT_CONTAINER_WIDTH}px;"`)

**File Structure:**
```
4-src/src/lib/
  ├── theme.js              # Theme configuration and state management
  ├── theme.css             # CSS custom properties definitions
  └── useTheme.js            # Svelte composable for theme access (optional)
```

**Theme Configuration:**
```javascript
// theme.js
export const FONT_SIZE_PRESETS = {
  small: {
    body: 10,
    heading: 12,
    checkbox: 16,
    gridUnit: 20,
    lineHeight: 20,
    // ... other spacing values
  },
  medium: {
    body: 12,
    heading: 14,
    checkbox: 18,
    gridUnit: 24,
    lineHeight: 24,
    // ... other spacing values
  },
  large: {
    body: 14,
    heading: 16,
    checkbox: 20,
    gridUnit: 28,
    lineHeight: 28,
    // ... other spacing values
  }
};
```

### 2. CSS Custom Properties

Define CSS variables in `theme.css` that will be set on the root element:

```css
:root {
  /* Font sizes */
  --font-size-body: 12px;
  --font-size-heading: 14px;
  
  /* Checkbox size */
  --checkbox-size: 18px;
  
  /* Grid system */
  --grid-unit: 24px;
  --grid-unit-half: 12px;
  
  /* Line heights */
  --line-height-body: 24px;
  --line-height-heading: 24px;
  
  /* Component-specific spacing */
  --list-title-padding-y: 24px;
  --list-title-padding-x: 8px;
  --task-item-padding-y: 12px;
  --task-item-gap: 8px;
  --add-task-padding-y: 12px;
  --list-spacing-top: 24px;
}
```

### 3. State Management

**Storage:**
- Store font size preference in `localStorage` (simple key-value storage)
- Key: `'fontSize'`, Value: `'small' | 'medium' | 'large'`
- Default to "medium" if no preference exists
- Load preference synchronously on app initialization

**Reactive Updates:**
- Use Svelte's `$state` for theme state
- Update CSS variables when theme changes
- All components automatically update via CSS variable references

**File:** `4-src/src/lib/theme.js`
```javascript
// Theme state and management
let currentFontSize = $state('medium');
let themeConfig = $derived(FONT_SIZE_PRESETS[currentFontSize]);

// Function to update theme
function setFontSize(size) {
  currentFontSize = size;
  updateCSSVariables(themeConfig);
  localStorage.setItem('fontSize', size); // Simple synchronous storage
}
```

### 4. Component Updates

**Components to Update:**

1. **TaskList.svelte**
   - List title: Use `--font-size-heading` and `--list-title-padding-y`
   - Task items: Use `--font-size-body` and `--task-item-padding-y`
   - Spacing: Use `--list-spacing-top` for gap above task list

2. **AddTaskInput.svelte**
   - Button text: Use `--font-size-body` and `--add-task-padding-y`
   - Input textarea: Use `--font-size-body` and `--line-height-body`
   - Placeholder checkbox: Use `--checkbox-size` for width and height

3. **SettingsFlyout.svelte**
   - Add font size setting section with grey background
   - Three buttons for Small/Medium/Large
   - Visual indicator for current selection

4. **Other Components (if needed)**
   - Header.svelte: May need to adjust if using body/heading sizes
   - Any other text elements that should scale

**Implementation Pattern:**

CSS variables work with Tailwind in three ways. For this use case, we'll use **Option 1 (Inline Styles)** because it's the simplest and most flexible for runtime theme changes:

**Option 1: Inline Styles with CSS Variables (RECOMMENDED)**
```svelte
<!-- Before -->
<h2 class="text-[24px] py-2">List Name</h2>

<!-- After -->
<h2 
  class="list-title cursor-pointer text-grey-110 font-gilda"
  style="font-size: var(--font-size-heading); padding: var(--list-title-padding-y) var(--list-title-padding-x);"
>
  List Name
</h2>
```

**Option 2: Tailwind Arbitrary Values with CSS Variables**
```svelte
<h2 class="text-[var(--font-size-heading)] py-[var(--list-title-padding-y)]">
  List Name
</h2>
```
*Note: This works but is less readable and harder to maintain.*

**Option 3: Hybrid Approach (Best of Both Worlds)**
```svelte
<h2 
  class="list-title cursor-pointer text-grey-110 font-gilda"
  style="font-size: var(--font-size-heading); line-height: var(--line-height-heading);"
  class:py-2={false}
  style:padding-top="var(--list-title-padding-y)"
  style:padding-bottom="var(--list-title-padding-y)"
>
  List Name
</h2>
```
*Note: This is overly complex. Stick with Option 1.*

**Why Option 1?**
- ✅ Works perfectly with Tailwind (you keep all your Tailwind classes)
- ✅ CSS variables update instantly at runtime (no rebuild needed)
- ✅ Simple and readable
- ✅ Easy to maintain
- ✅ Your codebase already uses inline styles for dynamic values (e.g., `style="width: {PRINT_CONTAINER_WIDTH}px;"`)

### 5. Settings UI Design

**Location:** SettingsFlyout.svelte

**Layout:**
```
┌─────────────────────────────────┐
│ Settings                        │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐│
│ │ Font Size                    ││
│ │ ┌─────┐ ┌─────┐ ┌─────┐     ││
│ │ │Small│ │Med  │ │Large│     ││
│ │ └─────┘ └─────┘ └─────┘     ││
│ └─────────────────────────────┘│
│                                 │
│ (Other settings sections...)    │
│                                 │
└─────────────────────────────────┘
```

**Styling:**
- Grey background section: `bg-grey-20` or `bg-grey-30`
- Label: "Font Size" in appropriate font
- Three buttons: Small, Medium, Large
- Active button: Highlighted (e.g., border or background color)
- Buttons should be accessible (keyboard navigation, ARIA labels)

## Implementation Steps

### Phase 1: Theme System Foundation
1. ✅ Create `theme.js` with font size presets and configuration
2. ✅ Create `theme.css` with CSS custom properties
3. ✅ Create theme initialization function that reads from localStorage
4. ✅ Create `useTheme.js` composable (optional, for cleaner component access)
5. ✅ Initialize theme on app load (read from localStorage, set CSS variables)

### Phase 2: Component Updates
6. ✅ Update `TaskList.svelte`:
   - List title: Replace hardcoded `text-[24px]` with CSS variable
   - List title padding: Replace `py-2` with CSS variable
   - Task items: Replace hardcoded font sizes and padding with CSS variables
   - Task checkboxes: Replace hardcoded checkbox size with CSS variable
   - Spacing above task list: Use CSS variable
7. ✅ Update `AddTaskInput.svelte`:
   - Button text: Use CSS variable for font size
   - Button padding: Use CSS variable
   - Textarea: Use CSS variable for font size and line height
   - Placeholder checkbox: Use CSS variable for checkbox size
8. ✅ Test grid alignment visually:
   - Verify list titles align to grid
   - Verify task items align to grid
   - Verify checkboxes are properly sized and aligned
   - Verify add task button aligns to grid
   - Verify spacing is consistent

### Phase 3: Settings UI
9. ✅ Create font size setting section in `SettingsFlyout.svelte`:
   - Add grey background section
   - Add "Font Size" label
   - Add three buttons (Small, Medium, Large)
   - Style active button
   - Add keyboard accessibility
10. ✅ Connect buttons to theme update function
11. ✅ Add visual feedback when font size changes
12. ✅ Test persistence (change setting, refresh page, verify it persists)

### Phase 4: Testing & Refinement
13. ✅ Test all three font sizes:
   - Verify grid alignment at each size
   - Verify text readability
   - Verify spacing consistency
14. ✅ Test edge cases:
   - Very long task text
   - Very long list names
   - Multiple tasks in a list
   - Empty lists
15. ✅ Test print layout:
   - Verify font sizes work in print view
   - Verify grid alignment in print
16. ✅ Add tests:
   - Test theme state management
   - Test CSS variable updates
   - Test settings UI interaction
   - Test persistence

## Acceptance Criteria

- [ ] Font size setting is accessible in settings flyout
- [ ] Three font size options: Small (10px), Medium (12px), Large (14px)
- [ ] Heading sizes scale appropriately: Small (12px), Medium (14px), Large (16px)
- [ ] Checkbox sizes scale appropriately: Small (16px), Medium (18px), Large (20px)
- [ ] Grid system maintains alignment at all three sizes:
  - List titles align to grid
  - Task items align to grid
  - Checkboxes are properly sized and aligned
  - Add task button aligns to grid
  - Spacing is consistent
- [ ] Font size preference persists across page refreshes
- [ ] Settings UI has grey background section with label and buttons
- [ ] Active font size is visually indicated
- [ ] Settings are keyboard accessible
- [ ] All components update instantly when font size changes
- [ ] Print layout respects font size setting
- [ ] No visual regressions at default (medium) size

## Technical Considerations

### CSS Variable Updates
When updating CSS variables, use JavaScript to set them on the `:root` element:
```javascript
function updateCSSVariables(config) {
  const root = document.documentElement;
  root.style.setProperty('--font-size-body', `${config.body}px`);
  root.style.setProperty('--font-size-heading', `${config.heading}px`);
  root.style.setProperty('--checkbox-size', `${config.checkbox}px`);
  // ... etc
}
```

### Storage Implementation
Use `localStorage` for simple key-value storage:
```javascript
// Save preference
localStorage.setItem('fontSize', 'medium'); // 'small' | 'medium' | 'large'

// Load preference
const fontSize = localStorage.getItem('fontSize') || 'medium'; // Default to 'medium'

// Remove preference (if needed)
localStorage.removeItem('fontSize');
```

**Why localStorage instead of IndexedDB?**
- ✅ **Simple**: Just a single string value, not structured data
- ✅ **Synchronous**: No async/await needed, instant access
- ✅ **Perfect for preferences**: Designed exactly for this use case
- ✅ **Already supported**: Works in all browsers, no library needed
- ✅ **Lightweight**: 5-10MB limit is plenty for preferences
- ❌ **IndexedDB is overkill**: Designed for structured data, queries, large datasets

### Performance
- CSS variables update instantly (no re-render needed)
- Only update CSS variables, not component state
- Database write is async and non-blocking

### Accessibility
- Buttons should have proper ARIA labels
- Active button should have `aria-pressed="true"`
- Keyboard navigation should work (Tab, Enter/Space)
- Screen reader should announce font size changes

## Future Enhancements (Out of Scope)

- Custom font size input (not just presets)
- Separate font size for headings vs body
- Font family selection
- Line height adjustment
- Letter spacing adjustment

