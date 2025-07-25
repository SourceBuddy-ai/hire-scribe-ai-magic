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
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto p-6">
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
                <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || 'Not set'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{profile?.company || 'Not set'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <Badge variant={getSubscriptionBadge(profile?.subscription_type).variant}>
                    {getSubscriptionBadge(profile?.subscription_type).label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalInterviews}</div>
                  <p className="text-sm text-muted-foreground">Total Interviews</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completedInterviews}</div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.processingInterviews}</div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.storageUsed}</div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter your company name"
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Subscription Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Current Plan</h3>
                        <p className="text-muted-foreground">
                          You are currently on the {getSubscriptionBadge(profile?.subscription_type).label}
                        </p>
                      </div>
                      <Badge variant={getSubscriptionBadge(profile?.subscription_type).variant}>
                        {getSubscriptionBadge(profile?.subscription_type).label}
                      </Badge>
                    </div>
                    
                    {profile?.subscription_type === 'free' && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Pro for unlimited interviews, advanced analytics, and priority support.
                        </p>
                        <Button className="bg-gradient-primary">
                          Upgrade to Pro
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Password</h3>
                    <p className="text-muted-foreground mb-4">
                      Change your password to keep your account secure.
                    </p>
                    <Button variant="outline">
                      Change Password
                    </Button>
                  </div>
                  
                  <div className="p-6 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Two-Factor Authentication</h3>
                    <p className="text-muted-foreground mb-4">
                      Add an extra layer of security to your account.
                    </p>
                    <Button variant="outline">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Notifications</h3>
                    <p className="text-muted-foreground mb-4">
                      Manage how you receive notifications.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Email notifications</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Processing completion alerts</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Theme</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose your preferred theme.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Light</Button>
                      <Button variant="outline" size="sm">Dark</Button>
                      <Button variant="outline" size="sm">System</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};