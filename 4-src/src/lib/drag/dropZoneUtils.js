/**
 * Drop zone utilities for drag-and-drop visual feedback
 * 
 * Provides functions to apply and remove drop zone styling during drag operations.
 * Uses box-shadow inset instead of border to avoid layout shifts.
 */

/**
 * Apply drop zone styling to an element
 * Uses box-shadow inset to avoid layout shifts (from lessons learned)
 * 
 * @param {HTMLElement} element - The element to style as a drop zone
 */
export function applyDropZoneStyles(element) {
  if (!(element instanceof HTMLElement)) return;
  
  element.style.boxShadow = 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)'; // blue-500 with 40% opacity
  element.style.backgroundColor = 'rgba(107, 143, 217, 0.04)'; // blue-500 with 4% opacity
  element.style.borderRadius = '4px';
  
  // #region agent log
  if (typeof window !== 'undefined' && element.classList.contains('empty-drop-zone')) {
    setTimeout(() => {
      const style = getComputedStyle(element);
      const rootStyle = getComputedStyle(document.documentElement);
      const paddingY = rootStyle.getPropertyValue('--task-item-padding-y');
      const lineHeight = rootStyle.getPropertyValue('--line-height-body');
      const height = style.height;
      const paddingTop = style.paddingTop;
      const paddingBottom = style.paddingBottom;
      const boxSizing = style.boxSizing;
      const total = parseFloat(height) + parseFloat(paddingTop) + parseFloat(paddingBottom);
      const clientHeight = element.clientHeight;
      const offsetHeight = element.offsetHeight;
      fetch('http://127.0.0.1:7242/ingest/6a91a8db-109e-459e-bb3e-5dc44dceea1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dropZoneUtils.js:applyDropZoneStyles',message:'Drop zone visual dimensions when active',data:{height,paddingTop,paddingBottom,boxSizing,total,clientHeight,offsetHeight,paddingY,lineHeight,expectedTotal:parseFloat(paddingY) + parseFloat(lineHeight) + parseFloat(paddingY)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }, 50);
  }
  // #endregion
}

/**
 * Remove drop zone styling from an element
 * 
 * @param {HTMLElement} element - The element to remove drop zone styling from
 */
export function removeDropZoneStyles(element) {
  if (!(element instanceof HTMLElement)) return;
  
  element.style.removeProperty('box-shadow');
  element.style.removeProperty('background-color');
  element.style.removeProperty('border-radius');
}

/**
 * Remove drop zone styling from all elements with drop zone class
 * Useful for cleanup after drag ends
 */
export function clearAllDropZones() {
  if (typeof document === 'undefined') return;
  
  document.querySelectorAll('.keyboard-drop-zone').forEach(el => {
    if (el instanceof HTMLElement) {
      el.classList.remove('keyboard-drop-zone');
      removeDropZoneStyles(el);
    }
  });
}
