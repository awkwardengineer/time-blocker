<script>
  import { dndzone } from 'svelte-dnd-action';
  import TaskList from './TaskList.svelte';
  import Button from './Button.svelte';
  import { isPlaceholderItem } from '../lib/listDndUtils.js';
  import { DOM_UPDATE_DELAY_SHORT_MS } from '../lib/constants.js';

  let {
    columnIndex,
    columnLists,
    stableLists,
    newTaskInputs,
    createListColumnIndex,
    createListInput = $bindable(''),
    createListInputElement = $bindable(null),
    keyboardListDrag,
    allLists,
    onInputChange,
    onListKeyboardKeydown,
    onListConsider,
    onListFinalize,
    onCreateListClick,
    onCreateListKeydown,
    onCreateListInputEscape,
    onCreateList,
    onCreateListOnTab
  } = $props();

  let dndzoneElement = $state(null);
  let emptyDropZoneElement = $state(null);
  let createListButtonElement = $state(null);

  // Force empty drop zone to have tabindex="-1" after dndzone initializes
  // The dndzone library sets tabindex="0" on empty drop zones, so we override it
  $effect(() => {
    if (typeof document === 'undefined') return;
    if (columnLists.length !== 0) return;
    if (!emptyDropZoneElement) return;
    
    // Use a small delay to ensure dndzone has finished initializing
    const timeoutId = setTimeout(() => {
      if (emptyDropZoneElement && emptyDropZoneElement.getAttribute('tabindex') !== '-1') {
        emptyDropZoneElement.setAttribute('tabindex', '-1');
      }
    }, DOM_UPDATE_DELAY_SHORT_MS);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });

  // Apply drop zone styling during keyboard drag
  // When keyboard drag is active, show drop zones on all columns (including source column)
  $effect(() => {
    if (!dndzoneElement || !(dndzoneElement instanceof HTMLElement)) return;
    
    const isKeyboardDragActive = keyboardListDrag?.active === true;
    
    // Apply drop zone styling if keyboard drag is active
    if (isKeyboardDragActive) {
      // Apply the same styles as dropTargetStyle
      dndzoneElement.style.outline = 'none';
      dndzoneElement.style.boxShadow = 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)';
      dndzoneElement.style.borderRadius = '4px';
    } else {
      // Remove drop zone styling
      dndzoneElement.style.outline = '';
      dndzoneElement.style.boxShadow = '';
      dndzoneElement.style.borderRadius = '';
    }
  });
</script>

