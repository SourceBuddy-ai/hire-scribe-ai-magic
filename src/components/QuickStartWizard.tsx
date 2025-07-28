import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

interface QuickStartWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to RecruiterLab',
    description: 'Let\'s get you started with your first interview analysis',
    icon: Sparkles,
    duration: 2000
  },
  {
    id: 'upload',
    title: 'Upload Your Interview',
    description: 'Drag and drop your interview transcript or audio file',
    icon: Upload,
    duration: 3000
  },
  {
    id: 'processing',
    title: 'AI Analysis',
    description: 'Our AI analyzes the interview and extracts key insights',
    icon: Brain,
    duration: 4000
  },
  {
    id: 'results',
    title: 'Get Results',
    description: 'View structured insights and actionable recommendations',
    icon: Target,
    duration: 2000
  }
];

export const QuickStartWizard = ({ onComplete, onSkip }: QuickStartWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const startWizard = () => {
    setIsActive(true);
    setCurrentStep(0);
    setProgress(0);
    
    // Auto-advance through steps
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index);
        setProgress(((index + 1) / steps.length) * 100);
        
        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsActive(false);
            onComplete();
          }, step.duration);
        }
      }, steps.slice(0, index).reduce((acc, s) => acc + s.duration, 0));
    });
  };

  const skipWizard = () => {
    setIsActive(false);
    onSkip();
  };

  if (!isActive) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={skipWizard} className="flex-1">
              Skip Tutorial
            </Button>
            <Button onClick={startWizard} className="flex-1">
              <Zap className="h-4 w-4 mr-2" />
              Start Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 