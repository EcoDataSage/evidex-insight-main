// Document Processing Utilities for Evidexia
// Handles client-side parsing of PDF, DOCX, XLSX, CSV, and TXT files

import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Set up PDF.js worker for Vite
// The worker file is copied to public folder during setup so Vite can serve it statically
// This is more reliable than CDN or trying to load from node_modules
if (typeof window !== 'undefined') {
  // Use the worker file from the public folder (served at root)
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log(`PDF.js worker configured: ${pdfjs.GlobalWorkerOptions.workerSrc}`);
  console.log(`Worker version: ${pdfjs.version || '5.4.54'}`);
}

export interface DocumentChunk {
  id: string;
  page?: number;
  startChar?: number;
  endChar?: number;
  text: string;
  source: string; // filename
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sha256: string;
  chunks: DocumentChunk[];
  totalPages?: number;
  totalChars: number;
}

// Text normalization utilities
export const normalizeText = (text: string): string => {
  return text
    // Fix hyphenation across lines
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Normalize common units
    .replace(/(\d+),(\d+)\s*(k|K)\s*(tCO2|CO2|tonnes?)/gi, (match, p1, p2, k, unit) => {
      const value = parseInt(p1) * 1000 + parseInt(p2);
      return `${value} ${unit.toLowerCase() === 'tco2' ? 'tCO2e' : unit}`;
    })
    // Normalize percentages
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1%')
    // Normalize currency
    .replace(/€\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, '€$1')
    .replace(/(\d+(?:,\d+)*(?:\.\d+)?)\s*€/g, '€$1')
    .trim();
};

// Calculate SHA-256 hash of file
export const calculateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Split text into chunks for embedding
export const chunkText = (text: string, maxChars: number = 800, overlap: number = 200): string[] => {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      const paragraphEnd = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(sentenceEnd, paragraphEnd);
      
      if (breakPoint > start + maxChars * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = Math.max(start + 1, end - overlap);
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
};

// PDF Processing
export const processPDF = async (file: File): Promise<ProcessedDocument> => {
  try {
    console.log(`Starting PDF processing for: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF file size: ${arrayBuffer.byteLength} bytes`);
    
    const pdfjsVersion = pdfjs.version || '5.4.54';
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/cmaps/`,
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    const sha256 = await calculateFileHash(file);
    
    const chunks: DocumentChunk[] = [];
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let pageText = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ');
        
        pageText = normalizeText(pageText);
        console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
        
        if (pageText.trim().length > 0) {
          const pageChunks = chunkText(pageText);
          
          pageChunks.forEach((chunkText, index) => {
            chunks.push({
              id: `${sha256}-page-${pageNum}-chunk-${index}`,
              page: pageNum,
              startChar: totalChars,
              endChar: totalChars + chunkText.length,
              text: chunkText,
              source: file.name
            });
            totalChars += chunkText.length;
          });
        }
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with other pages instead of failing completely
      }
    }

    console.log(`PDF processing completed. Total chunks: ${chunks.length}, Total chars: ${totalChars}`);

    if (chunks.length === 0) {
      throw new Error(`No text could be extracted from PDF: ${file.name}. The PDF might be image-based or corrupted.`);
    }

    return {
      id: sha256,
      filename: file.name,
      mimeType: file.type,
      sha256,
      chunks,
      totalPages: pdf.numPages,
      totalChars
    };
  } catch (error) {
    console.error(`PDF processing failed for ${file.name}:`, error);
    throw new Error(`Failed to process PDF ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// DOCX Processing
export const processDOCX = async (file: File): Promise<ProcessedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const sha256 = await calculateFileHash(file);
  
  const normalizedText = normalizeText(result.value);
  const textChunks = chunkText(normalizedText);
  
  const chunks: DocumentChunk[] = textChunks.map((chunkText, index) => ({
    id: `${sha256}-chunk-${index}`,
    startChar: index * 600, // Approximate
    endChar: (index + 1) * 600,
    text: chunkText,
    source: file.name
  }));

  return {
    id: sha256,
    filename: file.name,
    mimeType: file.type,
    sha256,
    chunks,
    totalChars: normalizedText.length
  };
};

// XLSX Processing
export const processXLSX = async (file: File): Promise<ProcessedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sha256 = await calculateFileHash(file);
  
  const chunks: DocumentChunk[] = [];
  let totalChars = 0;

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    if (csvData.trim().length > 0) {
      const normalizedText = normalizeText(`Sheet: ${sheetName}\n${csvData}`);
      const sheetChunks = chunkText(normalizedText);
      
      sheetChunks.forEach((chunkText, index) => {
        chunks.push({
          id: `${sha256}-sheet-${sheetIndex}-chunk-${index}`,
          page: sheetIndex + 1,
          startChar: totalChars,
          endChar: totalChars + chunkText.length,
          text: chunkText,
          source: file.name
        });
        totalChars += chunkText.length;
      });
    }
  });

  return {
    id: sha256,
    filename: file.name,
    mimeType: file.type,
    sha256,
    chunks,
    totalPages: workbook.SheetNames.length,
    totalChars
  };
};

// CSV Processing
export const processCSV = async (file: File): Promise<ProcessedDocument> => {
  const text = await file.text();
  const sha256 = await calculateFileHash(file);
  
  const normalizedText = normalizeText(text);
  const textChunks = chunkText(normalizedText);
  
  const chunks: DocumentChunk[] = textChunks.map((chunkText, index) => ({
    id: `${sha256}-chunk-${index}`,
    startChar: index * 600, // Approximate
    endChar: (index + 1) * 600,
    text: chunkText,
    source: file.name
  }));

  return {
    id: sha256,
    filename: file.name,
    mimeType: file.type,
    sha256,
    chunks,
    totalChars: normalizedText.length
  };
};

// TXT Processing
export const processTXT = async (file: File): Promise<ProcessedDocument> => {
  const text = await file.text();
  const sha256 = await calculateFileHash(file);
  
  const normalizedText = normalizeText(text);
  const textChunks = chunkText(normalizedText);
  
  const chunks: DocumentChunk[] = textChunks.map((chunkText, index) => ({
    id: `${sha256}-chunk-${index}`,
    startChar: index * 600, // Approximate
    endChar: (index + 1) * 600,
    text: chunkText,
    source: file.name
  }));

  return {
    id: sha256,
    filename: file.name,
    mimeType: file.type,
    sha256,
    chunks,
    totalChars: normalizedText.length
  };
};

// Main processing function
export const processDocument = async (file: File): Promise<ProcessedDocument> => {
  console.log(`Processing document: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
  
  const mimeType = file.type.toLowerCase();
  const extension = file.name.toLowerCase().split('.').pop();
  
  try {
    // Handle file type detection by both MIME type and extension
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return await processPDF(file);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
      return await processDOCX(file);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || extension === 'xlsx') {
      return await processXLSX(file);
    } else if (mimeType === 'text/csv' || extension === 'csv') {
      return await processCSV(file);
    } else if (mimeType === 'text/plain' || extension === 'txt') {
      return await processTXT(file);
    } else {
      throw new Error(`Unsupported file type: ${mimeType} (${extension}). Supported formats: PDF, DOCX, XLSX, CSV, TXT`);
    }
  } catch (error) {
    console.error(`Document processing failed for ${file.name}:`, error);
    throw error; // Re-throw to be handled by the calling code
  }
};