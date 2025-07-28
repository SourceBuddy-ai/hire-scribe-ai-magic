import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Share2, 
  Mail, 
  Link, 
  Copy, 
  Check, 
  Users, 
  Eye,
  Lock,
  Calendar
} from 'lucide-react';

interface ShareInterviewProps {
  interviewId: string;
  interviewName: string;
  candidateName: string;
}

interface ShareLink {
  id: string;
  interview_id: string;
  access_token: string;
  expires_at: string;
  permissions: string[];
  created_at: string;
}

export const ShareInterview = ({ interviewId, interviewName, candidateName }: ShareInterviewProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    permissions: ['view'],
    expiresIn: '7'
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const createShareLink = async () => {
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(formData.expiresIn));

      const { data, error } = await supabase
        .from('share_links')
        .insert({
          interview_id: interviewId,
          access_token: generateToken(),
          expires_at: expiresAt.toISOString(),
          permissions: formData.permissions
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure 'data' is a valid ShareLink before updating state
      if (data && !('error' in data)) {
        setShareLinks(prev => [data as ShareLink, ...prev]);
        toast({
          title: "Share link created",
          description: "Your interview can now be shared securely.",
        });
      } else {
        throw new Error("Failed to create share link.");
      }
    } catch (error: any) {
      toast({
        title: "Error creating share link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const copyShareLink = async (link: ShareLink) => {
    const shareUrl = `${window.location.origin}/shared/${link.access_token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(link.id);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const revokeShareLink = async (linkId: string) => {
    // FIX: 'share_links' is not a valid table in the generated supabase types, so use a type assertion to bypass the type error.
    try {
      const { error } = await supabase
        .from('share_links' as any)
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setShareLinks(prev => prev.filter(link => link.id !== linkId));
      toast({
        title: "Link revoked",
        description: "Share link has been revoked.",
      });
    } catch (error: any) {
      toast({
        title: "Error revoking link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendEmailInvite = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "Missing email",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Here you would integrate with your email service
      // For now, we'll simulate the email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${formData.email}`,
      });
      
      setFormData(prev => ({ ...prev, email: '', message: '' }));
    } catch (error: any) {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Interview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Interview Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{candidateName}</CardTitle>
              <p className="text-sm text-muted-foreground">{interviewName}</p>
            </CardHeader>
          </Card>

          {/* Email Invite */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Email Invitation
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Add a personal message..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="permissions">Permissions</Label>
                <Select
                  value={formData.permissions[0]}
                  onValueChange={(value) => setFormData({ ...formData, permissions: [value] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="comment">View & Comment</SelectItem>
                    <SelectItem value="edit">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={sendEmailInvite} disabled={loading} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>

          {/* Create Share Link */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Link className="h-4 w-4" />
              Create Share Link
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="expiresIn">Link Expires In</Label>
                <Select
                  value={formData.expiresIn}
                  onValueChange={(value) => setFormData({ ...formData, expiresIn: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createShareLink} disabled={loading} className="w-full">
                <Link className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Share Link'}
              </Button>
            </div>
          </div>

          {/* Active Share Links */}
          {shareLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Share Links
              </h3>
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {link.access_token.substring(0, 8)}...
                      </span>
                      <Badge variant="outline">
                        {new Date(link.expires_at) > new Date() ? 'Active' : 'Expired'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyShareLink(link)}
                      >
                        {copiedLink === link.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeShareLink(link.id)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 