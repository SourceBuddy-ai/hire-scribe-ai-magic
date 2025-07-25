import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileAudio, 
  Calendar, 
  User, 
  Briefcase, 
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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

interface InterviewsListProps {
  interviews: Interview[];
  onUpdate: () => void;
  compact?: boolean;
}

export const InterviewsList = ({ interviews, onUpdate, compact = false }: InterviewsListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploading: { variant: 'secondary' as const, label: 'Uploading', icon: Clock },
      processing: { variant: 'secondary' as const, label: 'Processing', icon: Clock },
      completed: { variant: 'default' as const, label: 'Completed', icon: FileAudio },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: FileAudio },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async (interview: Interview) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }

    setDeletingId(interview.id);

    try {
      // Delete from storage if file exists
      if (interview.file_url) {
        const filePath = interview.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('interview-audio')
            .remove([`${interview.user_id}/${filePath}`]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interview.id);

      if (error) throw error;

      toast({
        title: "Interview deleted",
        description: "The interview has been successfully deleted.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete the interview.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (interview: Interview) => {
    window.location.href = `/interview/${interview.id}`;
  };

  const handleDownload = async (interview: Interview) => {
    if (!interview.file_url) {
      toast({
        title: "Download unavailable",
        description: "File URL not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('interview-audio')
        .download(interview.file_url.split('/').slice(-2).join('/'));

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = interview.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file is being downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download the file.",
        variant: "destructive",
      });
    }
  };

  if (interviews.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
          <FileAudio className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No interviews yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first interview recording to get started
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {interviews.map((interview) => (
          <div
            key={interview.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileAudio className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {interview.candidate_name || 'Unnamed Interview'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(interview.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(interview.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(interview)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {interview.file_url && (
                    <DropdownMenuItem onClick={() => handleDownload(interview)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => handleDelete(interview)}
                    disabled={deletingId === interview.id}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {interviews.map((interview) => (
        <Card key={interview.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileAudio className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {interview.candidate_name || 'Unnamed Interview'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {interview.file_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(interview.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(interview)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {interview.file_url && (
                      <DropdownMenuItem onClick={() => handleDownload(interview)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDelete(interview)}
                      disabled={deletingId === interview.id}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              {interview.position_title && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Position:</span>
                  <span className="font-medium">{interview.position_title}</span>
                </div>
              )}
              
              {interview.interview_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(interview.interview_date)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{formatFileSize(interview.file_size)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Uploaded:</span>
                <span className="font-medium">{formatDate(interview.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};