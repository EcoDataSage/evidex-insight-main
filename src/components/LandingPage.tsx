import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Zap, CheckCircle, BarChart3, Shield, Clock } from 'lucide-react';

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Evidexia</h1>
              <p className="text-xs text-muted-foreground">Evidence-linked sustainability reporting</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
            Free • No Sign-up Required
          </Badge>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <Badge variant="outline" className="mb-4 bg-primary/5 text-primary border-primary/20">
              🚀 AI-Powered ESRS/CSRD Compliance
            </Badge>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Evidence-linked sustainability reporting in minutes
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload your company documents and let AI extract 30+ ESRS/CSRD metrics with 
              evidence citations and confidence scores. Export to Excel or JSON instantly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={onGetStarted}
              variant="hero"
              className="text-lg px-8 py-6"
            >
              <FileText className="w-5 h-5 mr-2" />
              Start Analysis
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-primary/20 hover:bg-primary/5"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2 text-accent" />
              100% Client-side Processing
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-accent" />
              No Account Required
            </div>
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2 text-accent" />
              Instant Results
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Evidexia?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for sustainability professionals who need accurate, auditable ESRS compliance reporting
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-gradient-card hover:shadow-primary transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Multi-format Support</CardTitle>
                <CardDescription>
                  Upload PDF, DOCX, XLSX, CSV, and TXT files. Our AI understands your data regardless of format.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-card hover:shadow-accent transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Evidence Citations</CardTitle>
                <CardDescription>
                  Every metric includes exact page references and confidence scores for complete audit trails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-card hover:shadow-primary transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Instant Export</CardTitle>
                <CardDescription>
                  Download Excel spreadsheets or JSON files ready for your reporting systems and auditors.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Supported Metrics */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-8">30+ ESRS Metrics Covered</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'GHG Emissions (E1)', 'Water Consumption (E3)', 'Waste Generation (E5)', 
              'Energy Usage (E1)', 'Biodiversity Impact (E4)', 'Gender Diversity (S1)',
              'Employee Count (S1)', 'Training Hours (S1)', 'Health & Safety (S1)',
              'Data Protection (G1)', 'Ethics & Compliance (G1)', 'Board Composition (G1)'
            ].map((metric, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-muted text-muted-foreground py-2 px-3 text-sm"
              >
                {metric}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/10 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">Evidexia</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for sustainability professionals. All processing happens in your browser.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;