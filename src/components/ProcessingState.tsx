import { Loader2, Brain } from 'lucide-react';

export const ProcessingState = () => {
  return (
    <div className="bg-gradient-card rounded-lg p-8 border shadow-card text-center">
      <div className="space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse-slow">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Processing Transcript
          </h3>
          <p className="text-muted-foreground mb-4">
            AI is analyzing your hiring manager sync and extracting key insights...
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Analyzing with AI</span>
        </div>
        
        <div className="w-full bg-accent rounded-full h-2">
          <div className="bg-gradient-primary h-2 rounded-full animate-pulse" style={{ width: '65%' }}></div>
        </div>
      </div>
    </div>
  );
};