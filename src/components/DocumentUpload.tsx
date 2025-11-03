import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedText?: string;
  sha256?: string;
}

interface DocumentUploadProps {
  onDocumentsProcessed: (documents: DocumentFile[]) => void;
  onBack: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentsProcessed, onBack }) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt']
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newDocuments: DocumentFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
    
    toast({
      title: "Files added",
      description: `${acceptedFiles.length} file(s) ready for processing`,
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: 50 * 1024 * 1024, // 50MB limit
    multiple: true
  });

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const processDocuments = async () => {
    if (documents.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload some documents first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const completedDocs: DocumentFile[] = [];
      
      // Process each document
      for (const doc of documents) {
        setDocuments(prev => 
          prev.map(d => d.id === doc.id ? { ...d, status: 'processing', progress: 10 } : d)
        );

        try {
          // Simulate file processing (in real implementation, this would use the parsing libraries)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Calculate SHA256 hash
          const buffer = await doc.file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const sha256 = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Simulate text extraction progress
          for (let progress = 20; progress <= 80; progress += 20) {
            setDocuments(prev => 
              prev.map(d => d.id === doc.id ? { ...d, progress } : d)
            );
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Simulate extracted text (in real implementation, this would use pdfjs/mammoth/xlsx)
          const extractedText = `Sample extracted text from ${doc.file.name}. This would contain the actual document content in a real implementation.`;

          const completedDoc: DocumentFile = {
            ...doc,
            status: 'completed',
            progress: 100,
            extractedText,
            sha256
          };

          setDocuments(prev => 
            prev.map(d => d.id === doc.id ? completedDoc : d)
          );

          completedDocs.push(completedDoc);

        } catch (error) {
          setDocuments(prev => 
            prev.map(d => d.id === doc.id ? { 
              ...d, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Processing failed'
            } : d)
          );
        }
      }

      if (completedDocs.length > 0) {
        onDocumentsProcessed(completedDocs);
        toast({
          title: "Processing complete",
          description: `${completedDocs.length} document(s) processed successfully`,
        });
      }

    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: DocumentFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: DocumentFile['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            ← Back to Home
          </Button>
          <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload your sustainability reports, financial statements, and other company documents for AI analysis.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8 border-dashed border-2 border-primary/20 bg-gradient-card">
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={`text-center cursor-pointer transition-all duration-300 ${
                isDragActive ? 'bg-primary/5 border-primary scale-105' : ''
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </h3>
              <p className="text-muted-foreground mb-4">
                or click to browse your computer
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {Object.keys(acceptedTypes).map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.split('/')[1].toUpperCase()}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 50MB per file
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        {documents.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                {documents.length} document(s) • Ready for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex-shrink-0">
                    {getStatusIcon(doc.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {doc.status === 'processing' && (
                      <div className="mt-2">
                        <Progress value={doc.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Processing... {doc.progress}%
                        </p>
                      </div>
                    )}
                    {doc.error && (
                      <p className="text-xs text-destructive mt-1">{doc.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(doc.status)} className="text-xs">
                      {doc.status}
                    </Badge>
                    {doc.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {documents.length > 0 && (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={processDocuments}
              disabled={isProcessing}
              variant="hero"
              className="px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Documents...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Process Documents
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;