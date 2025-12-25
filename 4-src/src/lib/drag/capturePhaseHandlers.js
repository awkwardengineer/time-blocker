/**
 * Capture-phase keyboard handlers for preventing drag library from intercepting keyboard events
 * 
 * These handlers use capture phase (addEventListener(..., true)) to run before the drag library's
 * handlers, allowing us to prevent the library from intercepting Enter/Space on interactive elements
 * like list titles, Add Task buttons, and task text.
 * 
 * This abstraction makes it easier to migrate to a different drag library in the future,
 * as we can update the event prevention logic in one place.
 */

import { findNeighborListId, moveTaskToNextList, moveTaskToPreviousList } from './taskDragHandlers.js';

/**
 * Generic factory for creating capture-phase keydown handlers
 * Handles the common pattern: check key, check target, prevent default, call callback
 * 
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.containerElement - Container element to attach listener to
 * @param {Function} config.keyMatches - Function to check if key matches (e.key) => boolean
 * @param {Function} config.targetMatches - Function to check if target matches (target, container) => boolean
 * @param {Function} config.onMatch - Callback when key and target match (e, target) => void
 * @returns {Function} Cleanup function to remove the event listener
 */
function createCaptureHandler(config) {
  const { containerElement, keyMatches, targetMatches, onMatch } = config;
  
  if (!containerElement) {
    return () => {}; // No-op cleanup
  }
  
  function handleCapture(e) {
    const target = e.target;
    
    if (keyMatches(e.key) && target instanceof HTMLElement && targetMatches(target, containerElement)) {
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop ALL handlers including drag library
      
      if (onMatch) {
        onMatch(e, target);
      }
    }
  }
  
  // Use capture phase to intercept before drag library
  containerElement.addEventListener('keydown', handleCapture, true);
  
  return () => {
    if (containerElement) {
      containerElement.removeEventListener('keydown', handleCapture, true);
    }
  };
}

/**
 * Creates a capture-phase keydown handler for list title (h2 element)
 * Prevents drag library from intercepting Enter/Space on list title
 * 
 * @param {HTMLElement} listSectionElement - The list section container element
 * @param {Object} listModal - Modal object with openModal method
 * @returns {Function} Cleanup function to remove the event listener
 */
export function setupListTitleKeydownCapture(listSectionElement, listModal) {
  return createCaptureHandler({
    containerElement: listSectionElement,
    keyMatches: (key) => key === 'Enter' || key === ' ',
    targetMatches: (target, container) => {
      // Check if this is our list title (h2 element with role="button")
      if (target.tagName === 'H2' && target.hasAttribute('role') && target.getAttribute('role') === 'button') {
        const h2Element = container?.querySelector('h2[role="button"]');
        return h2Element && target === h2Element;
      }
      return false;
    },
    onMatch: (e, target) => {
      // Open the list edit modal
      listModal.openModal(target);
    }
  });
}

/**
 * Creates a capture-phase keydown handler for Add Task button
 * Prevents drag library from intercepting Enter/Space on Add Task button
 * 
 * @param {HTMLElement} addTaskContainerElement - The add task container element
 * @param {Function} onAddTaskClick - Callback to activate the input (same as clicking)
 * @returns {Function} Cleanup function to remove the event listener
 */
export function setupAddTaskButtonKeydownCapture(addTaskContainerElement, onAddTaskClick) {
  return createCaptureHandler({
    containerElement: addTaskContainerElement,
    keyMatches: (key) => key === 'Enter' || key === ' ',
    targetMatches: (target, container) => {
      // Check if this is the Add Task button (span with role="button")
      if (target.hasAttribute('role') && target.getAttribute('role') === 'button') {
        const addTaskButton = container?.querySelector('span[role="button"]');
        return addTaskButton && target === addTaskButton;
      }
      return false;
    },
    onMatch: (e, target) => {
      // Activate the input (same as clicking)
      onAddTaskClick();
    }
  });
}

/**
 * Creates a capture-phase keydown handler for task text and cross-list boundary movement
 * Prevents drag library from intercepting Enter/Space on task text
 * Handles cross-list movement when tasks are at boundaries
 * 
 * @param {HTMLElement} ulElement - The ul element (dndzone) for the task list
 * @param {Array} draggableTasks - Current draggable tasks array
 * @param {number} listId - Current list ID
 * @param {Array} allLists - All lists array (for finding neighbors)
 * @param {Object} callbacks - Callbacks object with:
 *   - onTaskTextEdit: (taskId, taskText, targetElement) => void - Called when Enter/Space on task text
 * @returns {Function} Cleanup function to remove the event listener
 */
export function setupTaskTextKeydownCapture(ulElement, draggableTasks, listId, allLists, callbacks) {
  if (!ulElement) {
    return () => {}; // No-op cleanup
  }
  
  const { onTaskTextEdit } = callbacks;
  
  async function handleKeydownCapture(e) {
    const target = e.target;
    
    // Handle Enter/Space on task text for editing
    if ((e.key === 'Enter' || e.key === ' ') && target instanceof HTMLElement && target.hasAttribute('data-no-drag')) {
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop ALL handlers including drag library
      
      // Find the task ID from the parent li element
      const liElement = target.closest('li[data-id]');
      if (liElement) {
        const taskId = parseInt(liElement.getAttribute('data-id'));
        const task = draggableTasks.find(t => t.id === taskId);
        if (task && onTaskTextEdit) {
          // Call the callback to open the modal
          onTaskTextEdit(taskId, task.text, target);
        }
      }
      return;
    }
    
    // Handle cross-list movement at boundaries
    // svelte-dnd-action uses Space to start dragging, then Arrow keys to move
    // We need to intercept when at boundaries
    // Check for any arrow key combination that might be used for navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Find the focused task - check if any task element has focus
      const activeElement = document.activeElement;
      if (!activeElement) return;
      
      // Find the task li element that contains the focused element
      const focusedLi = activeElement.closest('li[data-id]');
      if (!focusedLi || !ulElement.contains(focusedLi)) return;
      
      const taskIdAttr = focusedLi.getAttribute('data-id');
      if (!taskIdAttr) return;
      
      const taskId = parseInt(taskIdAttr);
      const task = draggableTasks.find(t => t.id === taskId);
      if (!task) return;
      
      const taskIndex = draggableTasks.findIndex(t => t.id === taskId);
      const isFirst = taskIndex === 0;
      const isLast = taskIndex === draggableTasks.length - 1;
      
      // Check if we're at a boundary and trying to move in that direction
      // Only intercept if we're actually at the boundary
      if (e.key === 'ArrowDown' && isLast) {
        // Move to next list (in visual column order) - prevent default and handle cross-list movement
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const nextListId = findNeighborListId(listId, allLists, 'next');
        if (nextListId != null) {
          // Move to next list in column order
          await moveTaskToNextList(taskId, nextListId);
        }
      } else if (e.key === 'ArrowUp' && isFirst) {
        // Move to previous list (in visual column order) - prevent default and handle cross-list movement
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const prevListId = findNeighborListId(listId, allLists, 'prev');
        if (prevListId != null) {
          // Move to previous list in column order
          await moveTaskToPreviousList(taskId, prevListId);
        }
        // If at first list in first column, do nothing (already at top)
      }
    }
  }
  
  ulElement.addEventListener('keydown', handleKeydownCapture, true); // true = capture phase
  
  return () => {
    ulElement.removeEventListener('keydown', handleKeydownCapture, true);
  };
}

