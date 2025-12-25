<script>
  import { MAX_TEXTAREA_HEIGHT, TASK_WIDTH } from '../lib/constants.js';
  
  let {
    isInputActive = $bindable(false),
    inputValue = '',
    onInputChange,
    onSave,
    onEscape,
    onActivate,
    buttonText = 'Add Task',
    placeholder = 'start typing...',
    ariaLabel,
    marginLeft = false,
    containerElement = $bindable(null),
    textareaElement = $bindable(null)
  } = $props();
  
  let inputElement = $state(null);
  let containerRef = $state(null);
  
  // Expose container and textarea elements to parent via bindable props
  $effect(() => {
    containerElement = containerRef;
    textareaElement = inputElement;
  });
  
  // Focus textarea when it becomes active and auto-resize
  $effect(() => {
    if (isInputActive && inputElement) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => {
        inputElement?.focus();
        // Auto-resize textarea to fit content, using CSS variable for line height
        if (inputElement instanceof HTMLTextAreaElement) {
          inputElement.style.height = 'auto';
          const scrollHeight = inputElement.scrollHeight;
          // Use CSS variable for minimum height (line-height-body)
          const minHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--line-height-body')) || 24;
          inputElement.style.height = `${Math.max(minHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT))}px`;
        }
      }, 0);
    } else if (!isInputActive && inputElement) {
      // Reset height when input becomes inactive, using CSS variable
      if (inputElement instanceof HTMLTextAreaElement) {
        const lineHeight = getComputedStyle(document.documentElement).getPropertyValue('--line-height-body') || '24px';
        inputElement.style.height = lineHeight;
      }
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (inputElement && inputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        inputElement.style.height = 'auto';
        const scrollHeight = inputElement.scrollHeight;
        // Use CSS variable for minimum height (line-height-body)
        const minHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--line-height-body')) || 24;
        inputElement.style.height = `${Math.max(minHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT))}px`;
      };
      
      inputElement.addEventListener('input', resizeTextarea);
      return () => {
        inputElement.removeEventListener('input', resizeTextarea);
      };
    }
  });
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Create task if there's whitespace or text
      onSave?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Pass the input value so parent can decide: cancel if list empty, create task if whitespace/text
      onEscape?.(e, inputValue);
    } else if (e.key === 'Tab') {
      // Create task if there's whitespace or text, then close input
      onSave?.({ closeAfterSave: true });
    }
  }
  
  function handleButtonKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Blur the button
      const buttonElement = e.currentTarget;
      if (buttonElement && buttonElement instanceof HTMLElement) {
        buttonElement.blur();
      }
    }
  }
</script>

<div 
  bind:this={containerRef}
  class="flex items-center border-b border-grey-50 hover:bg-grey-20 w-full print:hidden add-task-container add-task-button"
  style={`padding-top: var(--add-task-padding-y); padding-bottom: var(--add-task-padding-y); gap: var(--task-item-gap); ${marginLeft ? "margin-left: 1.5rem;" : ""}`}
>
  {#if isInputActive}
    <input
      type="checkbox"
      disabled
      class="cursor-pointer"
      aria-hidden="true"
      tabindex="-1"
    />
    <textarea
      bind:this={inputElement}
      {placeholder}
      value={inputValue}
      oninput={(e) => onInputChange?.(e.currentTarget.value)}
      onkeydown={handleKeydown}
      class="flex-1 break-words resize-none max-h-[10rem] overflow-y-auto font-urbanist text-grey-100 placeholder:italic"
      rows="1"
      style="font-size: var(--font-size-body); line-height: var(--line-height-body); height: var(--line-height-body);"
    ></textarea>
  {:else}
    <input
      type="checkbox"
      disabled
      class="cursor-pointer opacity-0"
      aria-hidden="true"
      tabindex="-1"
    />
    <span 
      class="cursor-pointer hover:underline break-words flex-1 font-urbanist text-grey-60"
      style="font-size: var(--font-size-body); line-height: var(--line-height-body);"
      onclick={onActivate}
      onkeydown={handleButtonKeydown}
      role="button"
      tabindex="0"
      aria-label={ariaLabel || buttonText}
    >
      {buttonText}
    </span>
  {/if}
</div>

<style>
  .add-task-container {
    box-sizing: border-box; /* Include borders in width calculation */
  }
</style>
