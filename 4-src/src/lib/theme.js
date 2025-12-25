/**
 * Theme system for font size settings and grid system
 * Manages CSS custom properties that update dynamically based on user preference
 */

export const FONT_SIZE_PRESETS = {
  small: {
    body: 10,
    heading: 16, // Bumped from 12 to 16 (+4px)
    checkbox: 16,
    gridUnit: 20,
    lineHeight: 20,
    // Component-specific spacing
    listTitlePaddingY: 8, // Reduced further (was 12, now 8 - half grid unit)
    listTitlePaddingX: 8,
    taskItemPaddingY: 8, // Reduced from 10 to 8 (less than half grid unit)
    taskItemGap: 8,
    addTaskPaddingY: 8, // Reduced from 10 to 8
    listSpacingTop: 10, // Reduced from 20 to 10 (half grid unit)
    listGap: 12, // Gap between lists in column (reduced from 24px gap-y-6)
    boardPaddingY: 8, // Reduced from 16px py-4 to 8px (half grid unit)
  },
  medium: {
    body: 12,
    heading: 18, // Bumped from 14 to 18 (+4px)
    checkbox: 18,
    gridUnit: 24,
    lineHeight: 20, // Reduced from 24 to 20 (tighter line spacing for multiline)
    // Component-specific spacing
    listTitlePaddingY: 10, // Reduced further (was 14, now 10 - less than half grid unit)
    listTitlePaddingX: 8,
    taskItemPaddingY: 10, // Reduced from 12 to 10
    taskItemGap: 8,
    addTaskPaddingY: 10, // Reduced from 12 to 10
    listSpacingTop: 12, // Reduced from 24 to 12 (half grid unit)
    listGap: 16, // Gap between lists in column (reduced from 24px gap-y-6)
    boardPaddingY: 12, // Reduced from 16px py-4 to 12px (half grid unit)
  },
  large: {
    body: 14,
    heading: 20, // Bumped from 16 to 20 (+4px)
    checkbox: 20,
    gridUnit: 28,
    lineHeight: 24, // Reduced from 28 to 24 (tighter line spacing for multiline)
    // Component-specific spacing
    listTitlePaddingY: 12, // Reduced further (was 16, now 12 - less than half grid unit)
    listTitlePaddingX: 8,
    taskItemPaddingY: 12, // Reduced from 14 to 12
    taskItemGap: 8,
    addTaskPaddingY: 12, // Reduced from 14 to 12
    listSpacingTop: 14, // Reduced from 28 to 14 (half grid unit)
    listGap: 20, // Gap between lists in column (reduced from 24px gap-y-6)
    boardPaddingY: 14, // Reduced from 16px py-4 to 14px (half grid unit)
  },
};

const STORAGE_KEY = 'fontSize';
const DEFAULT_SIZE = 'medium';

/**
 * Get current font size preference from localStorage
 * @returns {string} 'small' | 'medium' | 'large'
 */
export function getFontSizePreference() {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'small' || stored === 'medium' || stored === 'large') {
    return stored;
  }
  return DEFAULT_SIZE;
}

/**
 * Save font size preference to localStorage
 * @param {string} size - 'small' | 'medium' | 'large'
 */
export function saveFontSizePreference(size) {
  if (typeof window === 'undefined') return;
  if (size === 'small' || size === 'medium' || size === 'large') {
    localStorage.setItem(STORAGE_KEY, size);
  }
}

/**
 * Update CSS custom properties based on font size preset
 * @param {string} size - 'small' | 'medium' | 'large'
 */
export function updateCSSVariables(size) {
  if (typeof document === 'undefined') return;
  
  const config = FONT_SIZE_PRESETS[size] || FONT_SIZE_PRESETS[DEFAULT_SIZE];
  const root = document.documentElement;
  
  // Font sizes
  root.style.setProperty('--font-size-body', `${config.body}px`);
  root.style.setProperty('--font-size-heading', `${config.heading}px`);
  
  // Checkbox size
  root.style.setProperty('--checkbox-size', `${config.checkbox}px`);
  
  // Grid system
  root.style.setProperty('--grid-unit', `${config.gridUnit}px`);
  root.style.setProperty('--grid-unit-half', `${config.gridUnit / 2}px`);
  
  // Line heights - body uses tighter spacing for multiline, heading uses 1.2x font size
  root.style.setProperty('--line-height-body', `${config.lineHeight}px`);
  root.style.setProperty('--line-height-heading', `${Math.round(config.heading * 1.2)}px`);
  
  // Component-specific spacing
  root.style.setProperty('--list-title-padding-y', `${config.listTitlePaddingY}px`);
  root.style.setProperty('--list-title-padding-x', `${config.listTitlePaddingX}px`);
  root.style.setProperty('--task-item-padding-y', `${config.taskItemPaddingY}px`);
  root.style.setProperty('--task-item-gap', `${config.taskItemGap}px`);
  root.style.setProperty('--add-task-padding-y', `${config.addTaskPaddingY}px`);
  root.style.setProperty('--list-spacing-top', `${config.listSpacingTop}px`);
  root.style.setProperty('--list-gap', `${config.listGap}px`);
  root.style.setProperty('--board-padding-y', `${config.boardPaddingY}px`);
}

/**
 * Initialize theme on app load
 * Reads preference from localStorage and applies CSS variables
 */
export function initializeTheme() {
  const fontSize = getFontSizePreference();
  updateCSSVariables(fontSize);
  return fontSize;
}

/**
 * Set font size and update CSS variables
 * @param {string} size - 'small' | 'medium' | 'large'
 */
export function setFontSize(size) {
  if (size === 'small' || size === 'medium' || size === 'large') {
    saveFontSizePreference(size);
    updateCSSVariables(size);
  }
}

