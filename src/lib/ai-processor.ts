// AI Processing using Transformers.js
// Handles client-side embeddings and question-answering for metric extraction

import { pipeline } from '@huggingface/transformers';
import { ESRSMetric, ESRS_METRICS } from './esrs-metrics';
import { DocumentChunk } from './document-processor';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  chunkId: string;
}

export interface MetricExtraction {
  metricId: string;
  value?: string;
  units?: string;
  confidence: number;
  evidenceChunk?: DocumentChunk;
  evidenceSpan?: string;
  isModelled: boolean;
  explanation?: string;
}

export interface ExtractionResult {
  extractions: MetricExtraction[];
  processingTime: number;
  totalChunks: number;
}

// AI Model Manager
class AIModelManager {
  private embeddingModel: any = null;
  private qaModel: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize embedding model (MiniLM for 384-dimensional embeddings)
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          device: 'wasm',
          dtype: 'fp32'
        }
      );

      // Initialize QA model for metric extraction
      this.qaModel = await pipeline(
        'question-answering',
        'Xenova/distilbert-base-uncased-distilled-squad',
        { 
          device: 'wasm',
          dtype: 'fp32'
        }
      );

      this.isInitialized = true;
      console.log('✅ AI models initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI models:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model not initialized');
    }

    const result = await this.embeddingModel(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  async extractAnswer(question: string, context: string): Promise<{
    answer: string;
    confidence: number;
    start: number;
    end: number;
  }> {
    if (!this.qaModel) {
      throw new Error('QA model not initialized');
    }

    const result = await this.qaModel(question, context);
    
    // Handle both single result and array result formats
    const qaResult = Array.isArray(result) ? result[0] : result;
    
    return {
      answer: qaResult.answer || qaResult.text || '',
      confidence: qaResult.score || qaResult.confidence || 0,
      start: qaResult.start || 0,
      end: qaResult.end || 0
    };
  }
}

// Global model manager instance
export const aiModelManager = new AIModelManager();

// Generate embeddings for document chunks
export const generateChunkEmbeddings = async (
  chunks: DocumentChunk[],
  onProgress?: (progress: number) => void
): Promise<EmbeddingResult[]> => {
  await aiModelManager.initialize();

  const results: EmbeddingResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const embedding = await aiModelManager.generateEmbedding(chunk.text);
      
      results.push({
        embedding,
        text: chunk.text,
        chunkId: chunk.id
      });

      if (onProgress) {
        onProgress((i + 1) / chunks.length * 100);
      }
    } catch (error) {
      console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
    }
  }

  return results;
};

// Calculate cosine similarity between embeddings
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Find most relevant chunks for a metric
export const findRelevantChunks = async (
  metric: ESRSMetric,
  chunkEmbeddings: EmbeddingResult[],
  topK: number = 5
): Promise<EmbeddingResult[]> => {
  await aiModelManager.initialize();

  // Create a search query combining metric label and keywords
  const searchQuery = `${metric.label} ${metric.keywords.join(' ')} ${metric.description}`;
  const queryEmbedding = await aiModelManager.generateEmbedding(searchQuery);

  // Calculate similarities and sort
  const similarities = chunkEmbeddings.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, topK);
};

