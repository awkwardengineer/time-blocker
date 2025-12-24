<script>
  import { onMount } from 'svelte';
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
    onCreateListClick,
    onCreateListKeydown,
    onCreateListInputEscape,
    onCreateList,
    onCreateListOnTab,
    onColumnElementReady = () => {}
  } = $props();

  let columnElement = $state(null);
  let columnContainerElement = $state(null);
  let emptyDropZoneElement = $state(null);
  let createListButtonElement = $state(null);
  
  // Notify parent when column element is ready
  $effect(() => {
    if (columnElement && onColumnElementReady) {
      onColumnElementReady(columnElement, columnIndex);
    }
  });

  // Apply drop zone styling during keyboard drag
  // When keyboard drag is active, show drop zones on all columns (including source column)
  // Apply to the outer column container so it includes the button area
  $effect(() => {
    if (!columnContainerElement || !(columnContainerElement instanceof HTMLElement)) return;
    
    const isKeyboardDragActive = keyboardListDrag?.active === true;
    
    // Apply drop zone styling if keyboard drag is active
    if (isKeyboardDragActive) {
      // Apply the same styles as dropTargetStyle
      columnContainerElement.style.outline = 'none';
      columnContainerElement.style.boxShadow = 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)';
      columnContainerElement.style.borderRadius = '4px';
    } else {
      // Remove drop zone styling
      columnContainerElement.style.outline = '';
      columnContainerElement.style.boxShadow = '';
      columnContainerElement.style.borderRadius = '';
    }
  });
  
  // Make sortable container expand to fill column during keyboard drag
  $effect(() => {
    if (!columnElement || !(columnElement instanceof HTMLElement)) return;
    
    const isKeyboardDragActive = keyboardListDrag?.active === true;
    
    if (isKeyboardDragActive) {
      columnElement.style.flex = '1 1 auto';
      columnElement.style.minHeight = '0';
    } else {
      columnElement.style.flex = '';
      columnElement.style.minHeight = '';
    }
  });
</script>

<div 
  bind:this={columnContainerElement}
  class="flex flex-col pt-0 min-w-0 px-2 h-full {columnIndex < 4 ? 'border-r border-grey-50' : ''}" 
  data-column-index={columnIndex}
>
  <!-- Create List button/input - always outside sortable container -->
  {#if columnLists.length === 0}
    <!-- For empty columns: button at top -->
    <div class="create-list-container flex flex-col w-full print:hidden create-list-empty-column">
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
                  onCreateListInputEscape(e, columnIndex, true);
                } else if (e.key === 'Tab') {
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
  {/if}
  
  <div
    bind:this={columnElement}
    class="sortable-column-container flex flex-col pt-0 gap-y-6 min-h-0 overflow-y-auto px-1"
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
          class="flex flex-col"
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
        <div data-id={dragItem.id} class="flex flex-col">
          <!-- Placeholder item for drag feedback - not focusable for keyboard drag -->
        </div>
      {/if}
    {/each}
    
    <!-- Empty drop zone for empty columns - positioned at top -->
    {#if columnLists.length === 0}
      <div 
        bind:this={emptyDropZoneElement}
        class="empty-drop-zone min-h-[96px]"
        tabindex="-1"
      ></div>
    {/if}
  </div>
  
  <!-- Create List button/input for columns with lists - appears outside sortable container after it -->
  {#if columnLists.length > 0}
    <div class="create-list-container flex flex-col w-full print:hidden">
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
                  onCreateListInputEscape(e, columnIndex, false);
                } else if (e.key === 'Tab') {
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
  {/if}
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
</style>

