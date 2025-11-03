import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Eye,
  ArrowLeft,
  Filter,
  Calendar,
  Building
} from 'lucide-react';
import { MetricExtraction } from '@/lib/ai-processor';
import { ESRS_METRICS, getMetricById } from '@/lib/esrs-metrics';
import { exportToExcel, exportToJSON } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

interface ResultsDashboardProps {
  extractions: MetricExtraction[];
  processingTime: number;
  totalChunks: number;
  onBack: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  extractions, 
  processingTime, 
  totalChunks, 
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEvidence, setSelectedEvidence] = useState<MetricExtraction | null>(null);
  const { toast } = useToast();

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = extractions.filter(e => e.value && e.confidence > 0.3).length;
    const gaps = extractions.filter(e => !e.value || e.confidence <= 0.3).length;
    const lowConfidence = extractions.filter(e => e.value && e.confidence > 0.3 && e.confidence < 0.7).length;
    const highConfidence = extractions.filter(e => e.confidence >= 0.7).length;
    const avgConfidence = extractions.reduce((sum, e) => sum + e.confidence, 0) / extractions.length;

    return {
      completed,
      gaps,
      lowConfidence,
      highConfidence,
      avgConfidence,
      completionRate: (completed / extractions.length) * 100
    };
  }, [extractions]);

  // Filter extractions
  const filteredExtractions = useMemo(() => {
    return extractions.filter(extraction => {
      const metric = getMetricById(extraction.metricId);
      if (!metric) return false;

      const matchesSearch = 
        metric.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
        extraction.metricId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = 
        selectedCategory === 'All' || 
        metric.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [extractions, searchTerm, selectedCategory]);

  const handleExportExcel = async () => {
    try {
      const blob = await exportToExcel(extractions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidexia-esrs-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Excel report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleExportJSON = async () => {
    try {
      const jsonData = exportToJSON(extractions);
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidexia-esrs-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "JSON data has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-accent text-accent-foreground">High</Badge>;
    if (confidence >= 0.5) return <Badge variant="secondary">Medium</Badge>;
    if (confidence > 0) return <Badge variant="outline">Low</Badge>;
    return <Badge variant="destructive">Gap</Badge>;
  };

  const getStatusColor = (extraction: MetricExtraction) => {
    if (!extraction.value || extraction.confidence <= 0.3) return 'text-destructive';
    if (extraction.confidence >= 0.7) return 'text-accent';
    return 'text-amber-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                ESRS Analysis Results
              </h1>
              <p className="text-muted-foreground mt-2">
                Processed {totalChunks} document chunks in {(processingTime / 1000).toFixed(1)}s
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleExportJSON} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={handleExportExcel} variant="hero">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-accent">
                  {stats.completionRate.toFixed(0)}%
                </div>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <Progress value={stats.completionRate} className="mt-3" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Extracted Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">
                  {stats.completed}
                </div>
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                out of {extractions.length} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Data Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-destructive">
                  {stats.gaps}
                </div>
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                require attention
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {(stats.avgConfidence * 100).toFixed(0)}%
                </div>
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                extraction reliability
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search metrics by name, ID, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
                <TabsList>
                  <TabsTrigger value="All">All</TabsTrigger>
                  <TabsTrigger value="Environmental">Environmental</TabsTrigger>
                  <TabsTrigger value="Social">Social</TabsTrigger>
                  <TabsTrigger value="Governance">Governance</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Metrics</CardTitle>
            <CardDescription>
              {filteredExtractions.length} of {extractions.length} metrics shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredExtractions.map((extraction) => {
                const metric = getMetricById(extraction.metricId);
                if (!metric) return null;

                return (
                  <div key={extraction.metricId} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {extraction.metricId}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {metric.category}
                          </Badge>
                          {getConfidenceBadge(extraction.confidence)}
                        </div>
                        
                        <h3 className="font-semibold text-sm mb-1">{metric.label}</h3>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className={`font-medium ${getStatusColor(extraction)}`}>
                            {extraction.value ? (
                              `${extraction.value}${extraction.units ? ` ${extraction.units}` : ''}`
                            ) : (
                              'No data found'
                            )}
                          </div>
                          
                          {extraction.confidence > 0 && (
                            <div className="text-muted-foreground">
                              Confidence: {(extraction.confidence * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {extraction.explanation && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {extraction.explanation}
                          </p>
                        )}
                      </div>

                      {extraction.evidenceChunk && (
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Evidence
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                              <SheetTitle>Evidence for {metric.label}</SheetTitle>
                              <SheetDescription>
                                Source: {extraction.evidenceChunk.source}
                                {extraction.evidenceChunk.page && ` • Page ${extraction.evidenceChunk.page}`}
                              </SheetDescription>
                            </SheetHeader>
                            
                            <div className="mt-6">
                              <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed">
                                {extraction.evidenceSpan && (
                                  <div className="mb-4">
                                    <h4 className="font-semibold text-primary mb-2">Extracted Value:</h4>
                                    <div className="bg-primary/10 rounded p-2 font-medium text-primary">
                                      "{extraction.evidenceSpan}"
                                    </div>
                                  </div>
                                )}
                                
                                <h4 className="font-semibold mb-2">Document Context:</h4>
                                <div className="text-muted-foreground">
                                  {extraction.evidenceChunk.text}
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t">
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Confidence: {(extraction.confidence * 100).toFixed(1)}%</div>
                                  <div>Metric ID: {extraction.metricId}</div>
                                  <div>Regulation: {metric.regulation}</div>
                                </div>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredExtractions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No metrics match your current filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsDashboard;