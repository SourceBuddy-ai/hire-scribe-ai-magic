import { useState, useCallback } from 'react';
import { Upload, FileAudio, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from './ui/progress';

interface AudioUploadProps {
  onUploadComplete?: () => void;
}

const ACCEPTED_AUDIO_TYPES = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const AudioUpload = ({ onUploadComplete }: AudioUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [consentObtained, setConsentObtained] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_AUDIO_TYPES.includes(fileExtension)) {
      return `Invalid file type. Please upload: ${ACCEPTED_AUDIO_TYPES.join(', ')}`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCandidateName('');
    setPositionTitle('');
    setInterviewDate('');
    setConsentObtained(false);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile || !consentObtained) {
      toast({
        title: "Missing information",
        description: "Please select a file and confirm consent",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-audio')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('interview-audio')
        .getPublicUrl(fileName);

      // Create interview record
      const { data: interviewData, error: insertError } = await supabase
        .from('interviews')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_url: publicUrl,
          candidate_name: candidateName || null,
          position_title: positionTitle || null,
          interview_date: interviewDate || null,
          consent_obtained: consentObtained,
          status: 'uploading',
          retention_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year from now
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({
        title: "Upload successful!",
        description: "Your interview has been uploaded and will be processed shortly.",
      });

      resetForm();
      onUploadComplete?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile && !isUploading) {
    return (
      <div className="space-y-6">
        {/* File Preview */}
        <div className="bg-accent/50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileAudio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Interview Details Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-name">Candidate Name (Optional)</Label>
              <Input
                id="candidate-name"
                placeholder="Enter candidate name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-title">Position Title (Optional)</Label>
              <Input
                id="position-title"
                placeholder="Enter position title"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interview-date">Interview Date (Optional)</Label>
            <Input
              id="interview-date"
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg border">
            <Checkbox
              id="consent"
              checked={consentObtained}
              onCheckedChange={(checked) => setConsentObtained(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Candidate consent obtained
              </Label>
              <p className="text-xs text-muted-foreground">
                I confirm that the candidate has provided consent for this interview recording to be processed and analyzed.
              </p>
            </div>
          </div>

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            className="w-full" 
            disabled={!consentObtained}
          >
            Upload Interview
          </Button>
        </div>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <FileAudio className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="font-medium text-foreground mb-2">Uploading Interview...</h3>
          <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={ACCEPTED_AUDIO_TYPES.join(',')}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Upload Interview Recording
          </h3>
          <p className="text-muted-foreground mb-4">
            Drop your audio file here or click to browse
          </p>
          <Button variant="outline">
            Choose File
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Supported formats: {ACCEPTED_AUDIO_TYPES.join(', ')}</p>
          <p>Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB</p>
        </div>
      </div>
    </div>
  );
};