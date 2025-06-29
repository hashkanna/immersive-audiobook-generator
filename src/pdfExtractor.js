import fs from 'fs/promises';
import pdf from 'pdf-parse-new';

export async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      numpages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
}

export async function saveTextToFile(text, outputPath) {
  try {
    await fs.writeFile(outputPath, text, 'utf-8');
    console.log(`Text saved to ${outputPath}`);
  } catch (error) {
    console.error('Error saving text file:', error);
    throw error;
  }
}