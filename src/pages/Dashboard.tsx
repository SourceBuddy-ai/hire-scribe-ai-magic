import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StreamlinedUpload } from "@/components/StreamlinedUpload";
import { SmartForm } from "@/components/SmartForm";
import { ProgressTracker } from "@/components/ProgressTracker";
import { QuickStartWizard } from "@/components/QuickStartWizard";
import { InterviewsList } from "@/components/InterviewsList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Users, Clock, Brain, Upload, FileAudio, Sparkles } from 'lucide-react';

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

type UploadFlow = 'idle' | 'form' | 'upload' | 'processing' | 'complete';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    processingInterviews: 0,
    recentInterviews: []
  });
  const [loading, setLoading] = useState(true);
  const [uploadFlow, setUploadFlow] = useState<UploadFlow>('idle');
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadUserProfile(user.id);
      loadDashboardStats(user.id);
      checkOnboardingStatus();
      setLoading(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data: interviews } = await supabase
        .from('interviews')
        .select('status')
        .eq('user_id', user?.id);

      const hasCompletedInterviews = interviews?.some(i => i.status === 'completed');
      
      if (!hasCompletedInterviews && interviews?.length === 0) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

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

  const handleFormComplete = (formData: any) => {
    setUploadFlow('upload');
    toast({
      title: "Form completed",
      description: "Now let's upload your interview file.",
    });
  };

  const handleUploadComplete = (interviewId: string) => {
    setCurrentInterviewId(interviewId);
    setUploadFlow('processing');
    toast({
      title: "Upload successful",
      description: "Starting AI analysis...",
    });
  };

  const handleProcessingComplete = () => {
    setUploadFlow('complete');
    setShowOnboarding(false);
    loadDashboardStats(user?.id || '');
    toast({
      title: "Analysis complete!",
      description: "Your interview has been successfully analyzed.",
    });
  };

  const resetUploadFlow = () => {
    setUploadFlow('idle');
    setCurrentInterviewId(null);
  };

  const startNewUpload = () => {
    setUploadFlow('form');
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
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shadow-sm">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">RecruiterLab</h1>
              <p className="text-sm text-muted-foreground font-medium">Interview Analysis Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-muted-foreground font-medium">{userProfile?.full_name || 'User'}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="flex items-center gap-2 px-3 py-2">
              <LogOut className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 w-full">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="shadow-card hover:shadow-lg transition-shadow border border-border bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
                <FileAudio className="h-5 w-5 text-blue-500" />
                Total Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.totalInterviews}</div>
              <p className="text-xs text-muted-foreground">All time recordings processed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-lg transition-shadow border border-border bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-warning flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.processingInterviews}</div>
              <p className="text-xs text-muted-foreground">Currently being analyzed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-lg transition-shadow border border-border bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-success flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1 capitalize">{userProfile?.subscription_type || 'Free'}</div>
              <p className="text-xs text-muted-foreground">Current plan</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Upload Section */}
          <div className="space-y-8">
            <Card className="shadow-card border border-border bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-6 w-6 text-primary" />
                  {uploadFlow === 'idle' ? 'Start New Analysis' : 
                   uploadFlow === 'form' ? 'Interview Details' :
                   uploadFlow === 'upload' ? 'Upload File' :
                   uploadFlow === 'processing' ? 'Processing' :
                   'Analysis Complete'}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">
                  {uploadFlow === 'idle' && "Upload your interview transcript or audio to generate structured insights"}
                  {uploadFlow === 'form' && "Fill in the interview details to get started"}
                  {uploadFlow === 'upload' && "Upload your interview file for AI analysis"}
                  {uploadFlow === 'processing' && "Our AI is analyzing your interview"}
                  {uploadFlow === 'complete' && "Your interview has been successfully analyzed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadFlow === 'idle' && (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to analyze an interview?</h3>
                    <p className="text-muted-foreground mb-6">
                      Upload your interview file and get AI-powered insights in minutes.
                    </p>
                    <Button onClick={startNewUpload} size="lg">
                      <Upload className="h-4 w-4 mr-2" />
                      Start Analysis
                    </Button>
                  </div>
                )}

                {uploadFlow === 'form' && (
                  <SmartForm onFormComplete={handleFormComplete} />
                )}

                {uploadFlow === 'upload' && (
                  <StreamlinedUpload 
                    onUploadComplete={handleUploadComplete}
                    onProcessingComplete={handleProcessingComplete}
                  />
                )}

                {uploadFlow === 'processing' && (
                  <ProgressTracker 
                    interviewId={currentInterviewId || undefined}
                    onComplete={handleProcessingComplete}
                  />
                )}

                {uploadFlow === 'complete' && (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Analysis Complete!</h3>
                    <p className="text-muted-foreground mb-6">
                      Your interview has been successfully analyzed. View the results below.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={resetUploadFlow} variant="outline">
                        Analyze Another
                      </Button>
                      <Button onClick={() => window.location.href = `/interview/${currentInterviewId}`}>
                        View Results
                      </Button>
                    </div>
                  </div>
                )}
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
      </main>

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <QuickStartWizard 
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};