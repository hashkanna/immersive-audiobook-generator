import fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractTextFromPDFWithPdfjs(pdfPath) {
  try {
    const data = await fs.readFile(pdfPath);
    const typedArray = new Uint8Array(data);
    
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useSystemFonts: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = '';
    
    console.log(`PDF has ${numPages} pages`);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      console.log(`Extracted page ${pageNum}: ${pageText.substring(0, 100)}...`);
    }
    
    return {
      text: fullText.trim(),
      numpages: numPages,
      info: pdfDocument.documentInfo || {}
    };
  } catch (error) {
    console.error('Error extracting PDF with pdfjs:', error);
    throw error;
  }
}