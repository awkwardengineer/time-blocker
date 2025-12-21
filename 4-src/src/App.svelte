<script>
  import Board from './components/Board.svelte';
  import ArchivedView from './components/ArchivedView.svelte';
  import { PRINT_CONTAINER_WIDTH, PRINT_CONTAINER_HEIGHT } from './lib/constants.js';

  function handlePrint() {
    window.print();
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center bg-grey-10 print:bg-white print:min-h-0 print:gap-0 print:py-0 gap-4 py-8">
  <div class="flex justify-end print:hidden" style="width: {PRINT_CONTAINER_WIDTH}px;">
    <button
      onclick={handlePrint}
      class="px-6 py-3 bg-grey-80 text-grey-110 hover:bg-grey-90 focus:bg-grey-90 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-grey-50 disabled:text-grey-100 disabled:cursor-not-allowed"
    >
      Print
    </button>
  </div>
  <div class="bg-grey-10 print:bg-grey-10 border-2 border-grey-50 shadow-lg print:shadow-none print:border-0 print:mx-auto relative" style="width: {PRINT_CONTAINER_WIDTH}px; height: {PRINT_CONTAINER_HEIGHT}px;">
    <div class="absolute inset-[16px] border border-grey-80 pointer-events-none z-0"></div>
    <div class="absolute inset-[16px] z-10">
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
      position: absolute;
      top: 0;
      left: 0;
    }
  }
</style>
