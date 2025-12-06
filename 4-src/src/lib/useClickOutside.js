/**
 * Utility function to handle click-outside-to-close behavior
 * Designed to be used within Svelte's $effect
 * 
 * @param {HTMLElement|null|Function} element - The element to watch for clicks outside, or a function that returns it
 * @param {Function} callback - Function to call when clicking outside (only called if conditions are met)
 * @param {Object} options - Configuration options
 * @param {Array<HTMLElement|Function>} options.ignoreElements - Elements or functions that return elements to ignore
 * @param {Function} options.shouldClose - Function that returns true if the click should trigger close
 * @param {Function} options.checkIgnoreClick - Function that receives the click event and returns true if click should be ignored
 * @returns {Function} Cleanup function to be returned from $effect
 */
export function useClickOutside(element, callback, options = {}) {
  const { ignoreElements = [], shouldClose = () => true, checkIgnoreClick = null } = options;
  
  function handleDocumentClick(e) {
    // Get the actual element (could be a function that returns it)
    const actualElement = typeof element === 'function' ? element() : element;
    
    // If element doesn't exist, don't do anything
    if (!actualElement) return;
    
    // Check if click is on the element itself
    if (actualElement.contains(e.target)) {
      return; // Click is on element, don't close
    }
    
    // Check custom ignore click function (e.g., for Save button detection)
    if (checkIgnoreClick && checkIgnoreClick(e)) {
      return; // Click should be ignored
    }
    
    // Check ignore elements
    for (const ignoreItem of ignoreElements) {
      let ignoreElement = null;
      
      // If it's a function, call it to get the element
      if (typeof ignoreItem === 'function') {
        ignoreElement = ignoreItem();
      } else {
        ignoreElement = ignoreItem;
      }
      
      if (ignoreElement && ignoreElement.contains(e.target)) {
        return; // Click is on ignored element, don't close
      }
    }
    
    // Check if we should close based on custom condition
    if (!shouldClose()) {
      return; // Condition not met, don't close
    }
    
    // Click is outside and conditions are met - call callback
    callback();
  }
  
  // Add click listener after a brief delay to avoid immediate trigger
  const timeoutId = setTimeout(() => {
    document.addEventListener('click', handleDocumentClick);
  }, 0);
  
  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener('click', handleDocumentClick);
  };
}

