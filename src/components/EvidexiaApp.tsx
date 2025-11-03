import React, { useState } from 'react';
import LandingPage from './LandingPage';
import DocumentUpload from './DocumentUpload';
import ProcessingDashboard from './ProcessingDashboard';
import ResultsDashboard from './ResultsDashboard';
import { MetricExtraction } from '@/lib/ai-processor';

type AppState = 'landing' | 'upload' | 'processing' | 'results';

interface DocumentFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedText?: string;
  sha256?: string;
}

const EvidexiaApp: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingResults, setProcessingResults] = useState<{
    extractions: MetricExtraction[];
    processingTime: number;
    totalChunks: number;
  } | null>(null);

  const handleGetStarted = () => {
    setCurrentState('upload');
  };

  const handleDocumentsProcessed = (documents: DocumentFile[]) => {
    // Extract the actual File objects from processed documents
    const files = documents
      .filter(doc => doc.status === 'completed')
      .map(doc => doc.file);
    
    setUploadedFiles(files);
    setCurrentState('processing');
  };

  const handleProcessingComplete = (
    extractions: MetricExtraction[], 
    processingTime: number, 
    totalChunks: number
  ) => {
    setProcessingResults({ extractions, processingTime, totalChunks });
    setCurrentState('results');
  };

  const handleBackToLanding = () => {
    setCurrentState('landing');
    setUploadedFiles([]);
    setProcessingResults(null);
  };

  const handleBackToUpload = () => {
    setCurrentState('upload');
    setProcessingResults(null);
  };

  const handleBackToProcessing = () => {
    setCurrentState('processing');
  };

  switch (currentState) {
    case 'landing':
      return <LandingPage onGetStarted={handleGetStarted} />;
    
    case 'upload':
      return (
        <DocumentUpload 
          onDocumentsProcessed={handleDocumentsProcessed}
          onBack={handleBackToLanding}
        />
      );
    
    case 'processing':
      return (
        <ProcessingDashboard
          files={uploadedFiles}
          onComplete={handleProcessingComplete}
          onBack={handleBackToUpload}
        />
      );
    
    case 'results':
      return processingResults ? (
        <ResultsDashboard
          extractions={processingResults.extractions}
          processingTime={processingResults.processingTime}
          totalChunks={processingResults.totalChunks}
          onBack={handleBackToUpload}
        />
      ) : null;
    
    default:
      return <LandingPage onGetStarted={handleGetStarted} />;
  }
};

export default EvidexiaApp;