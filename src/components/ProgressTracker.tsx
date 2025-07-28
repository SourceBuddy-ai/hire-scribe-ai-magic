import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Brain, 
  Target, 
  CheckCircle, 
  Clock,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number;
  progress?: number;
}

interface ProgressTrackerProps {
  interviewId?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export const ProgressTracker = ({ 
  interviewId, 
  onComplete, 
  onError 
}: ProgressTrackerProps) => {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ProgressStep[]>([
    {
      id: 'upload',
      title: 'Uploading File',
      description: 'Uploading your interview file to our secure servers',
      icon: Upload,
      status: 'pending',
      duration: 3000
    },
    {
      id: 'transcribe',
      title: 'Transcribing Audio',
      description: 'Converting audio to text using advanced speech recognition',
      icon: Brain,
      status: 'pending',
      duration: 8000
    },
    {
      id: 'analyze',
      title: 'AI Analysis',
      description: 'Analyzing interview content for key insights and patterns',
      icon: Target,
      status: 'pending',
      duration: 12000
    },
    {
      id: 'complete',
      title: 'Generating Report',
      description: 'Creating your structured analysis report',
      icon: CheckCircle,
      status: 'pending',
      duration: 3000
    }
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const startProgress = useCallback(() => {
    let stepIndex = 0;
    let totalProgress = 0;

    const processStep = () => {
      if (stepIndex >= steps.length) {
        // All steps completed
        setOverallProgress(100);
        onComplete?.();
        return;
      }

      const currentStep = steps[stepIndex];
      setCurrentStepIndex(stepIndex);
      
      // Update step status
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === stepIndex ? 'active' : 
                index < stepIndex ? 'completed' : 'pending'
      })));

      // Simulate step progress
      const stepDuration = currentStep.duration || 5000;
      const progressInterval = 100; // Update every 100ms
      const progressIncrement = (progressInterval / stepDuration) * 100;
      
      let stepProgress = 0;
      const progressTimer = setInterval(() => {
        stepProgress += progressIncrement;
        if (stepProgress >= 100) {
          stepProgress = 100;
          clearInterval(progressTimer);
          
          // Mark step as completed
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index === stepIndex ? 'completed' : step.status
          })));

          // Move to next step
          stepIndex++;
          totalProgress += (100 / steps.length);
          setOverallProgress(totalProgress);
          
          setTimeout(processStep, 500); // Small delay between steps
        } else {
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            progress: index === stepIndex ? stepProgress : step.progress
          })));
        }
      }, progressInterval);

      // Update estimated time
      const remainingSteps = steps.length - stepIndex;
      const remainingTime = remainingSteps * 5; // Average 5 seconds per step
      setEstimatedTime(remainingTime);

    };

    processStep();
  }, [steps.length, onComplete]);

  useEffect(() => {
    if (interviewId) {
      startProgress();
    }
  }, [interviewId, startProgress]);

  const getStepIcon = (step: ProgressStep) => {
    const Icon = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'active':
        return <Icon className="h-6 w-6 text-primary animate-pulse" />;
      case 'error':
        return <Icon className="h-6 w-6 text-red-600" />;
      default:
        return <Icon className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Processing Your Interview
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {estimatedTime > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Estimated time remaining: {formatTime(estimatedTime)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              step.status === 'active' ? 'bg-primary/10 border border-primary/20' :
              step.status === 'completed' ? 'bg-green-50 border border-green-200' :
              'bg-muted/50'
            }`}
          >
            <div className="flex-shrink-0">
              {getStepIcon(step)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{step.title}</h4>
                {step.status === 'active' && step.progress !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(step.progress)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>
              {step.status === 'active' && step.progress !== undefined && (
                <Progress value={step.progress} className="h-1 mt-2" />
              )}
            </div>
            <div className="flex-shrink-0">
              <Badge
                variant={
                  step.status === 'completed' ? 'default' :
                  step.status === 'active' ? 'secondary' :
                  'outline'
                }
                className="text-xs"
              >
                {step.status === 'completed' ? 'Done' :
                 step.status === 'active' ? 'Processing' :
                 'Pending'}
              </Badge>
            </div>
          </div>
        ))}

        {/* Tips Section */}
        {currentStepIndex < steps.length && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-sm text-blue-900 mb-2 flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Pro Tip
            </h4>
            <p className="text-xs text-blue-700">
              {currentStepIndex === 0 && "Your file is being securely uploaded to our servers."}
              {currentStepIndex === 1 && "Our AI is converting speech to text with high accuracy."}
              {currentStepIndex === 2 && "We're analyzing patterns and extracting key insights."}
              {currentStepIndex === 3 && "Almost done! Your report is being generated."}
            </p>
          </div>
        )}

        {/* Completion Message */}
        {overallProgress === 100 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-green-900">Analysis Complete!</h4>
            <p className="text-sm text-green-700 mt-1">
              Your interview has been successfully analyzed. View your results below.
            </p>
            <Button className="mt-3" onClick={() => onComplete?.()}>
              View Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 