<div class="flex flex-col pt-0 min-w-0 px-2 {columnIndex < 4 ? 'border-r border-grey-50' : ''}" data-column-index={columnIndex}>
  <div
    bind:this={dndzoneElement}
    use:dndzone={{
      items: columnLists,
      type: 'list', // Shared type enables cross-column dragging
      zoneTabIndex: -1, // Prevent entire column container from being focusable
      dropTargetStyle: {
        outline: 'none',
        boxShadow: 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)', // blue-500 with 40% opacity - inset shadow acts like border without affecting layout
        // Removed backgroundColor to prevent layout recalculation during drag
        borderRadius: '4px'
      }
    }}
    onconsider={onListConsider}
    onfinalize={onListFinalize}
    class="flex flex-col pt-0"
  >
    <!-- Render lists in this column -->
    {#each columnLists as dragItem, index (dragItem.id)}
      {@const isPlaceholder = isPlaceholderItem(dragItem)}
      {@const realList = stableLists.find(list => list.id === dragItem.id)}
      {@const fallbackList = !realList && !isPlaceholder ? dragItem : null}
      {@const listToRender = realList || fallbackList}
      {#if listToRender}
        <div
          data-id={dragItem.id}
          class="flex flex-col mb-6"
          tabindex="0"
          role="group"
          aria-label={`List: ${listToRender.name ?? 'Unnamed list'}`}
          aria-roledescription="Draggable list"
          aria-pressed={keyboardListDrag?.active && keyboardListDrag?.listId === listToRender.id ? 'true' : 'false'}
          onkeydowncapture={(e) => onListKeyboardKeydown(e, listToRender.id)}
        >
          <TaskList
            listId={listToRender.id}
            listName={listToRender.name ?? 'Unnamed list'}
            newTaskInput={newTaskInputs[listToRender.id] || ''}
            onInputChange={(value) => onInputChange(listToRender.id, value)}
            {allLists}
            {stableLists}
          />
        </div>
      {:else}
        <div data-id={dragItem.id} class="flex flex-col mb-6">
          <!-- Placeholder item for drag feedback - not focusable for keyboard drag -->
        </div>
      {/if}
    {/each}
    
    <!-- Empty drop zone for empty columns -->
    {#if columnLists.length === 0}
      <div 
        bind:this={emptyDropZoneElement}
        class="empty-drop-zone min-h-[96px]"
        tabindex="-1"
      ></div>
    {/if}
  </div>
  
  <!-- Create List button/input - per column, appears in all columns (outside dndzone) -->
  <div class="flex flex-col mb-6 w-full print:hidden {columnLists.length === 0 ? 'create-list-empty-column' : ''}">
    {#if createListColumnIndex === columnIndex}
      <div class="flex items-center">
        <div class="create-list-input-wrapper border-2 border-transparent focus-within:border-blue-500 focus-within:rounded box-border -mx-0.5">
          <input
            bind:this={createListInputElement}
            bind:value={createListInput}
            type="text"
            class="create-list-input cursor-pointer hover:underline font-gilda text-[24px] text-grey-60 placeholder:italic w-full m-0 px-2 py-2 leading-none rounded -my-1"
            style="padding-bottom: 6px;"
            placeholder="start typing..."
            onkeydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onCreateList(columnIndex);
              } else if (e.key === 'Escape') {
                onCreateListInputEscape(e, columnIndex, columnLists.length === 0);
              } else if (e.key === 'Tab') {
                // Create list if there's whitespace or text, then close input
                onCreateListOnTab(columnIndex);
              }
            }}
            aria-label="Enter list name"
          />
        </div>
      </div>
    {:else}
      <div class="flex items-center">
        <h2 
          bind:this={createListButtonElement}
          onclick={() => onCreateListClick(columnIndex)}
          onkeydown={(e) => onCreateListKeydown(e, columnIndex)}
          role="button"
          tabindex="0"
          class="cursor-pointer hover:underline m-0 px-2 py-2 leading-none text-grey-60 font-gilda text-[24px] rounded -my-1"
          aria-label="Create new list"
        >
          Create new list
        </h2>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Style the create list input to match h2 exactly */
  .create-list-input-wrapper {
    display: flex;
    align-items: center;
    box-shadow: none !important;
    filter: none !important;
  }
  
  .create-list-input-wrapper:focus-within {
    box-shadow: none !important;
    filter: none !important;
  }
  
  .create-list-input {
    border: 0;
    border-bottom: 2px solid rgb(188, 188, 188); /* border-grey-60 */
    background: transparent;
    outline: none;
    line-height: 1; /* leading-none equivalent */
    color: rgb(188, 188, 188); /* text-grey-60 to match button */
    box-shadow: none !important;
    filter: none !important;
  }
  
  .create-list-input:not(:placeholder-shown) {
    color: rgb(50, 50, 50); /* text-grey-110 when text is entered */
  }
  
  .create-list-input:focus {
    border-bottom-color: rgb(188, 188, 188); /* Keep grey border, focus ring is on wrapper */
    box-shadow: none !important;
  }
  
  .create-list-input-wrapper:focus-within .create-list-input {
    border-bottom-color: rgb(188, 188, 188); /* Keep grey border when focused */
    box-shadow: none !important;
  }
  
  .create-list-input::placeholder {
    opacity: 0.5;
    font-style: italic;
  }
  
  /* Explicitly reset h2 margins for "Create new list" in columns */
  [data-column-index] h2 {
    margin: 0;
  }
  
  /* Position "Create new list" to cover empty drop zone space (only for empty columns) */
  [data-column-index] .create-list-empty-column {
    margin-top: -96px; /* Shift up to cover min-h-[96px] from empty drop zone */
  }
  
  /* Ensure list wrapper margins are applied even with dndzone inline styles */
  [data-column-index] [data-id] {
    margin-bottom: 1.5rem !important;
  }
</style>

