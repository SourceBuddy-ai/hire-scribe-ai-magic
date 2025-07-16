import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  isProcessing: boolean;
}

export const FileUpload = ({ onFileContent, isProcessing }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt file containing the transcript.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.trim().length === 0) {
        toast({
          title: "Empty file",
          description: "The uploaded file appears to be empty.",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file.name);
      onFileContent(content, file.name);
    };
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the uploaded file.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  }, [onFileContent, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const clearFile = () => {
    setUploadedFile(null);
  };

  if (uploadedFile && !isProcessing) {
    return (
      <div className="bg-gradient-card rounded-lg p-6 border shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">File Uploaded</h3>
              <p className="text-sm text-muted-foreground">{uploadedFile}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragActive 
          ? 'border-primary bg-primary/5 shadow-upload' 
          : 'border-border bg-gradient-card hover:border-primary/50'
      } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".txt"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Upload Transcript File
          </h3>
          <p className="text-muted-foreground mb-4">
            Drop your .txt transcript file here or click to browse
          </p>
          <Button variant="outline" disabled={isProcessing}>
            Choose File
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Supported format: .txt files only
        </p>
      </div>
    </div>
  );
};