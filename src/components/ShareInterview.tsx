
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

export const ShareInterview = ({ interviewId, interviewName, candidateName }: ShareInterviewProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    permissions: ['view'],
    expiresIn: '7'
  });

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

  const generateShareLink = () => {
    const shareUrl = `${window.location.origin}/interview/${interviewId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
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

          {/* Share Link */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Link className="h-4 w-4" />
              Share Link
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
              <Button onClick={generateShareLink} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Share Link
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
