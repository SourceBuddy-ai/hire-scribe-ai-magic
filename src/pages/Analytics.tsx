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
                <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Insights and trends from your interview data</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportAnalytics} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Total Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {analytics?.totalInterviews || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last {timeRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics?.completedInterviews || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics && analytics.totalInterviews > 0 
                  ? Math.round((analytics.completedInterviews / analytics.totalInterviews) * 100)
                  : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Avg Processing Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics ? formatTime(analytics.averageProcessingTime) : '0s'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per interview
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Unique Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics?.totalCandidates || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Interviewed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analysis */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Interview Trends by Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.interviewsByMonth && analytics.interviewsByMonth.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.interviewsByMonth.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.month}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-accent rounded-full h-2">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full"
                              style={{ 
                                width: `${(item.count / Math.max(...analytics.interviewsByMonth.map(i => i.count))) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for the selected time range
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.interviewsByStatus && analytics.interviewsByStatus.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.interviewsByStatus.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'completed' ? 'bg-green-500' :
                            item.status === 'processing' ? 'bg-yellow-500' :
                            item.status === 'failed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-sm font-medium capitalize">{item.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-accent rounded-full h-2">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full"
                              style={{ 
                                width: `${(item.count / (analytics?.totalInterviews || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No status data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Interview Positions</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.positionBreakdown && analytics.positionBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.positionBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.position}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-accent rounded-full h-2">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full"
                              style={{ 
                                width: `${(item.count / Math.max(...analytics.positionBreakdown.map(i => i.count))) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No position data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.recentActivity.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                          <Calendar className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.activity}</p>
                          {item.candidate && (
                            <p className="text-xs text-muted-foreground">
                              Candidate: {item.candidate}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
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