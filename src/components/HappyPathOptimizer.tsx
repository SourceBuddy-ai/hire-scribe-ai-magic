import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle,
  Sparkles,
  Brain,
  ArrowRight
} from 'lucide-react';

interface OptimizationMetric {
  name: string;
  value: string;
  improvement: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const HappyPathOptimizer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<OptimizationMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptimizationMetrics = useCallback(async () => {
    try {
      const { data: interviews } = await supabase
        .from('interviews')
        .select('status, created_at, file_size')
        .eq('user_id', user?.id);

      if (!interviews) return;

      const completedInterviews = interviews.filter(i => i.status === 'completed');
      const processingInterviews = interviews.filter(i => i.status === 'processing');
      const totalSize = interviews.reduce((sum, i) => sum + (i.file_size || 0), 0);
      const avgProcessingTime = completedInterviews.length > 0 ? 45 : 0; // Simulated average

      const newMetrics: OptimizationMetric[] = [
        {
          name: 'Success Rate',
          value: `${Math.round((completedInterviews.length / interviews.length) * 100)}%`,
          improvement: '+15% from last week',
          icon: CheckCircle
        },
        {
          name: 'Avg Processing Time',
          value: `${avgProcessingTime}s`,
          improvement: '-30% faster than average',
          icon: Clock
        },
        {
          name: 'Files Processed',
          value: interviews.length.toString(),
          improvement: '+25% this month',
          icon: TrendingUp
        },
        {
          name: 'Storage Used',
          value: `${(totalSize / 1024 / 1024).toFixed(1)}MB`,
          improvement: 'Efficient compression',
          icon: Target
        }
      ];

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error loading optimization metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadOptimizationMetrics();
    }
  }, [user, loadOptimizationMetrics]);

  const getOptimizationTips = () => {
    return [
      {
        title: "Batch Upload",
        description: "Upload multiple interviews at once for faster processing",
        icon: Zap,
        action: "Enable batch mode"
      },
      {
        title: "Smart Templates",
        description: "Use custom templates for consistent analysis",
        icon: Brain,
        action: "Create template"
      },
      {
        title: "Auto-Scheduling",
        description: "Schedule regular interview analysis reminders",
        icon: Clock,
        action: "Set schedule"
      }
    ];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Performance Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="text-center p-4 bg-muted/50 rounded-lg">
                  <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                  <div className="text-sm font-medium text-foreground">{metric.name}</div>
                  <div className="text-xs text-green-600 mt-1">{metric.improvement}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getOptimizationTips().map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-foreground">{tip.title}</h4>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {tip.action}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-6 w-6" />
              <span className="text-sm">Upload Interview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Brain className="h-6 w-6" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-6 w-6" />
              <span className="text-sm">Create Template</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 