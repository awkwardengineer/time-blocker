<script>
  import Button from './Button.svelte';
  import { PRINT_CONTAINER_WIDTH } from '../lib/constants.js';

  let { onSettingsClick } = $props();
</script>

<header class="print:hidden" style="width: {PRINT_CONTAINER_WIDTH}px;">
  <div class="flex items-center justify-between py-4">
    <h1 class="text-grey-110 font-gilda text-[32px] leading-none m-0">
      MERINI
    </h1>
    <Button
      variant="secondary"
      size="medium"
      onclick={onSettingsClick}
      ariaLabel="Open settings"
    >
      Settings
    </Button>
  </div>
</header>

