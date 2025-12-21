/**
 * Composable for list creation logic
 * Handles state, validation, and effects for creating new lists
 * 
 * Note: This composable must be called from within a Svelte component context
 * to use Svelte runes ($state, $effect).
 */

import { tick } from 'svelte';
import { createList } from './dataAccess.js';
import { normalizeInput } from './inputValidation.js';
import { useClickOutside } from './useClickOutside.js';

/**
 * Set up list creation functionality
 * @param {Object} state - State getters and setters
 * @param {Function} state.getColumnIndex - Getter for createListColumnIndex
 * @param {Function} state.setColumnIndex - Setter for createListColumnIndex
 * @param {Function} state.getInput - Getter for createListInput
 * @param {Function} state.setInput - Setter for createListInput
 * @param {Function} state.getInputElement - Getter for createListInputElement
 * @returns {Object} Handlers and effect setup functions
 */
export function useListCreation(state) {
  const {
    getColumnIndex,
    setColumnIndex,
    getInput,
    setInput,
    getInputElement
  } = state;

  /**
   * Handle click on "Create new list" button
   */
  function handleCreateListClick(columnIndex) {
    setColumnIndex(columnIndex);
  }

  /**
   * Handle keydown on "Create new list" button
   */
  function handleCreateListKeydown(event, columnIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleCreateListClick(columnIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      // Blur the "Create new list" button
      const buttonElement = event.currentTarget;
      if (buttonElement && buttonElement instanceof HTMLElement) {
        buttonElement.blur();
      }
    }
  }

  /**
   * Handle Escape key in create list input
   * @param {KeyboardEvent} e - The keyboard event
   * @param {number} columnIndex - The column index
   * @param {boolean} isColumnEmpty - Whether the column has no lists
   */
  function handleCreateListInputEscape(e, columnIndex, isColumnEmpty) {
    if (e.key === 'Escape') {
      const inputValue = getInput() || '';
      
      // If column is empty, cancel (close input without creating list)
      if (isColumnEmpty) {
        setColumnIndex(null);
        setInput('');
        return;
      }
      
      // If column is not empty and there's content (non-whitespace text), create list
      if (inputValue.trim().length > 0) {
        // Create list with the current input value
        handleCreateList(columnIndex, true); // closeAfterSave = true
        return;
      }
      
      // If column is not empty but input is empty or whitespace-only, cancel
      setColumnIndex(null);
      setInput('');
    }
  }

  /**
   * Handle creating a list (Enter/Save)
   * @param {number} columnIndex - The column index
   * @param {boolean} closeAfterSave - Whether to close input after creating list
   */
  async function handleCreateList(columnIndex, closeAfterSave = false) {
    const inputValue = getInput() || '';
    
    // Check if input is empty string "" or whitespace-only - exit list creation and close input
    if (inputValue === '' || inputValue.trim() === '') {
      setColumnIndex(null);
      setInput('');
      return;
    }
    
    // Normalize input (handles whitespace-only input by trimming)
    const { text: normalizedText } = normalizeInput(inputValue);
    
    try {
      // Create list with normalized text (may be empty string for whitespace-only input = unnamed list)
      await createList(normalizedText || null, columnIndex);
      setInput('');
      // For normal Enter flows, keep input active and focused for sequential creation.
      // When invoked from Escape/Tab flows, close the input after creating the list.
      if (closeAfterSave) {
        setColumnIndex(null);
      } else {
        // Refocus the create list input after the list is created
        await tick();
        const inputElement = getInputElement();
        if (inputElement) {
          setTimeout(() => {
            inputElement.focus();
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  }

  /**
   * Handle "Tab" key from the create list input.
   * When tabbing away:
   * - If input is empty, close the input (no list created).
   * - If input has whitespace or text, create the list once, then close the input so focus can move on.
   */
  async function handleCreateListOnTab(columnIndex) {
    // Create list if there's whitespace or text, then close input
    await handleCreateList(columnIndex, true); // closeAfterSave = true
  }

  /**
   * Set up click outside effect
   * Returns cleanup function to be used in $effect
   */
  function setupClickOutsideEffect() {
    const columnIndex = getColumnIndex();
    if (columnIndex === null) return;
    
    return useClickOutside(
      getInputElement(),
      () => {
        // Only close if still active (prevents race conditions with programmatic closes)
        if (getColumnIndex() !== null) {
          setColumnIndex(null);
          setInput('');
        }
      },
      {
        ignoreElements: [],
        shouldClose: () => {
          // Only close if input hasn't changed (no content)
          return !getInput() || getInput().trim() === '';
        }
      }
    );
  }

  /**
   * Set up focus effect
   * Returns cleanup function to be used in $effect
   */
  function setupFocusEffect() {
    const columnIndex = getColumnIndex();
    const inputElement = getInputElement();
    if (columnIndex === null || !inputElement) return;

    const timeoutId = setTimeout(() => {
      inputElement?.focus();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }

  return {
    handleCreateListClick,
    handleCreateListKeydown,
    handleCreateListInputEscape,
    handleCreateList,
    handleCreateListOnTab,
    setupClickOutsideEffect,
    setupFocusEffect
  };
}

