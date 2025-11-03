import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, FileText, Brain, Search, BarChart3 } from 'lucide-react';
import { processDocument, ProcessedDocument } from '@/lib/document-processor';
import { extractAllMetrics, MetricExtraction } from '@/lib/ai-processor';

interface ProcessingDashboardProps {
  files: File[];
  onComplete: (extractions: MetricExtraction[], processingTime: number, totalChunks: number) => void;
  onBack: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  icon: React.ReactNode;
  details?: string;
}

const ProcessingDashboard: React.FC<ProcessingDashboardProps> = ({ files, onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [currentMetric, setCurrentMetric] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);

  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'parse',
      label: 'Parsing Documents',
      status: 'processing',
      progress: 0,
      icon: <FileText className="w-5 h-5" />,
      details: 'Extracting text from uploaded files...'
    },
    {
      id: 'embedding',
      label: 'Generating Embeddings',
      status: 'pending',
      progress: 0,
      icon: <Brain className="w-5 h-5" />,
      details: 'Creating AI-readable document representations...'
    },
    {
      id: 'extraction',
      label: 'Extracting Metrics',
      status: 'pending',
      progress: 0,
      icon: <Search className="w-5 h-5" />,
      details: 'Finding ESRS/CSRD metrics in your documents...'
    },
    {
      id: 'analysis',
      label: 'Finalizing Analysis',
      status: 'pending',
      progress: 0,
      icon: <BarChart3 className="w-5 h-5" />,
      details: 'Preparing results and evidence citations...'
    }
  ]);

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], progress: number = 0, details?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, progress, details: details || step.details }
        : step
    ));
  };

  const updateOverallProgress = () => {
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const currentStepProgress = steps[currentStep]?.progress || 0;
    
    const overall = ((completedSteps * 100) + currentStepProgress) / totalSteps;
    setOverallProgress(Math.min(overall, 100));
  };

  useEffect(() => {
    updateOverallProgress();
  }, [steps, currentStep]);

  useEffect(() => {
    processFiles();
  }, []);

  const processFiles = async () => {
    const startTime = Date.now();

    try {
      // Step 1: Parse Documents
      setCurrentStep(0);
      updateStepStatus('parse', 'processing', 0, `Processing ${files.length} files...`);

      const documents: ProcessedDocument[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        updateStepStatus('parse', 'processing', ((i + 1) / files.length) * 100, `Processing ${file.name}...`);
        
        try {
          const doc = await processDocument(file);
          documents.push(doc);
          console.log(`Successfully processed: ${file.name}`);
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          updateStepStatus('parse', 'error', ((i + 1) / files.length) * 100, 
            `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue processing other files instead of stopping
        }
      }

      setProcessedDocuments(documents);
      updateStepStatus('parse', 'completed', 100, `Successfully processed ${documents.length} documents`);

      if (documents.length === 0) {
        throw new Error('No documents were successfully processed');
      }

      // Collect all chunks
      const allChunks = documents.flatMap(doc => doc.chunks);
      
      // Step 2 & 3: Extract metrics (includes embedding generation)
      setCurrentStep(1);
      updateStepStatus('embedding', 'processing', 0, 'Initializing AI models...');

      const extractions = await extractAllMetrics(
        allChunks,
        (metric, progress) => {
          setCurrentMetric(metric);
          
          if (metric === 'Generating embeddings') {
            updateStepStatus('embedding', 'processing', progress, `Processing embeddings: ${progress.toFixed(0)}%`);
          } else {
            if (steps[1].status !== 'completed') {
              updateStepStatus('embedding', 'completed', 100, 'Embeddings generated successfully');
              setCurrentStep(2);
            }
            updateStepStatus('extraction', 'processing', progress, `Extracting: ${metric}`);
          }
        }
      );

      updateStepStatus('extraction', 'completed', 100, `Extracted ${extractions.extractions.length} metrics`);

      // Step 4: Finalize
      setCurrentStep(3);
      updateStepStatus('analysis', 'processing', 50, 'Preparing results...');
      
      // Brief delay to show the final step
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateStepStatus('analysis', 'completed', 100, 'Analysis complete!');
      setOverallProgress(100);

      const processingTime = Date.now() - startTime;
      
      // Complete processing
      setTimeout(() => {
        setIsProcessing(false);
        onComplete(extractions.extractions, processingTime, allChunks.length);
      }, 1500);

    } catch (error) {
      console.error('Processing failed:', error);
      const failedStepId = steps[currentStep]?.id || 'parse';
      updateStepStatus(failedStepId, 'error', 0, error instanceof Error ? error.message : 'Processing failed');
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-accent" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-muted" />;
    }
  };

  const getStepBadge = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Processing Your Documents
          </h1>
          <p className="text-muted-foreground">
            AI is analyzing your documents to extract ESRS/CSRD sustainability metrics
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 border-0 shadow-lg bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Progress</span>
              <span className="text-2xl font-bold text-primary">{overallProgress.toFixed(0)}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-3 mb-4" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{files.length} files uploaded</span>
              <span>{processedDocuments.length} documents processed</span>
            </div>
          </CardContent>
        </Card>

        {/* Processing Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <Card 
              key={step.id} 
              className={`border-0 shadow-lg transition-all duration-300 ${
                step.status === 'processing' ? 'shadow-primary bg-primary/5' : 'bg-gradient-card'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step)}
                    <h3 className="font-semibold">{step.label}</h3>
                  </div>
                  {getStepBadge(step)}
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {step.details}
                </p>

                {step.status === 'processing' && (
                  <div className="space-y-2">
                    <Progress value={step.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{step.progress.toFixed(0)}% complete</span>
                      {currentMetric && step.id === 'extraction' && (
                        <span className="text-primary">{currentMetric}</span>
                      )}
                    </div>
                  </div>
                )}

                {step.status === 'completed' && step.progress > 0 && (
                  <Progress value={100} className="h-2" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center">
          {!isProcessing && steps.every(s => s.status === 'completed') ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-accent mb-2">Processing Complete!</h2>
              <p className="text-muted-foreground mb-4">
                Your sustainability metrics have been extracted and are ready for review.
              </p>
            </div>
          ) : !isProcessing ? (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-destructive mb-2">Processing Failed</h2>
              <p className="text-muted-foreground mb-4">
                There was an error processing your documents. Please try again.
              </p>
              <Button onClick={onBack} variant="outline">
                Back to Upload
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProcessingDashboard;