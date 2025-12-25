<script>
  import Button from './Button.svelte';
  import { getFontSizePreference, setFontSize } from '../lib/theme.js';
  
  let { isOpen, onClose } = $props();
  
  let currentFontSize = $state('medium');
  
  function handleFontSizeChange(size) {
    setFontSize(size);
    currentFontSize = size;
  }
  
  // Update current font size when flyout opens
  $effect(() => {
    if (isOpen) {
      currentFontSize = getFontSizePreference();
    }
  });
  
  let flyoutElement = $state(null);
  let backdropMousedownTarget = $state(null);
  
  function handleClose() {
    onClose();
  }
  
  function handleBackdropClick(e) {
    // Only close if clicking the backdrop itself, not the flyout content
    if (e.target === e.currentTarget) {
      handleClose();
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
    // This prevents closing if user dragged from backdrop to flyout content
    if (e.target === e.currentTarget && backdropMousedownTarget === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
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
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Tab') {
      // Trap focus within the flyout when Tab/Shift+Tab is pressed
      if (!flyoutElement) return;
      
      const focusableSelectors = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');
      
      const focusableElements = Array.from(
        flyoutElement.querySelectorAll(focusableSelectors)
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
    }
  }
  
  // Focus close button when flyout opens
  $effect(() => {
    if (isOpen && flyoutElement) {
      setTimeout(() => {
        const closeButton = flyoutElement?.querySelector('button[aria-label="Close settings"]');
        if (closeButton && closeButton instanceof HTMLElement) {
          closeButton.focus();
        }
      }, 0);
    }
  });
  
  // Handle Escape key at document level
  $effect(() => {
    if (!isOpen) return;
    
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 z-40"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-flyout-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onmousedown={handleBackdropMousedown}
    onmouseup={handleBackdropMouseup}
    onmousemove={handleBackdropMousemove}
    ondragstart={handleBackdropDragStart}
    ondrag={handleBackdropDrag}
  >
    <!-- Flyout Panel -->
    <div
      bind:this={flyoutElement}
      class="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col"
      role="document"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header with close button -->
      <div class="flex items-center justify-between p-6 border-b border-grey-50">
        <h2 id="settings-flyout-title" class="text-grey-110 font-gilda text-[24px] leading-none m-0">
          Settings
        </h2>
        <button
          type="button"
          onclick={handleClose}
          aria-label="Close settings"
          class="focus:outline-none focus:ring-2 focus:ring-blue-500 text-grey-110 hover:text-grey-90 text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        <!-- Font Size Setting -->
        <div class="bg-grey-20 rounded-lg p-4 mb-6">
          <label class="block text-grey-110 font-gilda text-sm font-medium mb-3">
            Font Size
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => handleFontSizeChange('small')}
              aria-pressed={currentFontSize === 'small'}
              class={`flex-1 px-4 py-2 text-sm font-urbanist transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentFontSize === 'small'
                  ? 'bg-grey-80 text-grey-110'
                  : 'bg-white text-grey-110 hover:bg-grey-30'
              }`}
              aria-label="Small font size (10px body, 12px heading)"
            >
              Small
            </button>
            <button
              type="button"
              onclick={() => handleFontSizeChange('medium')}
              aria-pressed={currentFontSize === 'medium'}
              class={`flex-1 px-4 py-2 text-sm font-urbanist transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentFontSize === 'medium'
                  ? 'bg-grey-80 text-grey-110'
                  : 'bg-white text-grey-110 hover:bg-grey-30'
              }`}
              aria-label="Medium font size (12px body, 14px heading)"
            >
              Medium
            </button>
            <button
              type="button"
              onclick={() => handleFontSizeChange('large')}
              aria-pressed={currentFontSize === 'large'}
              class={`flex-1 px-4 py-2 text-sm font-urbanist transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentFontSize === 'large'
                  ? 'bg-grey-80 text-grey-110'
                  : 'bg-white text-grey-110 hover:bg-grey-30'
              }`}
              aria-label="Large font size (14px body, 16px heading)"
            >
              Large
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

