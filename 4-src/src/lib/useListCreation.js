/**
 * Composable for list creation logic
 * Handles state, validation, and effects for creating new lists
 * 
 * Note: This composable must be called from within a Svelte component context
 * to use Svelte runes ($state, $effect).
 */

import { tick } from 'svelte';
import { createList } from './dataAccess.js';
import { validateAndNormalizeListInput } from './inputValidation.js';
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
   */
  function handleCreateListInputEscape(e) {
    if (e.key === 'Escape') {
      setColumnIndex(null);
      setInput('');
    }
  }

  /**
   * Handle creating a list (Enter/Save)
   */
  async function handleCreateList(columnIndex) {
    const inputValue = getInput() || '';
    
    // Validate and normalize input
    const { valid, normalized: normalizedText } = validateAndNormalizeListInput(inputValue);
    if (!valid) {
      // Invalid input (empty or whitespace-only) - close input
      setColumnIndex(null);
      setInput('');
      return;
    }
    
    try {
      await createList(normalizedText, columnIndex);
      // Clear input but keep it open for creating another list
      setInput('');
      // Keep createListColumnIndex set to columnIndex so input stays open
      // Lists will update automatically via liveQuery
      // The "add a new task" empty state will appear below the newly created list automatically
      
      // Refocus the create list input after the list is created
      await tick();
      const inputElement = getInputElement();
      if (inputElement) {
        setTimeout(() => {
          inputElement.focus();
        }, 0);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  }

  /**
   * Handle "Tab" key from the create list input.
   * When tabbing away:
   * - If input is empty/whitespace-only, close the input (no list created).
   * - If input has content, create the list once, then close the input so focus can move on.
   */
  async function handleCreateListOnTab(columnIndex) {
    const inputValue = getInput() || '';
    
    // Validate and normalize input
    const { valid, normalized: normalizedText } = validateAndNormalizeListInput(inputValue);
    if (!valid) {
      // Invalid input (empty or whitespace-only) - close input without creating
      setColumnIndex(null);
      setInput('');
      return;
    }
    
    try {
      await createList(normalizedText, columnIndex);
      // Clear and close input after creating the list so focus can move forward
      setInput('');
      setColumnIndex(null);
    } catch (error) {
      console.error('Error creating list on Tab:', error);
    }
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
        checkIgnoreClick: (e) => {
          // Check if click is on a Save button
          const saveButton = e.target.closest('button');
          return saveButton && saveButton.textContent?.trim() === 'Save';
        },
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

