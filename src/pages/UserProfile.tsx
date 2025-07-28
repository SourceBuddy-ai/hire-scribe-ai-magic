import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Building, 
  Mail, 
  Crown, 
  Settings,
  Shield,
  Bell,
  Palette
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  subscription_type: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  totalInterviews: number;
  completedInterviews: number;
  processingInterviews: number;
  storageUsed: string;
}

export const UserProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        company: profileData.company || '',
        email: profileData.email || ''
      });

      // Load user statistics
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select('status, file_size')
        .eq('user_id', user?.id);

      if (interviewsError) throw interviewsError;

      const totalInterviews = interviews.length;
      const completedInterviews = interviews.filter(i => i.status === 'completed').length;
      const processingInterviews = interviews.filter(i => i.status === 'processing').length;
      const totalBytes = interviews.reduce((sum, i) => sum + (i.file_size || 0), 0);
      const storageUsed = formatFileSize(totalBytes);

      setStats({
        totalInterviews,
        completedInterviews,
        processingInterviews,
        storageUsed
      });

    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name || null,
          company: formData.company || null,
          email: formData.email || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });

      loadUserData();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSubscriptionBadge = (type: string | null) => {
    const config = {
      free: { variant: 'secondary' as const, label: 'Free Plan', icon: User },
      pro: { variant: 'default' as const, label: 'Pro Plan', icon: Crown },
      enterprise: { variant: 'default' as const, label: 'Enterprise', icon: Building },
    };
    
    const sub = type || 'free';
    return config[sub as keyof typeof config] || config.free;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted font-sans flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-card border border-border">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Profile</h2>
        </div>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input type="email" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition" placeholder="Email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Company</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition" placeholder="Company" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Subscription</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition" placeholder="Subscription" disabled />
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <Button type="submit" className="px-8 py-3 text-base font-semibold">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
};