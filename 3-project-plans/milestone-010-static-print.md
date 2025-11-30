# Milestone 010: Static WYSIWYG Print Foundation

## Goal
Prove we can create a printable page and trigger printing - establish WYSIWYG foundation.

## Acceptance Criteria
- [✅] Page displays "Hello World" text
- [✅] Print button opens browser print dialog
- [✅] Print preview matches screen layout (WYSIWYG)
- [✅] Page builds from `4-src/` to `5-dist/`
- [✅] UI Kit HTML page created (development-only, excluded from production build)

## Implementation Steps
1. **Project Setup**
   - ✅ Initialize Svelte project with Vite in `4-src/`
   - ✅ Configure Tailwind CSS
   - ✅ Set up build process to output to `5-dist/`
   - ✅ Verify build works

2. **Create Static Page**
   - ✅ Create main page component with "Hello World" text
   - ✅ Add print button that calls `window.print()`
   - ✅ Style page with Tailwind CSS

3. **Implement Print CSS**
   - ✅ Add `@media print` CSS rules
   - ✅ Set page dimensions to 8.5x11" (816 × 1056px) or A4
   - ✅ Ensure print layout matches screen layout (WYSIWYG)

4. **Create UI Kit HTML Page**
   - ✅ Create development-only HTML page (e.g., `4-src/ui-kit.html`)
   - ✅ Configure build to exclude from production output
   - ✅ Add design tokens section (colors, fonts, spacing)
   - ✅ Add component examples (buttons, inputs, task items)
   - ✅ Add layout patterns
   - ✅ Add print layout preview section
   - ✅ Use Tailwind CSS for styling

5. **Test**
  - **Automated Tests** (write tests):
    - [✅] Write test to verify print button calls `window.print()`
    - [✅] Write test to verify UI Kit page is accessible in development but excluded from build output
    - [✅] Write test (using Playwright) to generate PDF and verify output is exactly one page (no overflow to page 2)
  - **Manual Tests** (verify manually):
    - [✅] Verify print preview matches screen view (WYSIWYG)

## Quick Notes
- Use `window.print()` API
- CSS `@media print` for print styles
- Page dimensions: 8.5x11" (816 × 1056px) or A4
- UI Kit is development-only reference (not deployed to production)
- No dependencies (first milestone)

