import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AudioUpload } from '@/components/AudioUpload';
import { InterviewsList } from '@/components/InterviewsList';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileAudio, Users, Clock, LogOut, Settings } from 'lucide-react';

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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    processingInterviews: 0,
    recentInterviews: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await loadUserProfile(session.user.id);
            await loadDashboardStats(session.user.id);
          } else {
            setUser(null);
            setUserProfile(null);
            navigate('/auth');
          }
          setLoading(false);
        }
      );

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
        await loadDashboardStats(session.user.id);
      } else {
        navigate('/auth');
      }
      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate]);

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const refreshStats = () => {
    if (user) {
      loadDashboardStats(user.id);
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileAudio className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RecruiterLab</h1>
              <p className="text-sm text-muted-foreground">Interview Analysis Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
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
                  Upload your audio recording to generate structured interview insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioUpload onUploadComplete={refreshStats} />
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
                  onUpdate={refreshStats}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};