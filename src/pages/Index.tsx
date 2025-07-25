import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUpload } from '@/components/FileUpload';
import { ProcessingState } from '@/components/ProcessingState';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Zap, ArrowRight } from 'lucide-react';

interface ProcessingResults {
  jobSummary: string;
  mustHaves: string[];
  challenges: string;
  jobDescription: string;
  recapEmail: string;
}

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai-api-key') || '');
  const [hasApiKey, setHasApiKey] = useState(() => !!localStorage.getItem('openai-api-key'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResults | null>(null);
  const [currentFilename, setCurrentFilename] = useState('');
  const { toast } = useToast();

  const saveApiKey = () => {
    localStorage.setItem('openai-api-key', apiKey);
    setHasApiKey(true);
    toast({
      title: "API Key Saved",
      description: "Your OpenAI API key has been saved locally.",
    });
  };

  const processTranscript = async (content: string, filename: string) => {
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentFilename(filename);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert recruiter assistant. Analyze hiring manager sync call transcripts and extract structured information. 

Response format must be valid JSON with exactly these fields:
{
  "jobSummary": "Brief 2-3 sentence overview of the role",
  "mustHaves": ["requirement1", "requirement2", "requirement3", "requirement4", "requirement5"],
  "challenges": "Key challenges, concerns, or pain points mentioned",
  "jobDescription": "Complete job description ready for posting",
  "recapEmail": "Professional email to hiring manager with meeting recap and next steps"
}

Focus on extracting the most important technical skills, experience requirements, and cultural fit criteria. Make mustHaves specific and actionable.`
            },
            {
              role: 'user',
              content: `Please analyze this hiring manager sync transcript and extract the key information:\n\n${content}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      try {
        const parsedResults = JSON.parse(analysisText);
        setResults(parsedResults);
        toast({
          title: "Analysis Complete",
          description: "Your transcript has been successfully analyzed.",
        });
      } catch (parseError) {
        throw new Error('Failed to parse AI response');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "There was an error processing your transcript.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setResults(null);
    setCurrentFilename('');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 p-2 bg-primary/10 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary">AI-Powered</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Hiring Manager Sync Recorder
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your intake call transcripts into structured hiring insights with AI. 
            Upload your transcript and get organized summaries, requirements, and follow-up materials.
          </p>
        </div>

        {/* API Key Input */}
        {!hasApiKey && (
          <div className="mb-8">
            <ApiKeyInput
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              onSave={saveApiKey}
            />
          </div>
        )}

        {/* Main Content */}
        {results ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Button onClick={resetApp} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Process New Transcript
              </Button>
            </div>
            <ResultsDisplay results={results} filename={currentFilename} />
          </div>
        ) : isProcessing ? (
          <ProcessingState />
        ) : (
          <div className="max-w-2xl mx-auto">
            <FileUpload 
              onFileContent={processTranscript} 
              isProcessing={isProcessing}
            />
            
            {hasApiKey && (
              <div className="mt-6 p-4 bg-accent/50 rounded-lg border">
                <h3 className="font-medium text-foreground mb-2">How it works:</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Export your Otter.ai transcript as a .txt file</li>
                  <li>2. Upload the file using the area above</li>
                  <li>3. AI will extract key hiring insights automatically</li>
                  <li>4. Get structured outputs for job posting and follow-up</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-card rounded-lg p-8 border">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready for More Advanced Features?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Upgrade to RecruiterLab Pro for audio file processing, team collaboration, 
              custom templates, and enterprise-grade privacy controls.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Designed for recruiters and hiring managers to streamline intake processes</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
