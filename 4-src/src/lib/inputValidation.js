/**
 * Input validation utilities for checking and normalizing user input.
 */

/**
 * Checks if a string is empty (length 0).
 * @param {string} input - The input string to check
 * @returns {boolean} True if the input is an empty string
 */
export function isEmpty(input) {
  return input === '';
}

/**
 * Checks if a string contains only whitespace characters.
 * @param {string} input - The input string to check
 * @returns {boolean} True if the input contains only whitespace (and has length > 0)
 */
export function isWhitespaceOnly(input) {
  const trimmedValue = input.trim();
  return trimmedValue === '' && input.length > 0;
}

/**
 * Normalizes input by trimming and determining if it's blank.
 * @param {string} input - The input string to normalize
 * @returns {{ text: string, isBlank: boolean }} Object with normalized text and blank flag
 */
export function normalizeInput(input) {
  const trimmedValue = input.trim();
  const isBlank = isWhitespaceOnly(input);
  
  return {
    text: isBlank ? '' : trimmedValue,
    isBlank
  };
}

/**
 * Validates and normalizes list input.
 * Checks if input is empty or whitespace-only, and normalizes valid input.
 * @param {string} input - The input string to validate
 * @returns {{ valid: boolean, normalized: string }} Object indicating if input is valid and the normalized text
 */
export function validateAndNormalizeListInput(input) {
  // Check if input is empty string "" - invalid
  if (isEmpty(input)) {
    return { valid: false, normalized: '' };
  }
  
  // Check if input contains only whitespace (e.g., " ", "      ") - invalid
  const { text, isBlank } = normalizeInput(input);
  return { valid: !isBlank, normalized: text };
}

