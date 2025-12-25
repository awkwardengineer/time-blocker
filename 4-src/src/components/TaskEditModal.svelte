<script>
  import { MAX_TEXTAREA_HEIGHT, TASK_WIDTH, SPACING_4 } from '../lib/constants.js';
  import Button from './Button.svelte';
  
  let { isOpen, taskId, taskText, taskPosition, onSave, onCancel, onArchive } = $props();
  
  let editedText = $state(taskText || '');
  let showValidation = $state(false);
  let inputElement = $state(null);
  let modalElement = $state(null);
  
  // Calculate modal position based on task text position
  // We want the input field to align with where the task text was
  let modalStyle = $derived(() => {
    if (!taskPosition || !isOpen) {
      return 'background-color: white; z-index: 10000;';
    }
    
    // Modal structure:
    // - Padding top: 24px (p-6)
    // - Title (h3): ~24px height + 16px margin-bottom (mb-4) = ~40px
    // - Input padding top: 8px (py-2)
    // Total offset from modal top to input top: ~72px
    // Reduced slightly to shift input down a bit
    
    // We want the input field's top edge to align with the task text's top edge
    const modalPaddingTop = 24; // p-6 = 1.5rem = 24px
    const titleHeight = 24; // Approximate h3 height
    const titleMarginBottom = SPACING_4; // mb-4 = 1rem = 16px
    const inputPaddingTop = 8; // py-2 = 0.5rem = 8px
    const offsetToInputTop = modalPaddingTop + titleHeight + titleMarginBottom + inputPaddingTop - 8; // Reduced by 8px to shift down
    
    // Position modal so input aligns with task text
    // Small offset to account for checkbox alignment
    const checkboxOffset = 10; // Small adjustment for checkbox alignment
    const top = taskPosition.top - offsetToInputTop;
    const left = taskPosition.left - SPACING_4 + checkboxOffset; // Small shift right to align with text
    // Match the task text width plus padding on both sides (24px each = 48px)
    const width = taskPosition.width + 48; // Add padding on both sides (24px each)
    
    return `background-color: white; z-index: 10000; top: ${top}px; left: ${left}px; width: ${width}px;`;
  });
  
  // Reset edited text when task changes or modal opens
  $effect(() => {
    if (isOpen) {
      editedText = taskText || '';
      showValidation = false;
    }
  });
  
  // Focus textarea when modal opens and auto-resize
  $effect(() => {
    if (isOpen && inputElement) {
      setTimeout(() => {
        inputElement?.focus();
        inputElement?.select(); // Select all text for easy editing
        // Auto-resize textarea to fit content
        if (inputElement instanceof HTMLTextAreaElement) {
          inputElement.style.height = 'auto';
          inputElement.style.height = `${Math.min(inputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`; // max-h-[10rem] = 160px
        }
      }, 0);
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (inputElement && inputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        inputElement.style.height = 'auto';
        inputElement.style.height = `${Math.min(inputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      };
      
      inputElement.addEventListener('input', resizeTextarea);
      return () => {
        inputElement.removeEventListener('input', resizeTextarea);
      };
    }
  });
  
  function handleSave() {
    // Get the raw input value - preserve whitespace for checking
    const inputValue = editedText ?? '';
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    // This check must come BEFORE the empty string check
    const trimmedValue = inputValue.trim();
    const isWhitespaceOnly = trimmedValue === '' && inputValue.length > 0;
    
    // If whitespace-only, allow saving as blank task
    if (isWhitespaceOnly) {
      onSave(taskId, '');
      showValidation = false;
      return;
    }
    
    // Check if input is empty string "" - prevent saving
    if (inputValue === '' || trimmedValue === '') {
      showValidation = true;
      return;
    }
    
    // Save normal task with content (trimmed)
    onSave(taskId, trimmedValue);
    showValidation = false;
  }
  
  function handleCancel() {
    editedText = taskText || ''; // Revert to original
    showValidation = false;
    onCancel();
  }
  
  function handleBackdropClick(e) {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Tab') {
      // Trap focus within the modal when Tab/Shift+Tab is pressed
      if (!modalElement) return;
      
      const focusableSelectors = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');
      
      const focusableElements = Array.from(
        modalElement.querySelectorAll(focusableSelectors)
      ).filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        if (el.hasAttribute('disabled')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        return true;
      });
      
      if (focusableElements.length === 0) return;
      
      const currentElement = document.activeElement;
      const currentIndex = focusableElements.indexOf(currentElement);
      
      let nextIndex;
      if (e.shiftKey) {
        // Shift+Tab: move backwards, wrap to last when before first
        if (currentIndex <= 0) {
          nextIndex = focusableElements.length - 1;
        } else {
          nextIndex = currentIndex - 1;
        }
      } else {
        // Tab: move forwards, wrap to first when after last
        if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
          nextIndex = 0;
        } else {
          nextIndex = currentIndex + 1;
        }
      }
      
      e.preventDefault();
      e.stopPropagation();
      const nextElement = focusableElements[nextIndex];
      if (nextElement && nextElement instanceof HTMLElement) {
        nextElement.focus();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Only handle Enter if focus is on the textarea
      // Let buttons handle their own Enter key behavior (default button behavior)
      const activeElement = document.activeElement;
      if (activeElement === inputElement) {
        e.preventDefault();
        handleSave();
      }
      // If focus is on a button, let it handle Enter naturally (don't prevent default)
    }
  }
  
  function handleArchive() {
    if (onArchive) {
      onArchive(taskId);
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop overlay - covers entire screen -->
  <div 
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <!-- Modal positioned over the task -->
    <div 
      bind:this={modalElement}
      class="bg-white text-gray-900 p-6 rounded-xl shadow-2xl border-2 border-gray-300 fixed"
      style={modalStyle()}
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <h3 id="modal-title" class="text-lg font-semibold mb-4">Edit Task</h3>
      
      <div class="mb-4">
        <textarea
          bind:this={inputElement}
          bind:value={editedText}
          class="task-input flex-none break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          style="width: {TASK_WIDTH}px;"
          placeholder="Task text..."
          aria-label="Edit task text"
          aria-describedby={showValidation ? "validation-message" : undefined}
          rows="1"
          onkeydown={(e) => {
            // Handle Enter key directly on textarea for more reliable behavior
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }
          }}
        ></textarea>
        
        {#if showValidation}
          <div id="validation-message" class="mt-2 text-sm text-red-600" role="alert">
            Task cannot be empty. Consider archiving this task instead.
          </div>
        {/if}
      </div>
      
      <div class="flex justify-between items-center">
        <button
          onclick={handleArchive}
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
          aria-label="Archive this task instead of saving"
        >
          Archive instead
        </button>
        
        <div class="flex gap-3">
          <Button 
            variant="secondary" 
            onclick={handleCancel}
            aria-label="Cancel editing and discard changes"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onclick={handleSave}
            disabled={showValidation}
            aria-label={showValidation ? "Save disabled: task cannot be empty" : "Save task changes"}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background-color: rgba(0, 0, 0, 0.7) !important;
    z-index: 9999 !important;
  }
  
  .task-input {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
</style>

