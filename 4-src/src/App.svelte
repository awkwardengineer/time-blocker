<script>
  import { getAllLists, getTasksForList } from './lib/dataAccess.js';
  
  let lists = $state([]);
  let tasksByList = $state({});
  
  $effect(() => {
    // Fetch lists and tasks when component mounts
    async function loadData() {
      try {
        const allLists = await getAllLists();
        lists = allLists;
        
        // Fetch tasks for each list
        const tasksMap = {};
        for (const list of allLists) {
          tasksMap[list.id] = await getTasksForList(list.id);
        }
        tasksByList = tasksMap;
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    
    loadData();
  });
  
  function handlePrint() {
    window.print();
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center bg-gray-50 print:bg-white print:min-h-0 print:gap-0 print:py-0 gap-4 py-8">
  <div class="w-[1056px] flex justify-end print:hidden">
    <button
      onclick={handlePrint}
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Print
    </button>
  </div>
  <div class="w-[1056px] h-[816px] bg-gray-400 print:bg-gray-400 border-2 border-gray-300 shadow-lg print:shadow-none print:border-0 print:mx-auto relative">
    <div class="absolute inset-[16px] border border-red-600" style="border-color: rgb(220, 38, 38);">
      <div class="w-full h-full p-4 overflow-auto">
        {#if lists.length === 0}
          <p>Loading...</p>
        {:else}
          {#each lists as list}
            <div>
              <h2>{list.name}</h2>
              <ul>
                {#each (tasksByList[list.id] || []) as task}
                  <li>{task.text}</li>
                {/each}
              </ul>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  @media print {
    @page {
      size: landscape;
      margin: 0;
    }
    main {
      box-sizing: border-box;
      border: 2px solid rgb(34, 197, 94);
      position: absolute;
      top: 0;
      left: 0;
    }
  }
</style>
