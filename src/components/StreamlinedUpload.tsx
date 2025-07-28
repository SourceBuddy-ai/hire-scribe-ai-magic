import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  FileAudio, 
  CheckCircle, 
  X,
  Sparkles,
  Brain,
  Zap
} from 'lucide-react';

interface StreamlinedUploadProps {
  onUploadComplete: (interviewId: string) => void;
  onProcessingComplete: () => void;
}

interface InterviewRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_url: string | null;
  candidate_name: string | null;
  position_title: string | null;
  status: string;
  created_at: string;
}

export const StreamlinedUpload = ({ 
  onUploadComplete, 
  onProcessingComplete 
}: StreamlinedUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [formData, setFormData] = useState({
    candidateName: '',
    positionTitle: ''
  });

  // Auto-fill form based on filename
  const autoFillFromFilename = useCallback((filename: string) => {
    const nameMatch = filename.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
    const positionMatch = filename.match(/(Engineer|Manager|Director|Analyst|Specialist|Coordinator)/i);
    
    if (nameMatch && !formData.candidateName) {
      setFormData(prev => ({ ...prev, candidateName: nameMatch[1] }));
    }
    
    if (positionMatch && !formData.positionTitle) {
      setFormData(prev => ({ ...prev, positionTitle: positionMatch[1] }));
    }
  }, [formData.candidateName, formData.positionTitle]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      'text/plain',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
      'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'
    ];
    const allowedExtensions = ['txt', 'mp3', 'wav', 'm4a', 'mp4', 'aac', 'ogg', 'webm', 'flac'];
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (file.size > 100 * 1024 * 1024) {
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
        description: 'Please select a text or audio file.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    autoFillFromFilename(file.name);
  }, [toast, autoFillFromFilename]);

  const startUpload = async () => {
    console.log('=== UPLOAD STARTED ===');
    console.log('User:', user?.id);
    console.log('File:', selectedFile?.name);
    console.log('Form data:', formData);

    if (!selectedFile || !formData.candidateName.trim() || !formData.positionTitle.trim()) {
      console.log('Validation failed - missing data');
      toast({
        title: 'Missing information',
        description: 'Please fill in candidate name, position, and select a file.',
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('uploading');
    setUploadProgress(0);

    try {
      console.log('Creating interview record...');
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          user_id: user?.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          candidate_name: formData.candidateName.trim(),
          position_title: formData.positionTitle.trim(),
          status: 'uploading'
        })
        .select()
        .single();

      console.log('Interview created:', interview);
      console.log('Interview error:', interviewError);

      if (interviewError || !interview) {
        throw new Error('Failed to create interview record');
      }

      console.log('Simulating upload progress...');
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Uploading file to storage...');
      const fileName = `${user.id}/${interview.id}-${selectedFile.name}`;
      console.log('Storage file name:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('interview-audio')
        .upload(fileName, selectedFile);

      console.log('Storage upload error:', uploadError);

      if (uploadError) {
        console.error('Storage upload failed:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully to storage');

      // Get the public URL
      const { data: fileUrl } = supabase.storage
        .from('interview-audio')
        .getPublicUrl(fileName);

      console.log('File URL:', fileUrl.publicUrl);

      // Update interview with file URL
      await supabase
        .from('interviews')
        .update({
          file_url: fileUrl.publicUrl,
          status: 'uploaded'
        })
        .eq('id', interview.id);

      console.log('Interview updated with file URL');

      toast({
        title: 'Upload successful',
        description: 'Starting AI analysis...',
      });

      onUploadComplete(interview.id);
      setCurrentStep('processing');
      
      // Process the file
      await processFile(interview, selectedFile);

    } catch (error: unknown) {
      console.error('=== UPLOAD ERROR DETAILS ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'No message');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('User ID:', user?.id);
      console.error('File name:', selectedFile?.name);
      console.error('File size:', selectedFile?.size);
      console.error('File type:', selectedFile?.type);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setCurrentStep('idle');
    }
  };

  const processFile = async (interview: InterviewRecord, file: File) => {
    console.log('=== PROCESSING FILE ===');
    console.log('File type:', file.type);
    console.log('File size:', file.size);

    try {
      setProcessingProgress(0);

      // Check if user is authenticated
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No valid session found');
      }

      console.log('User authenticated:', user.id);
      console.log('Session token:', session.access_token ? 'Present' : 'Missing');

      if (file.name.endsWith('.txt')) {
        // Process text file
        const reader = new FileReader();
        reader.onload = async (e) => {
          const transcript = e.target?.result as string;
          
          // Simulate processing progress
          for (let i = 0; i <= 100; i += 20) {
            setProcessingProgress(i);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          console.log('Calling process-interview function...');
          const { data, error } = await supabase.functions.invoke('process-interview', {
            body: {
              interviewId: interview.id,
              transcript: transcript,
              templateId: null,
            },
          });

          if (error) {
            console.error('Function error:', error);
            throw error;
          }

          setCurrentStep('complete');
          toast({
            title: "Analysis complete!",
            description: "Your interview has been successfully analyzed.",
          });

          onProcessingComplete();
        };
        reader.readAsText(file);
      } else {
        // Process audio file
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binary);

          // Simulate processing progress
          for (let i = 0; i <= 100; i += 20) {
            setProcessingProgress(i);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          console.log('About to call transcribe-audio function...');
          console.log('Interview ID:', interview.id);
          console.log('Audio data length:', base64Audio.length);

          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: {
              interviewId: interview.id,
              audioData: base64Audio,
            },
          });

          console.log('Function response:', { data, error });

          if (error) {
            console.error('Function error:', error);
            throw error;
          }

          setCurrentStep('complete');
          toast({
            title: "Analysis complete!",
            description: "Your audio has been transcribed and analyzed.",
          });

          onProcessingComplete();
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (error: unknown) {
      console.error('Processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process the file.';
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
      setCurrentStep('idle');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormData({ candidateName: '', positionTitle: '' });
    setCurrentStep('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (currentStep === 'uploading') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <CardTitle>Uploading Interview</CardTitle>
          <p className="text-muted-foreground">Please wait while we upload your file...</p>
        </CardHeader>
        <CardContent>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {uploadProgress}% complete
          </p>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <CardTitle>AI Analysis in Progress</CardTitle>
          <p className="text-muted-foreground">Our AI is analyzing your interview...</p>
        </CardHeader>
        <CardContent>
          <Progress value={processingProgress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {processingProgress}% complete
          </p>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Analysis Complete!</CardTitle>
          <p className="text-muted-foreground">Your interview has been successfully analyzed.</p>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={resetForm} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze Another Interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              onClick={() => setSelectedFile(null)}
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
              Drop your interview file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .txt and audio files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.mp3,.wav,.m4a,.mp4,.aac,.ogg,.webm,.flac"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </Button>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="candidateName">Candidate Name</Label>
            <Input
              id="candidateName"
              value={formData.candidateName}
              onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label htmlFor="positionTitle">Position</Label>
            <Input
              id="positionTitle"
              value={formData.positionTitle}
              onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
              placeholder="Software Engineer"
            />
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={startUpload}
          disabled={!selectedFile || !formData.candidateName.trim() || !formData.positionTitle.trim()}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Start Analysis
        </Button>
      </CardContent>
    </Card>
  );
}; 