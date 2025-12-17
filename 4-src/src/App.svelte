<script>
  import Board from './components/Board.svelte';
  import ArchivedView from './components/ArchivedView.svelte';
  import { PRINT_CONTAINER_WIDTH, PRINT_CONTAINER_HEIGHT } from './lib/constants.js';

  function handlePrint() {
    window.print();
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center bg-gray-50 print:bg-white print:min-h-0 print:gap-0 print:py-0 gap-4 py-8">
  <div class="flex justify-end print:hidden" style="width: {PRINT_CONTAINER_WIDTH}px;">
    <button
      onclick={handlePrint}
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Print
    </button>
  </div>
  <div class="bg-gray-400 print:bg-gray-400 border-2 border-gray-300 shadow-lg print:shadow-none print:border-0 print:mx-auto relative" style="width: {PRINT_CONTAINER_WIDTH}px; height: {PRINT_CONTAINER_HEIGHT}px;">
    <div class="absolute inset-[16px] border border-red-600" style="border-color: rgb(220, 38, 38);">
      <Board />
    </div>
  </div>
  <ArchivedView />
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
