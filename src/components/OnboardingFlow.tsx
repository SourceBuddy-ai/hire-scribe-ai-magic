import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Upload, 
  Brain, 
  Target, 
  CheckCircle,
  ArrowRight,
  Star,
  Zap
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
  completed: boolean;
}

export const OnboardingFlow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to RecruiterLab',
      description: 'Let\'s get you started with AI-powered interview analysis',
      icon: Sparkles,
      completed: false
    },
    {
      id: 'upload',
      title: 'Upload Your First Interview',
      description: 'Upload a transcript or audio file to get started',
      icon: Upload,
      completed: false
    },
    {
      id: 'processing',
      title: 'AI Analysis',
      description: 'Watch as our AI analyzes your interview',
      icon: Brain,
      completed: false
    },
    {
      id: 'results',
      title: 'View Results',
      description: 'Explore your structured insights and recommendations',
      icon: Target,
      completed: false
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start analyzing more interviews and improve your hiring process',
      icon: CheckCircle,
      completed: false
    }
  ]);

  const checkOnboardingStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Check if user has completed interviews
      const { data: interviews } = await supabase
        .from('interviews')
        .select('status')
        .eq('user_id', user.id);

      const hasCompletedInterviews = interviews?.some(i => i.status === 'completed');
      
      if (hasCompletedInterviews) {
        setSteps(prev => prev.map(step => ({ ...step, completed: true })));
        setCurrentStep(4); // Go to completion
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user, checkOnboardingStatus]);

  const markStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(step => step.completed).length;
    return (completedSteps / steps.length) * 100;
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Getting Started</h1>
          </div>
          <Progress value={getProgressPercentage()} className="h-2 mb-4" />
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Current Step Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <currentStepData.icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            <p className="text-muted-foreground">{currentStepData.description}</p>
          </CardHeader>
          <CardContent>
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Upload</h3>
                    <p className="text-sm text-muted-foreground">Upload interview files</p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Analyze</h3>
                    <p className="text-sm text-muted-foreground">AI-powered insights</p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Improve</h3>
                    <p className="text-sm text-muted-foreground">Better hiring decisions</p>
                  </div>
                </div>
                <Button 
                  onClick={() => markStepComplete('welcome')} 
                  className="w-full"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">What you can upload:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Text files (.txt) with interview transcripts</li>
                    <li>• Audio files (.mp3, .wav, .m4a) for automatic transcription</li>
                    <li>• Video files with audio for transcription</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => markStepComplete('upload')} 
                  className="w-full"
                >
                  Continue to Upload
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Our AI will analyze:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Key skills and qualifications mentioned</li>
                    <li>• Potential concerns or red flags</li>
                    <li>• Job description improvements</li>
                    <li>• Follow-up email recommendations</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => markStepComplete('processing')} 
                  className="w-full"
                >
                  Continue to Analysis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">You'll get structured insights:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Job summary and key requirements</li>
                    <li>• Top 5 must-have skills</li>
                    <li>• Potential challenges and concerns</li>
                    <li>• Improved job description draft</li>
                    <li>• Professional follow-up email</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => markStepComplete('results')} 
                  className="w-full"
                >
                  View Sample Results
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Congratulations!</h3>
                <p className="text-muted-foreground">
                  You're ready to start analyzing interviews with AI-powered insights.
                </p>
                <div className="flex gap-2 justify-center">
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                  <Badge variant="secondary">
                    <Zap className="h-3 w-3 mr-1" />
                    Fast Analysis
                  </Badge>
                  <Badge variant="secondary">
                    <Target className="h-3 w-3 mr-1" />
                    Actionable Insights
                  </Badge>
                </div>
                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step Indicators */}
        <div className="flex justify-center space-x-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`w-3 h-3 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 