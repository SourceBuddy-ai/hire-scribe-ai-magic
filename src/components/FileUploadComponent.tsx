import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, FileAudio, X } from 'lucide-react';

interface FileUploadComponentProps {
  onUploadComplete: (interviewId: string) => void;
  isProcessing: boolean;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  onUploadComplete,
  isProcessing
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'text/plain',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/ogg',
      'audio/webm'
    ];

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 100MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a text file (.txt) or audio file (.mp3, .wav, .mp4, .ogg, .webm).',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async () => {
    if (!selectedFile || !candidateName.trim() || !positionTitle.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in candidate name, position, and select a file.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Create interview record first
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          candidate_name: candidateName.trim(),
          position_title: positionTitle.trim(),
          status: 'uploading'
        })
        .select()
        .single();

      if (interviewError || !interview) {
        throw new Error('Failed to create interview record');
      }

      // Upload file to storage
      const fileName = `${interview.id}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('interview-audio')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Update interview with file URL
      const { data: fileUrl } = supabase.storage
        .from('interview-audio')
        .getPublicUrl(fileName);

      await supabase
        .from('interviews')
        .update({
          file_url: fileUrl.publicUrl,
          status: 'uploaded'
        })
        .eq('id', interview.id);

      setUploadProgress(100);
      
      toast({
        title: 'Upload successful',
        description: 'Your file has been uploaded and is ready for processing.',
      });

      // Reset form
      setSelectedFile(null);
      setCandidateName('');
      setPositionTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete(interview.id);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="candidateName">Candidate Name</Label>
              <Input
                id="candidateName"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter candidate name"
                disabled={uploading || isProcessing}
              />
            </div>
            <div>
              <Label htmlFor="positionTitle">Position Title</Label>
              <Input
                id="positionTitle"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="Enter position title"
                disabled={uploading || isProcessing}
              />
            </div>
          </div>

          {/* File Upload Area */}
          {selectedFile ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
              <div className="flex items-center space-x-3">
                {selectedFile.type.startsWith('audio/') ? (
                  <FileAudio className="h-8 w-8 text-primary" />
                ) : (
                  <FileText className="h-8 w-8 text-primary" />
                )}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={uploading || isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Drop your file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports .txt files and audio files (.mp3, .wav, .mp4, .ogg, .webm)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.mp3,.wav,.mp4,.ogg,.webm"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading || isProcessing}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isProcessing}
              >
                Select File
              </Button>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Uploading...</span>
                <span className="text-sm">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={uploadFile}
            disabled={!selectedFile || uploading || isProcessing || !candidateName.trim() || !positionTitle.trim()}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Interview'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};