/**
 * Utility functions for focus management
 * Provides reusable focus-related helpers with retry logic
 */

import { tick } from 'svelte';
import { MAX_RETRY_ATTEMPTS, RETRY_INTERVAL_MS } from './constants.js';

/**
 * Focus an element with retry logic
 * Useful when element needs time to appear in DOM
 * 
 * @param {Function} getElement - Function that returns the element to focus, or null if not found
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of retry attempts (default: MAX_RETRY_ATTEMPTS)
 * @param {number} options.retryInterval - Milliseconds between retry attempts (default: RETRY_INTERVAL_MS)
 * @param {boolean} options.waitForTick - Whether to wait for tick() before starting (default: true)
 * @returns {Promise<HTMLElement|null>} The focused element, or null if not found
 */
export async function focusElementWithRetry(getElement, options = {}) {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    retryInterval = RETRY_INTERVAL_MS,
    waitForTick = true
  } = options;

  if (typeof document === 'undefined') return null;

  // Wait for Svelte to process reactive updates
  if (waitForTick) {
    await tick();
  }

  // Retry mechanism to find and focus the element
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const element = getElement();
    if (element && element instanceof HTMLElement) {
      element.focus();
      return element;
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }

  return null;
}

/**
 * Focus an element by selector with retry logic
 * 
 * @param {string} selector - CSS selector to find the element
 * @param {Object} options - Configuration options (same as focusElementWithRetry)
 * @returns {Promise<HTMLElement|null>} The focused element, or null if not found
 */
export async function focusElementBySelector(selector, options = {}) {
  return focusElementWithRetry(
    () => document.querySelector(selector),
    options
  );
}

/**
 * Focus an element within a container by selector
 * 
 * @param {HTMLElement} container - Container element to search within
 * @param {string} selector - CSS selector to find the element within container
 * @param {Object} options - Configuration options (same as focusElementWithRetry)
 * @returns {Promise<HTMLElement|null>} The focused element, or null if not found
 */
export async function focusElementInContainer(container, selector, options = {}) {
  if (!container) return null;
  
  return focusElementWithRetry(
    () => container.querySelector(selector),
    options
  );
}

/**
 * Focus the list card element for keyboard drag feedback
 * Finds element by data-id and role="group" or falls back to first DIV
 * 
 * @param {number|string} listId - ID of the list to focus
 * @returns {Promise<HTMLElement|null>} The focused element, or null if not found
 */
export async function focusListCardForKeyboardDrag(listId) {
  if (typeof document === 'undefined') return null;

  await tick();

  // Find all elements with this data-id and pick the list card wrapper
  const candidates = Array.from(document.querySelectorAll(`[data-id="${listId}"]`));
  let card = candidates.find(
    (el) => el instanceof HTMLElement && el.getAttribute('role') === 'group'
  );
  if (!card) {
    // Fallback: first DIV with this data-id (lists use div[data-id], tasks use li[data-id])
    card = candidates.find(
      (el) => el instanceof HTMLElement && el.tagName === 'DIV'
    );
  }
  if (card instanceof HTMLElement) {
    card.focus();
    return card;
  }
  
  return null;
}

/**
 * Find the next logical focus target after an action
 * Useful for focus management after archiving/deleting items
 * 
 * @param {HTMLElement} container - Container element to search within
 * @param {string} itemSelector - Selector for items (e.g., 'li[data-id]')
 * @param {string} focusableSelector - Selector for focusable element within item (e.g., 'span[role="button"]')
 * @returns {HTMLElement|null} The next focus target, or null if none found
 */
export function findNextFocusTarget(container, itemSelector, focusableSelector) {
  if (!container) return null;
  
  // Find the first item in the container
  const firstItem = container.querySelector(itemSelector);
  if (firstItem) {
    const focusableElement = firstItem.querySelector(focusableSelector);
    if (focusableElement && focusableElement instanceof HTMLElement) {
      return focusableElement;
    }
  }
  
  return null;
}

