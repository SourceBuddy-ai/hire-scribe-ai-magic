import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadComponent } from "@/components/FileUploadComponent";
import { InterviewsList } from "@/components/InterviewsList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Users, Clock, Brain, Upload, FileAudio } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  subscription_type: string;
  created_at: string;
  updated_at: string;
}

interface Interview {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number | null;
  file_url: string | null;
  candidate_name: string | null;
  position_title: string | null;
  interview_date: string | null;
  duration_seconds: number | null;
  status: string;
  consent_obtained: boolean;
  retention_until: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalInterviews: number;
  processingInterviews: number;
  recentInterviews: Interview[];
}

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    processingInterviews: 0,
    recentInterviews: []
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadUserProfile(user.id);
      loadDashboardStats(user.id);
      setLoading(false);
    }
  }, [user]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardStats = async (userId: string) => {
    try {
      // Get total interviews count
      const { count: totalInterviews } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get processing interviews count
      const { count: processingInterviews } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['uploading', 'processing']);

      // Get recent interviews
      const { data: recentInterviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalInterviews: totalInterviews || 0,
        processingInterviews: processingInterviews || 0,
        recentInterviews: recentInterviews || []
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const handleFileUpload = async (interviewId: string) => {
    if (!user) return;
    
    setProcessing(true);
    try {
      // Get the interview data to extract transcript if it's a text file
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (interviewError || !interview) {
        throw new Error('Failed to fetch interview data');
      }

      let transcript = '';

      // If it's a text file, download and read the content
      if (interview.file_name.endsWith('.txt')) {
        const fileName = `${interview.id}-${interview.file_name}`;
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('interview-audio')
          .download(fileName);

        if (downloadError) {
          throw new Error('Failed to download file');
        }

        transcript = await fileData.text();
      } else {
        // For audio files, we'll need to implement transcription later
        // For now, show a message that audio transcription is coming soon
        toast({
          title: "Audio files uploaded",
          description: "Audio transcription will be available soon. For now, please use text files.",
        });
        await loadDashboardStats(user.id);
        setProcessing(false);
        return;
      }

      // Process the transcript
      const { data, error } = await supabase.functions.invoke('process-interview', {
        body: {
          interviewId: interview.id,
          transcript: transcript,
          templateId: null // Default template for now
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process interview');
      }

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      toast({
        title: "Analysis complete",
        description: "Your interview has been successfully analyzed.",
      });

      await loadDashboardStats(user.id);
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RecruiterLab</h1>
              <p className="text-sm text-muted-foreground">Interview Analysis Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userProfile?.full_name || 'User'}!
          </h2>
          <p className="text-muted-foreground">
            Transform your interview recordings into structured insights with AI-powered analysis.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInterviews}</div>
              <p className="text-xs text-muted-foreground">
                All time recordings processed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processingInterviews}</div>
              <p className="text-xs text-muted-foreground">
                Currently being analyzed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{userProfile?.subscription_type || 'Free'}</div>
              <p className="text-xs text-muted-foreground">
                Current plan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload New Interview
                </CardTitle>
                <CardDescription>
                  Upload your interview transcript or audio to generate structured insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadComponent 
                  onUploadComplete={handleFileUpload} 
                  isProcessing={processing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent Interviews */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Interviews</CardTitle>
                <CardDescription>
                  Your latest interview analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewsList 
                  interviews={stats.recentInterviews}
                  onUpdate={() => loadDashboardStats(user.id)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};