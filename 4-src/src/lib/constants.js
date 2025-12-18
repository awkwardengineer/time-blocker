/**
 * Design system constants for consistent spacing, sizing, and timing values.
 * These values match Tailwind's spacing scale where applicable.
 */

// Textarea and input sizing
export const MAX_TEXTAREA_HEIGHT = 160; // max-h-[10rem] = 160px
export const TASK_WIDTH = 150; // w-[150px] - consistent task and input width

// Print layout dimensions
// At 96 DPI (device independent pixels per inch), these correspond to 11" x 8.5" (landscape 8.5" x 11" paper)
export const PRINT_CONTAINER_WIDTH = 1056; // 11" * 96 DPI = 1056px
export const PRINT_CONTAINER_HEIGHT = 816; // 8.5" * 96 DPI = 816px

// Spacing values (matching Tailwind spacing scale)
export const SPACING_4 = 16; // 1rem = 16px (matches Tailwind spacing-4, mb-4, etc.)

// Retry mechanism constants
export const MAX_RETRY_ATTEMPTS = 25; // Maximum attempts to find element
export const RETRY_INTERVAL_MS = 10; // Milliseconds between retry attempts

// Focus management constants
export const FOCUS_RETRY_ATTEMPTS = 20; // Default retry attempts for focus operations
export const FOCUS_RETRY_INTERVAL = 10; // Default retry interval for focus operations (ms)
export const FOCUS_RETRY_ATTEMPTS_EXTENDED = 40; // Extended retries for complex DOM updates (e.g., when list becomes empty)

// DOM update timing constants
export const DOM_UPDATE_DELAY_MS = 200; // Delay after DOM updates (for test environments)
export const DOM_UPDATE_DELAY_SHORT_MS = 10; // Short delay for DOM updates
export const DOM_UPDATE_DELAY_MEDIUM_MS = 20; // Medium delay for DOM updates

