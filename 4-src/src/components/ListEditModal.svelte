<script>
  import { SPACING_4 } from '../lib/constants.js';
  
  let { isOpen, listId, listName, listPosition, onSave, onCancel } = $props();
  
  let editedName = $state(listName || '');
  let showValidation = $state(false);
  let inputElement = $state(null);
  let modalElement = $state(null);
  
  // Calculate modal position based on list name position
  // We want the input field to align with where the list name was
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
    const inputPaddingTop = 8; // py-2 = 0.5rem = 8px
    const offsetToInputTop = modalPaddingTop + titleHeight + titleMarginBottom + inputPaddingTop - 8; // Reduced by 8px to shift down
    
    // Position modal so input aligns with list name
    const top = listPosition.top - offsetToInputTop;
    const left = listPosition.left - SPACING_4; // Small shift left to account for padding
    // Match the list name width plus padding on both sides (24px each = 48px)
    const width = Math.max(listPosition.width + 48, 300); // Minimum width of 300px
    
    return `background-color: white; z-index: 10000; top: ${top}px; left: ${left}px; width: ${width}px;`;
  });
  
  // Reset edited name when list changes or modal opens
  $effect(() => {
    if (isOpen) {
      editedName = listName || '';
      showValidation = false;
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
      handleCancel();
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
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
    <!-- Modal positioned over the list name -->
    <div 
      bind:this={modalElement}
      class="bg-white text-gray-900 p-6 rounded-xl shadow-2xl border-2 border-gray-300 fixed"
      style={modalStyle()}
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <h3 id="modal-title" class="text-lg font-semibold mb-4">Rename List</h3>
      
      <div class="mb-4">
        <input
          bind:this={inputElement}
          bind:value={editedName}
          type="text"
          class="list-input w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="List name..."
          onkeydown={handleKeydown}
          aria-label="Edit list name"
          aria-describedby={showValidation ? "validation-message" : undefined}
        />
        
        {#if showValidation}
          <div id="validation-message" class="mt-2 text-sm text-red-600" role="alert">
            List name cannot be empty.
          </div>
        {/if}
      </div>
      
      <div class="flex justify-end gap-3">
        <button
          onclick={handleCancel}
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          aria-label="Cancel editing and discard changes"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={showValidation}
          aria-label={showValidation ? "Save disabled: list name cannot be empty" : "Save list name changes"}
        >
          Save
        </button>
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
  
  .list-input {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
</style>

