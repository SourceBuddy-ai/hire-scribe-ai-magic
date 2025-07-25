import { useState } from 'react';
import { Copy, Check, Download, Mail, FileText, Star, AlertTriangle, Target, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ProcessingResults {
  jobSummary: string;
  mustHaves: string[];
  challenges: string;
  jobDescription: string;
  recapEmail: string;
}

interface ResultsDisplayProps {
  results: ProcessingResults;
  filename: string;
}

export const ResultsDisplay = ({ results, filename }: ResultsDisplayProps) => {
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSections(prev => new Set([...prev, sectionName]));
      toast({
        title: "Copied to clipboard",
        description: `${sectionName} has been copied to your clipboard.`,
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionName);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "There was an error copying to clipboard.",
        variant: "destructive",
      });
    }
  };

  const downloadJSON = () => {
    const jsonData = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "JSON downloaded",
      description: "Analysis data has been exported as JSON.",
    });
  };

  const downloadResults = () => {
    const fullReport = `HIRING MANAGER SYNC REPORT
Generated from: ${filename}
Generated on: ${new Date().toLocaleDateString()}

=====================================
JOB SUMMARY
=====================================
${results.jobSummary}

=====================================
TOP 5 MUST-HAVES
=====================================
${results.mustHaves.map((item, index) => `${index + 1}. ${item}`).join('\n')}

=====================================
CHALLENGES/CONCERNS
=====================================
${results.challenges}

=====================================
JOB DESCRIPTION DRAFT
=====================================
${results.jobDescription}

=====================================
HIRING MANAGER RECAP EMAIL + SCORECARD
=====================================
${results.recapEmail}`;

    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiring-sync-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report downloaded",
      description: "The complete hiring sync report has been downloaded.",
    });
  };

  const SectionCard = ({ 
    title, 
    content, 
    icon: Icon, 
    sectionKey 
  }: { 
    title: string; 
    content: string | string[]; 
    icon: any; 
    sectionKey: string;
  }) => {
    const textContent = Array.isArray(content) 
      ? content.map((item, index) => `${index + 1}. ${item}`).join('\n')
      : content;

    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(textContent, title)}
              className="h-8 w-8 p-0"
            >
              {copiedSections.has(title) ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(content) ? (
            <ul className="space-y-2">
              {content.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary text-xs rounded-full flex items-center justify-center font-medium mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analysis Complete</h2>
          <p className="text-muted-foreground">From transcript: {filename}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadJSON} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={downloadResults} className="bg-gradient-primary">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="requirements">Must-Haves</TabsTrigger>
          <TabsTrigger value="challenges">Concerns</TabsTrigger>
          <TabsTrigger value="description">Job Desc</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-6">
          <SectionCard
            title="Job Summary"
            content={results.jobSummary}
            icon={Target}
            sectionKey="summary"
          />
          <SectionCard
            title="Top 5 Must-Haves"
            content={results.mustHaves}
            icon={Star}
            sectionKey="mustHaves"
          />
          <SectionCard
            title="Challenges/Concerns"
            content={results.challenges}
            icon={AlertTriangle}
            sectionKey="challenges"
          />
          <SectionCard
            title="Job Description Draft"
            content={results.jobDescription}
            icon={FileText}
            sectionKey="jobDescription"
          />
          <SectionCard
            title="Hiring Manager Recap Email + Scorecard"
            content={results.recapEmail}
            icon={Mail}
            sectionKey="recapEmail"
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <SectionCard
            title="Job Summary"
            content={results.jobSummary}
            icon={Target}
            sectionKey="summary"
          />
        </TabsContent>

        <TabsContent value="requirements" className="mt-6">
          <SectionCard
            title="Top 5 Must-Haves"
            content={results.mustHaves}
            icon={Star}
            sectionKey="mustHaves"
          />
        </TabsContent>

        <TabsContent value="challenges" className="mt-6">
          <SectionCard
            title="Challenges/Concerns"
            content={results.challenges}
            icon={AlertTriangle}
            sectionKey="challenges"
          />
        </TabsContent>

        <TabsContent value="description" className="mt-6">
          <SectionCard
            title="Job Description Draft"
            content={results.jobDescription}
            icon={FileText}
            sectionKey="jobDescription"
          />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <SectionCard
            title="Hiring Manager Recap Email + Scorecard"
            content={results.recapEmail}
            icon={Mail}
            sectionKey="recapEmail"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};