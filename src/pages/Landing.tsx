import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Upload, FileText, BarChart3, Shield, Zap } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold text-foreground tracking-tight">RecruiterLab</span>
          </div>
          <div className="flex gap-2">
            <Link to="/auth">
              <Button variant="ghost" className="px-4 py-2">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="px-4 py-2">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent tracking-tight leading-tight">
          AI-Powered Interview Analysis
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
          Transform your hiring process with intelligent interview analysis. Upload transcripts, get instant insights, and make better hiring decisions.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 py-3 shadow-md hover:shadow-lg transition-shadow">Start Analyzing Interviews</Button>
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="shadow-card border border-border bg-white flex flex-col items-center p-8">
          <Upload className="h-8 w-8 text-primary mb-4" />
          <CardTitle className="text-lg font-semibold mb-2">Easy Uploads</CardTitle>
          <CardContent className="text-center text-muted-foreground">Drag and drop your interview transcripts or audio files for instant analysis.</CardContent>
        </Card>
        <Card className="shadow-card border border-border bg-white flex flex-col items-center p-8">
          <FileText className="h-8 w-8 text-blue-500 mb-4" />
          <CardTitle className="text-lg font-semibold mb-2">Structured Insights</CardTitle>
          <CardContent className="text-center text-muted-foreground">Get actionable, structured feedback and summaries from every interview.</CardContent>
        </Card>
        <Card className="shadow-card border border-border bg-white flex flex-col items-center p-8">
          <BarChart3 className="h-8 w-8 text-green-500 mb-4" />
          <CardTitle className="text-lg font-semibold mb-2">Analytics Dashboard</CardTitle>
          <CardContent className="text-center text-muted-foreground">Track your hiring process with beautiful charts and analytics.</CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Ready to Transform Your Hiring?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Join hundreds of recruiters already using RecruiterLab to make better hiring decisions.
            </p>
            <Link to="/auth">
              <Button size="lg">Start Your Free Trial</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 RecruiterLab. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};