import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Users, 
  FileText,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  totalInterviews: number;
  completedInterviews: number;
  averageProcessingTime: number;
  totalCandidates: number;
  interviewsByMonth: { month: string; count: number }[];
  interviewsByStatus: { status: string; count: number }[];
  positionBreakdown: { position: string; count: number }[];
  recentActivity: { date: string; activity: string; candidate?: string }[];
}

export const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Load interviews data
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          interview_summaries (
            processing_time_seconds,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (interviewsError) throw interviewsError;

      // Process analytics data
      const totalInterviews = interviews.length;
      const completedInterviews = interviews.filter(i => i.status === 'completed').length;
      
      // Calculate average processing time
      const processedInterviews = interviews.filter(i => 
        i.interview_summaries && i.interview_summaries.length > 0
      );
      const totalProcessingTime = processedInterviews.reduce((sum, interview) => {
        const summary = interview.interview_summaries[0];
        return sum + (summary?.processing_time_seconds || 0);
      }, 0);
      const averageProcessingTime = processedInterviews.length > 0 
        ? Math.round(totalProcessingTime / processedInterviews.length) 
        : 0;

      // Get unique candidates
      const uniqueCandidates = new Set(
        interviews
          .filter(i => i.candidate_name)
          .map(i => i.candidate_name)
      ).size;

      // Group by month
      const interviewsByMonth = interviews.reduce((acc, interview) => {
        const month = new Date(interview.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ month, count: 1 });
        }
        return acc;
      }, [] as { month: string; count: number }[]);

      // Group by status
      const interviewsByStatus = interviews.reduce((acc, interview) => {
        const existing = acc.find(item => item.status === interview.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: interview.status, count: 1 });
        }
        return acc;
      }, [] as { status: string; count: number }[]);

      // Group by position
      const positionBreakdown = interviews
        .filter(i => i.position_title)
        .reduce((acc, interview) => {
          const position = interview.position_title!;
          const existing = acc.find(item => item.position === position);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ position, count: 1 });
          }
          return acc;
        }, [] as { position: string; count: number }[]);

      // Recent activity
      const recentActivity = interviews
        .slice(0, 10)
        .map(interview => ({
          date: interview.created_at,
          activity: `Interview uploaded: ${interview.file_name}`,
          candidate: interview.candidate_name || undefined
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAnalytics({
        totalInterviews,
        completedInterviews,
        averageProcessingTime,
        totalCandidates: uniqueCandidates,
        interviewsByMonth: interviewsByMonth.slice(-6), // Last 6 months
        interviewsByStatus,
        positionBreakdown: positionBreakdown.slice(0, 5), // Top 5 positions
        recentActivity
      });

    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const report = `RECRUITERLAB ANALYTICS REPORT
Generated on: ${new Date().toLocaleDateString()}
Time Range: Last ${timeRange} days

=====================================
OVERVIEW
=====================================
Total Interviews: ${analytics.totalInterviews}
Completed Interviews: ${analytics.completedInterviews}
Completion Rate: ${analytics.totalInterviews > 0 ? Math.round((analytics.completedInterviews / analytics.totalInterviews) * 100) : 0}%
Average Processing Time: ${analytics.averageProcessingTime} seconds
Unique Candidates: ${analytics.totalCandidates}

=====================================
INTERVIEWS BY MONTH
=====================================
${analytics.interviewsByMonth.map(item => `${item.month}: ${item.count}`).join('\n')}

=====================================
INTERVIEWS BY STATUS
=====================================
${analytics.interviewsByStatus.map(item => `${item.status}: ${item.count}`).join('\n')}

=====================================
TOP POSITIONS
=====================================
${analytics.positionBreakdown.map((item, index) => `${index + 1}. ${item.position}: ${item.count}`).join('\n')}

=====================================
RECENT ACTIVITY
=====================================
${analytics.recentActivity.map(item => `${new Date(item.date).toLocaleDateString()}: ${item.activity}`).join('\n')}`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruiterlab-analytics-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Analytics exported",
      description: "Your analytics report has been downloaded.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted font-sans py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-card border border-border">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <Card className="shadow-card border border-border bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Total Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{analytics ? analytics.totalCandidates : 0}</div>
              <p className="text-xs text-muted-foreground">Candidates processed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border border-border bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Avg. Processing Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{analytics ? formatTime(analytics.averageProcessingTime) : '0s'}</div>
              <p className="text-xs text-muted-foreground">Minutes per interview</p>
            </CardContent>
          </Card>
        </div>
        <div className="bg-muted rounded-xl p-8 shadow-inner mb-8">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Interviews by Month</h3>
          {/* Insert chart component here */}
          <div className="h-64 flex items-center justify-center text-muted-foreground">[Chart Placeholder]</div>
        </div>
        <div className="bg-muted rounded-xl p-8 shadow-inner">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Activity</h3>
          {/* Insert recent activity list here */}
          <ul className="divide-y divide-border">
            <li className="py-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-foreground">Candidate John Doe interview completed</span>
              <span className="ml-auto text-xs text-muted-foreground">2 hours ago</span>
            </li>
            {/* More items... */}
          </ul>
        </div>
      </div>
    </div>
  );
};