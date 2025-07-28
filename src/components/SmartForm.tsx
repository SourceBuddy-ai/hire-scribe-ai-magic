import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Brain,
  Target
} from 'lucide-react';

interface SmartFormProps {
  onFormComplete: (data: FormData) => void;
  initialData?: Partial<FormData>;
}

interface FormData {
  candidateName: string;
  positionTitle: string;
  company: string;
  interviewDate: string;
  interviewType: string;
  priority: 'low' | 'medium' | 'high';
}

export const SmartForm = ({ onFormComplete, initialData }: SmartFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    candidateName: '',
    positionTitle: '',
    company: '',
    interviewDate: '',
    interviewType: 'technical',
    priority: 'medium',
    ...initialData
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Auto-suggest based on input patterns
  const analyzeInput = useCallback(async (field: string, value: string) => {
    if (value.length < 3) return;

    setIsAnalyzing(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const suggestions = [];
    
    if (field === 'candidateName') {
      // Extract potential names from text
      const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
      const matches = value.match(namePattern);
      if (matches) {
        suggestions.push(...matches.slice(0, 3));
      }
    }
    
    if (field === 'positionTitle') {
      // Common position titles
      const commonPositions = [
        'Software Engineer', 'Product Manager', 'Data Scientist',
        'UX Designer', 'Marketing Manager', 'Sales Representative',
        'Project Manager', 'DevOps Engineer', 'QA Engineer'
      ];
      
      const filtered = commonPositions.filter(pos => 
        pos.toLowerCase().includes(value.toLowerCase())
      );
      suggestions.push(...filtered.slice(0, 3));
    }

    setSuggestions(suggestions);
    setIsAnalyzing(false);
  }, []);

  // Validate form data
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.candidateName.trim()) {
      errors.candidateName = 'Candidate name is required';
    } else if (formData.candidateName.length < 2) {
      errors.candidateName = 'Candidate name must be at least 2 characters';
    }

    if (!formData.positionTitle.trim()) {
      errors.positionTitle = 'Position title is required';
    }

    if (formData.interviewDate && new Date(formData.interviewDate) > new Date()) {
      errors.interviewDate = 'Interview date cannot be in the future';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Auto-fill from filename or clipboard
  useEffect(() => {
    const autoFillFromClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          // Look for patterns in clipboard text
          const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
          const positionMatch = text.match(/(Engineer|Manager|Director|Analyst|Specialist|Coordinator)/i);
          const companyMatch = text.match(/(Inc|Corp|LLC|Ltd|Company)/i);

          if (nameMatch && !formData.candidateName) {
            setFormData(prev => ({ ...prev, candidateName: nameMatch[1] }));
          }
          
          if (positionMatch && !formData.positionTitle) {
            setFormData(prev => ({ ...prev, positionTitle: positionMatch[1] }));
          }
        }
      } catch (error) {
        // Clipboard access denied or not available
      }
    };

    autoFillFromClipboard();
  }, [formData.candidateName, formData.positionTitle]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Trigger AI analysis for certain fields
    if (field === 'candidateName' || field === 'positionTitle') {
      analyzeInput(field, value);
    }
  };

  const handleSuggestionClick = (suggestion: string, field: keyof FormData) => {
    setFormData(prev => ({ ...prev, [field]: suggestion }));
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onFormComplete(formData);
      toast({
        title: "Form completed",
        description: "Your interview details have been saved.",
      });
    } else {
      toast({
        title: "Validation errors",
        description: "Please fix the errors before continuing.",
        variant: "destructive",
      });
    }
  };

  const isFormValid = formData.candidateName.trim() && formData.positionTitle.trim();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Interview Form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Candidate Name */}
        <div className="space-y-2">
          <Label htmlFor="candidateName">Candidate Name *</Label>
          <div className="relative">
            <Input
              id="candidateName"
              value={formData.candidateName}
              onChange={(e) => handleInputChange('candidateName', e.target.value)}
              placeholder="John Doe"
              className={validationErrors.candidateName ? 'border-red-500' : ''}
            />
            {isAnalyzing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
              </div>
            )}
          </div>
          {validationErrors.candidateName && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {validationErrors.candidateName}
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20"
                  onClick={() => handleSuggestionClick(suggestion, 'candidateName')}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Position Title */}
        <div className="space-y-2">
          <Label htmlFor="positionTitle">Position Title *</Label>
          <div className="relative">
            <Input
              id="positionTitle"
              value={formData.positionTitle}
              onChange={(e) => handleInputChange('positionTitle', e.target.value)}
              placeholder="Software Engineer"
              className={validationErrors.positionTitle ? 'border-red-500' : ''}
            />
            {isAnalyzing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
              </div>
            )}
          </div>
          {validationErrors.positionTitle && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {validationErrors.positionTitle}
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20"
                  onClick={() => handleSuggestionClick(suggestion, 'positionTitle')}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Acme Corp"
          />
        </div>

        {/* Interview Date */}
        <div className="space-y-2">
          <Label htmlFor="interviewDate">Interview Date</Label>
          <Input
            id="interviewDate"
            type="date"
            value={formData.interviewDate}
            onChange={(e) => handleInputChange('interviewDate', e.target.value)}
          />
          {validationErrors.interviewDate && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {validationErrors.interviewDate}
            </p>
          )}
        </div>

        {/* Interview Type */}
        <div className="space-y-2">
          <Label htmlFor="interviewType">Interview Type</Label>
          <select
            id="interviewType"
            value={formData.interviewType}
            onChange={(e) => handleInputChange('interviewType', e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="culture">Culture Fit</option>
            <option value="case">Case Study</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <Button
                key={priority}
                variant={formData.priority === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleInputChange('priority', priority)}
                className="flex-1"
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          Continue to Upload
        </Button>

        {/* Form Status */}
        {isFormValid && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Form is ready to submit
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 