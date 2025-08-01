import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, FileAudio, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [consentObtained, setConsentObtained] = useState(false);
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
      'audio/mpeg',          // .mp3
      'audio/wav',           // .wav
      'audio/mp4',           // .mp4, .m4a
      'audio/x-m4a',         // .m4a (alternative MIME type)
      'audio/aac',           // .aac
      'audio/ogg',           // .ogg
      'audio/webm',          // .webm
      'audio/flac',          // .flac
      'audio/x-wav'          // .wav (alternative MIME type)
    ];

    // Additional file extension check for .m4a since MIME types can vary
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['txt', 'mp3', 'wav', 'mp4', 'm4a', 'aac', 'ogg', 'webm', 'flac'];

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 100MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a text file (.txt) or audio file (.mp3, .wav, .m4a, .mp4, .aac, .ogg, .webm, .flac).',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async () => {
    if (!selectedFile || !candidateName.trim() || !positionTitle.trim() || !consentObtained) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields, select a file, and confirm consent.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get current session first to ensure proper authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Current session:', session);
      console.log('Session error:', sessionError);
      
      if (sessionError || !session?.user) {
        throw new Error('No active session. Please sign in again.');
      }

      const user = session.user;
      console.log('Authenticated user:', user.id);

      // Create interview record first
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          candidate_name: candidateName.trim(),
          position_title: positionTitle.trim(),
          consent_obtained: consentObtained,
          status: 'uploading'
        })
        .select()
        .single();

      console.log('Interview insert result:', { interview, interviewError });

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
        description: 'Your file has been uploaded successfully.',
      });

      // Process the uploaded file
      await processUploadedFile(interview, selectedFile);

      // Reset form
      setSelectedFile(null);
      setCandidateName('');
      setPositionTitle('');
      setSelectedTemplate(null);
      setConsentObtained(false);
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

  const processUploadedFile = async (interview: any, file: File) => {
    try {
      if (file.name.endsWith('.txt')) {
        // For text files, read content and process immediately
        const reader = new FileReader();
        reader.onload = async (e) => {
          const transcript = e.target?.result as string;
          
          try {
            const { data, error } = await supabase.functions.invoke('process-interview', {
              body: {
                interviewId: interview.id,
                transcript: transcript,
                templateId: selectedTemplate?.id || null,
              },
            });

            if (error) throw error;

            toast({
              title: "Processing started",
              description: "Your interview transcript is being analyzed by AI.",
            });
          } catch (error: any) {
            console.error('Processing error:', error);
            toast({
              title: "Processing failed",
              description: error.message || "Failed to start AI analysis.",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('audio/') || file.name.endsWith('.m4a')) {
        // For audio files, convert to base64 and send for transcription
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.byteLength; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Audio = btoa(binary);

            console.log('Sending audio for transcription, size:', base64Audio.length);

            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: {
                interviewId: interview.id,
                audioData: base64Audio,
              },
            });

            if (error) throw error;

            toast({
              title: "Audio processing started",
              description: "Your audio is being transcribed and analyzed by AI.",
            });
          } catch (error: any) {
            console.error('Audio processing error:', error);
            toast({
              title: "Processing failed",
              description: error.message || "Failed to process audio file.",
              variant: "destructive",
            });
            
            // Update status to failed
            await supabase
              .from('interviews')
              .update({ status: 'failed' })
              .eq('id', interview.id);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast({
          title: "File type not supported",
          description: "Please upload a .txt or audio file.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('File processing error:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process the file.",
        variant: "destructive",
      });
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
                Supports .txt files and audio files (.mp3, .wav, .m4a, .mp4, .aac, .ogg, .webm, .flac)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.mp3,.wav,.m4a,.mp4,.aac,.ogg,.webm,.flac"
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

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="consent"
              checked={consentObtained}
              onCheckedChange={(checked) => setConsentObtained(checked === true)}
              disabled={uploading || isProcessing}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Consent for Recording Processing
              </Label>
              <p className="text-xs text-muted-foreground">
                I confirm that proper consent has been obtained from the candidate for recording and processing this interview for evaluation purposes.
              </p>
            </div>
          </div>

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
            disabled={!selectedFile || uploading || isProcessing || !candidateName.trim() || !positionTitle.trim() || !consentObtained}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Interview'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};