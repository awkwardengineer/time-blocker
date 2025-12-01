import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { join } from 'path';

test.describe('PDF Generation', () => {
  test('should generate PDF with exactly one page (no overflow to page 2)', async ({ page }, testInfo) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Generate PDF using Playwright's PDF generation
    // Using landscape orientation and no margins to match the print CSS
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      landscape: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      printBackground: true,
    });
    
    // Save PDF to file system for inspection
    // This will be saved in the test output directory
    const pdfPath = testInfo.outputPath('generated-pdf.pdf');
    // Convert Buffer to Uint8Array for type compatibility
    const pdfBytes = new Uint8Array(pdfBuffer);
    writeFileSync(pdfPath, pdfBytes);
    console.log(`PDF saved to: ${pdfPath}`);
    
    // Parse the PDF to get page count
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    // Verify the PDF has exactly one page
    expect(pageCount).toBe(1);
  });
});

