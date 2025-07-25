import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { ProcessingState } from '@/components/ProcessingState';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Pause, 
  Download,
  FileText,
  User,
  Calendar,
  Briefcase,
  Clock
} from 'lucide-react';

interface Interview {
  id: string;
  file_name: string;
  candidate_name: string | null;
  position_title: string | null;
  interview_date: string | null;
  status: string;
  created_at: string;
  file_url: string | null;
}

interface InterviewSummary {
  id: string;
  summary_content: any;
  transcript_text: string | null;
  ai_model_used: string | null;
  processing_time_seconds: number | null;
  created_at: string;
}

export const InterviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [interview, setInterview] = useState<Interview | null>(null);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadInterviewData();
    }
  }, [id]);

  const loadInterviewData = async () => {
    try {
      // Load interview details
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .single();

      if (interviewError) throw interviewError;
      setInterview(interviewData);

      // Load interview summary if available
      const { data: summaryData, error: summaryError } = await supabase
        .from('interview_summaries')
        .select('*')
        .eq('interview_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (summaryError && summaryError.code !== 'PGRST116') {
        throw summaryError;
      }

      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
        setEditableTranscript(summaryData[0].transcript_text || '');
      }
    } catch (error: any) {
      toast({
        title: "Error loading interview",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTranscript = async () => {
    if (!summary) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('interview_summaries')
        .update({ transcript_text: editableTranscript })
        .eq('id', summary.id);

      if (error) throw error;

      setSummary(prev => prev ? { ...prev, transcript_text: editableTranscript } : null);
      toast({
        title: "Transcript saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAudio = async () => {
    if (!interview?.file_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('interview-audio')
        .download(interview.file_url.split('/').slice(-2).join('/'));

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = interview.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your audio file is being downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      uploading: { variant: 'secondary' as const, label: 'Uploading' },
      processing: { variant: 'secondary' as const, label: 'Processing' },
      completed: { variant: 'default' as const, label: 'Completed' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
    };
    return config[status as keyof typeof config] || config.completed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Interview not found</h2>
          <p className="text-muted-foreground mb-4">The interview you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {interview.candidate_name || 'Unnamed Interview'}
                </h1>
                <p className="text-muted-foreground">{interview.file_name}</p>
              </div>
            </div>
            <Badge variant={getStatusBadge(interview.status).variant}>
              {getStatusBadge(interview.status).label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Interview Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {interview.candidate_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Candidate</p>
                    <p className="font-medium">{interview.candidate_name}</p>
                  </div>
                </div>
              )}
              
              {interview.position_title && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{interview.position_title}</p>
                  </div>
                </div>
              )}
              
              {interview.interview_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Interview Date</p>
                    <p className="font-medium">{formatDate(interview.interview_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Uploaded</p>
                  <p className="font-medium">{formatDate(interview.created_at)}</p>
                </div>
              </div>
            </div>

            {interview.file_url && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="gap-2"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'} Audio
                  </Button>
                  <Button variant="outline" onClick={downloadAudio} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue={summary ? "analysis" : "transcript"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-6">
            {interview.status === 'processing' ? (
              <ProcessingState />
            ) : summary?.summary_content ? (
              <ResultsDisplay 
                results={summary.summary_content}
                filename={interview.file_name}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No analysis available</h3>
                    <p className="text-sm text-muted-foreground">
                      The AI analysis is not yet available for this interview.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Interview Transcript</CardTitle>
                  {summary && (
                    <Button 
                      onClick={saveTranscript}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <Textarea
                    value={editableTranscript}
                    onChange={(e) => setEditableTranscript(e.target.value)}
                    placeholder="Transcript text will appear here..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No transcript available</h3>
                    <p className="text-sm text-muted-foreground">
                      The transcript is not yet available for this interview.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};