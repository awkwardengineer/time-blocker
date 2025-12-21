<script>
  import { MAX_TEXTAREA_HEIGHT, TASK_WIDTH } from '../lib/constants.js';
  import Button from './Button.svelte';
  
  let {
    isInputActive = $bindable(false),
    inputValue = '',
    onInputChange,
    onSave,
    onEscape,
    onActivate,
    buttonText = 'Add Task',
    placeholder = 'Add new task...',
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
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave?.();
    } else if (e.key === 'Escape') {
      onEscape?.(e);
    } else if (e.key === 'Tab') {
      // When tabbing away from the input:
      // - If empty, task creation handler will close the input.
      // - If it has content, task creation handler will create the task, then close the input.
      // Let the browser move focus naturally; we just trigger the appropriate save/close behavior.
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
  class="flex items-center gap-2 py-1 border-b border-grey-50 hover:bg-grey-20 w-full print:hidden add-task-container add-task-button"
  style={marginLeft ? "margin-left: 1.5rem;" : ""}
>
  {#if isInputActive}
    <span class="drag-handle text-grey-60 select-none invisible" aria-hidden="true">
      ⋮⋮
    </span>
    <input
      type="checkbox"
      disabled
      class="cursor-pointer opacity-0"
      aria-hidden="true"
      tabindex="-1"
    />
    <div class="flex gap-2 flex-1">
      <textarea
        bind:this={inputElement}
        {placeholder}
        value={inputValue}
        oninput={(e) => onInputChange?.(e.currentTarget.value)}
        onkeydown={handleKeydown}
        class="flex-1 break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto text-body font-urbanist text-grey-100"
        rows="1"
      ></textarea>
      <Button
        variant="primary"
        onclick={onSave}
        aria-label="Save new task"
      >
        Save
      </Button>
    </div>
  {:else}
    <span class="drag-handle text-grey-60 select-none invisible" aria-hidden="true">
      ⋮⋮
    </span>
    <input
      type="checkbox"
      disabled
      class="cursor-pointer opacity-0"
      aria-hidden="true"
      tabindex="-1"
    />
    <span 
      class="cursor-pointer hover:underline break-words flex-1 text-body font-urbanist text-grey-60"
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
