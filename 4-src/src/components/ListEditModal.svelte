<script>
  import { SPACING_4 } from '../lib/constants.js';
  import Button from './Button.svelte';
  
  let { isOpen, listId, listName, listPosition, onSave, onCancel, onArchive } = $props();
  
  let editedName = $state(listName || '');
  let showValidation = $state(false);
  let inputElement = $state(null);
  let modalElement = $state(null);
  let modalState = $state('edit'); // 'edit' or 'confirm-archive'
  let backdropMousedownTarget = $state(null); // Track where mousedown occurred
  
  // Calculate modal position and width based on list name position
  // We want the input field to align with where the list name was
  // Width is calculated once and maintained across both states
  let modalStyle = $derived(() => {
    if (!listPosition || !isOpen) {
      return 'background-color: white; z-index: 10000;';
    }
    
    // Modal structure:
    // - Padding top: 24px (p-6)
    // - Title (h3): ~24px height + 16px margin-bottom (mb-4) = ~40px
    // - Input padding top: 8px (py-2)
    // Total offset from modal top to input top: ~72px
    // Reduced slightly to shift input down a bit
    
    // We want the input field's top edge to align with the list name's top edge
    const modalPaddingTop = 24; // p-6 = 1.5rem = 24px
    const titleHeight = 24; // Approximate h3 height
    const titleMarginBottom = SPACING_4; // mb-4 = 1rem = 16px
    const inputBorderTop = 1; // border = 1px
    const inputPaddingTop = 7; // padding adjusted to account for border (7px + 1px border = 8px total)
    const offsetToInputTop = modalPaddingTop + titleHeight + titleMarginBottom + inputBorderTop + inputPaddingTop - 8; // Reduced by 8px to shift down
    
    // Position modal so input aligns with list name
    const top = listPosition.top - offsetToInputTop;
    const left = listPosition.left - SPACING_4; // Small shift left to account for padding
    // Match the list name width plus minimal padding on both sides (12px each = 24px)
    // This width is maintained for both edit and confirm-archive states
    const width = Math.max(listPosition.width + 24, 250); // Minimum width of 250px, but match list name width
    const maxWidth = width; // Ensure it doesn't grow beyond calculated width
    
    return `background-color: white; z-index: 10000; top: ${top}px; left: ${left}px; width: ${width}px; max-width: ${maxWidth}px; box-sizing: border-box;`;
  });
  
  // Reset edited name and state when list changes or modal opens
  $effect(() => {
    if (isOpen) {
      editedName = listName || '';
      showValidation = false;
      modalState = 'edit';
    }
  });
  
  // Focus input when modal opens
  $effect(() => {
    if (isOpen && inputElement) {
      setTimeout(() => {
        inputElement?.focus();
        inputElement?.select(); // Select all text for easy editing
      }, 0);
    }
  });
  
  function handleSave() {
    // Get the raw input value
    const inputValue = editedName ?? '';
    const trimmedValue = inputValue.trim();
    
    // Check if input is empty - prevent saving
    if (trimmedValue === '') {
      showValidation = true;
      return;
    }
    
    // Save list name (trimmed)
    onSave(listId, trimmedValue);
    showValidation = false;
  }
  
  function handleCancel() {
    editedName = listName || ''; // Revert to original
    showValidation = false;
    onCancel();
  }
  
  function handleBackdropClick(e) {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  }
  
  function handleBackdropMousedown(e) {
    // Track where mousedown occurred - only close if both mousedown and mouseup are on backdrop
    if (e.target === e.currentTarget) {
      backdropMousedownTarget = e.target;
    } else {
      backdropMousedownTarget = null;
    }
    // Always stop propagation to prevent SortableJS from detecting drags
    e.stopPropagation();
    e.preventDefault();
  }
  
  function handleBackdropMouseup(e) {
    // Close on mouseup if both mousedown and mouseup were on the backdrop
    // This prevents closing if user dragged from backdrop to modal content
    if (e.target === e.currentTarget && backdropMousedownTarget === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Reset tracking
    backdropMousedownTarget = null;
    // Always stop propagation to prevent SortableJS from detecting drags
    e.stopPropagation();
  }
  
  function handleBackdropMousemove(e) {
    // Prevent mousemove from triggering drags in SortableJS
    e.stopPropagation();
    e.preventDefault();
  }
  
  function handleBackdropDragStart(e) {
    // Prevent any drag operations from starting on the backdrop
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  function handleBackdropDrag(e) {
    // Prevent any drag operations on the backdrop
    e.preventDefault();
    e.stopPropagation();
    return false;
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
      if (modalState === 'confirm-archive') {
        handleArchiveCancel();
      } else {
        handleCancel();
      }
    } else if (e.key === 'Enter' && !e.shiftKey && modalState === 'edit') {
      // Only treat Enter as "Save" when the list name input is focused.
      // This prevents Enter on other controls (like the Archive button)
      // from triggering a save and closing the modal.
      if (e.target === inputElement) {
        e.preventDefault();
        handleSave();
      }
    }
  }
  
  function handleArchiveClick() {
    modalState = 'confirm-archive';
  }
  
  function handleArchiveConfirm() {
    onArchive(listId);
    // Close the modal after archiving
    handleCancel();
  }
  
  function handleArchiveCancel() {
    modalState = 'edit';
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
    onmousedown={handleBackdropMousedown}
    onmouseup={handleBackdropMouseup}
    onmousemove={handleBackdropMousemove}
    ondragstart={handleBackdropDragStart}
    ondrag={handleBackdropDrag}
    ondragend={handleBackdropDrag}
    onkeydown={handleKeydown}
  >
    <!-- Modal positioned over the list name -->
    <div 
      bind:this={modalElement}
      class="bg-grey-10 text-grey-110 p-6 rounded-xl shadow-2xl border-2 border-grey-50 fixed box-border"
      style={modalStyle()}
      onclick={(e) => e.stopPropagation()}
      onmousedown={(e) => e.stopPropagation()}
      onmouseup={(e) => e.stopPropagation()}
      role="document"
    >
      {#if modalState === 'edit'}
        <h3 id="modal-title" class="text-lg font-semibold mb-4">Rename List</h3>
        
        <div class="mb-4">
          <input
            bind:this={inputElement}
            bind:value={editedName}
            type="text"
            class="list-input w-full px-2 py-2 border border-grey-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 box-border font-gilda text-[24px] text-grey-110"
            style="max-width: 100%; box-sizing: border-box; padding-left: 7px; padding-right: 7px; padding-top: 7px; padding-bottom: 7px;"
            placeholder="List name..."
            aria-label="Edit list name"
            aria-describedby={showValidation ? "validation-message" : undefined}
          />
          
          {#if showValidation}
            <div id="validation-message" class="mt-2 text-sm text-red-600" role="alert">
              List name cannot be empty.
            </div>
          {/if}
        </div>
        
        <div class="flex justify-between items-center">
          <Button 
            variant="secondary" 
            onclick={handleArchiveClick}
            aria-label="Archive this list"
          >
            Archive
          </Button>
          <div class="flex justify-end gap-3">
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
              aria-label={showValidation ? "Save disabled: list name cannot be empty" : "Save list name changes"}
            >
              Save
            </Button>
          </div>
        </div>
      {:else if modalState === 'confirm-archive'}
        <h3 id="modal-title" class="text-lg font-semibold mb-4">Archive List</h3>
        
        <p class="mb-6 text-sm text-grey-100">
          Archive this list? This will archive all tasks in the list.
        </p>
        
        <div class="flex justify-end gap-3">
          <Button 
            variant="secondary" 
            onclick={handleArchiveCancel}
            aria-label="Cancel archiving"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onclick={handleArchiveConfirm}
            aria-label="Confirm archive list"
          >
            Archive
          </Button>
        </div>
      {/if}
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
    /* Prevent any drag operations from starting on the backdrop */
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  
  .list-input {
    line-height: 1; /* leading-none equivalent */
  }
</style>

