import PDFParser from 'pdf2json';
import { promises as fs } from 'fs';

export async function extractTextFromPDFWithPdf2json(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    
    pdfParser.on("pdfParser_dataReady", pdfData => {
      try {
        let fullText = '';
        const pages = pdfData.Pages || [];
        
        console.log(`PDF has ${pages.length} pages`);
        
        pages.forEach((page, pageIndex) => {
          let pageText = '';
          
          if (page.Texts) {
            page.Texts.forEach(text => {
              if (text.R) {
                text.R.forEach(r => {
                  if (r.T) {
                    // Decode URI component to get actual text
                    const decodedText = decodeURIComponent(r.T);
                    pageText += decodedText + ' ';
                  }
                });
              }
            });
          }
          
          fullText += pageText.trim() + '\n\n';
          console.log(`Page ${pageIndex + 1} preview: ${pageText.substring(0, 100)}...`);
        });
        
        resolve({
          text: fullText.trim(),
          numpages: pages.length,
          info: pdfData.Meta || {}
        });
      } catch (error) {
        reject(error);
      }
    });
    
    pdfParser.loadPDF(pdfPath);
  });
}