// Extract metric value from relevant chunks using QA
export const extractMetricValue = async (
  metric: ESRSMetric,
  relevantChunks: EmbeddingResult[],
  documentChunks: DocumentChunk[]
): Promise<MetricExtraction> => {
  await aiModelManager.initialize();

  // Create context from relevant chunks
  const context = relevantChunks
    .map(chunk => chunk.text)
    .join('\n\n');

  if (context.trim().length === 0) {
    return {
      metricId: metric.id,
      confidence: 0,
      isModelled: false,
      explanation: 'No relevant context found'
    };
  }

  // Generate question for the metric
  const question = generateQuestionForMetric(metric);

  try {
    const qaResult = await aiModelManager.extractAnswer(question, context);
    
    // Parse the answer to extract value and units
    const { value, units } = parseMetricAnswer(qaResult.answer, metric);
    
    // Find the source chunk for evidence
    const evidenceChunk = findEvidenceChunk(qaResult.answer, documentChunks, relevantChunks);
    
    return {
      metricId: metric.id,
      value,
      units,
      confidence: qaResult.confidence,
      evidenceChunk,
      evidenceSpan: qaResult.answer,
      isModelled: false,
      explanation: `Extracted from context with ${(qaResult.confidence * 100).toFixed(1)}% confidence`
    };
  } catch (error) {
    console.error(`Failed to extract metric ${metric.id}:`, error);
    
    return {
      metricId: metric.id,
      confidence: 0,
      isModelled: false,
      explanation: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Generate appropriate question for a metric
const generateQuestionForMetric = (metric: ESRSMetric): string => {
  const baseQuestions: Record<string, string> = {
    'E1-1': 'What is the total Scope 1 GHG emissions in tCO2e?',
    'E1-2': 'What is the total Scope 2 GHG emissions in tCO2e?',
    'E1-3': 'What is the total Scope 3 GHG emissions in tCO2e?',
    'E1-4': 'What is the total energy consumption in MWh?',
    'E1-5': 'What percentage of energy comes from renewable sources?',
    'E3-1': 'What is the total water consumption in cubic meters?',
    'E5-1': 'What is the total waste generated in tonnes?',
    'S1-1': 'How many employees does the company have?',
    'S1-2': 'What percentage of employees are female?',
    'S1-4': 'How many workplace injuries occurred?'
  };

  if (baseQuestions[metric.id]) {
    return baseQuestions[metric.id];
  }

  // Generate generic question based on metric properties
  const unit = metric.unit ? ` in ${metric.unit}` : '';
  return `What is the ${metric.label.toLowerCase()}${unit}?`;
};

// Parse the QA answer to extract structured value and units
const parseMetricAnswer = (answer: string, metric: ESRSMetric): { value?: string; units?: string } => {
  // Remove common prefixes and clean the answer
  let cleanAnswer = answer
    .replace(/^(the\s+|total\s+|approximately\s+|about\s+)/i, '')
    .trim();

  // Extract numeric value with units
  const numericMatch = cleanAnswer.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*([a-zA-Z%]+)?/);
  
  if (numericMatch) {
    const value = numericMatch[1].replace(/,/g, ''); // Remove thousands separators
    const units = numericMatch[2] || metric.unit;
    
    return { value, units };
  }

  // If no numeric match, return the raw answer
  return { value: cleanAnswer };
};

// Find the source chunk that contains the evidence
const findEvidenceChunk = (
  answer: string,
  documentChunks: DocumentChunk[],
  relevantChunks: EmbeddingResult[]
): DocumentChunk | undefined => {
  // Find the chunk that contains the answer text
  for (const relevantChunk of relevantChunks) {
    const sourceChunk = documentChunks.find(chunk => chunk.id === relevantChunk.chunkId);
    if (sourceChunk && sourceChunk.text.includes(answer)) {
      return sourceChunk;
    }
  }

  // If exact match not found, return the most relevant chunk
  if (relevantChunks.length > 0) {
    return documentChunks.find(chunk => chunk.id === relevantChunks[0].chunkId);
  }

  return undefined;
};

// Main extraction pipeline
export const extractAllMetrics = async (
  documentChunks: DocumentChunk[],
  onProgress?: (metric: string, progress: number) => void
): Promise<ExtractionResult> => {
  const startTime = Date.now();
  
  // Generate embeddings for all chunks
  console.log('🧠 Generating embeddings for document chunks...');
  const chunkEmbeddings = await generateChunkEmbeddings(
    documentChunks,
    (progress) => onProgress?.('Generating embeddings', progress)
  );

  const extractions: MetricExtraction[] = [];
  
  // Process high-priority metrics first
  const priorityMetrics = ESRS_METRICS
    .filter(m => m.priority <= 2)
    .sort((a, b) => a.priority - b.priority);
  
  console.log(`🎯 Extracting ${priorityMetrics.length} high-priority metrics...`);
  
  for (let i = 0; i < priorityMetrics.length; i++) {
    const metric = priorityMetrics[i];
    
    onProgress?.(metric.label, (i / priorityMetrics.length) * 100);
    
    try {
      // Find relevant chunks for this metric
      const relevantChunks = await findRelevantChunks(metric, chunkEmbeddings, 3);
      
      // Extract the metric value
      const extraction = await extractMetricValue(metric, relevantChunks, documentChunks);
      
      extractions.push(extraction);
      
      console.log(`✅ Extracted ${metric.id}: ${extraction.value} (confidence: ${(extraction.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      console.error(`❌ Failed to extract ${metric.id}:`, error);
      
      extractions.push({
        metricId: metric.id,
        confidence: 0,
        isModelled: false,
        explanation: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  const processingTime = Date.now() - startTime;
  
  console.log(`🎉 Extraction completed in ${(processingTime / 1000).toFixed(1)}s`);
  
  return {
    extractions,
    processingTime,
    totalChunks: documentChunks.length
  };
};