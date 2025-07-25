import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  Globe, 
  Lock, 
  Star 
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  template_content: any;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TemplateManagerProps {
  onSelectTemplate?: (template: Template | null) => void;
  selectedTemplateId?: string | null;
  compact?: boolean;
}

export const TemplateManager = ({ 
  onSelectTemplate, 
  selectedTemplateId, 
  compact = false 
}: TemplateManagerProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    template_content: '',
    is_public: false
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('summary_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      template_content: '',
      is_public: false
    });
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      template_content: typeof template.template_content === 'object' 
        ? JSON.stringify(template.template_content, null, 2)
        : template.template_content || '',
      is_public: template.is_public
    });
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    let templateContent;
    try {
      templateContent = formData.template_content 
        ? JSON.parse(formData.template_content)
        : {};
    } catch {
      templateContent = { prompt: formData.template_content };
    }

    try {
      const templateData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        template_content: templateContent,
        is_public: formData.is_public
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('summary_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: "Template updated successfully" });
      } else {
        const { error } = await supabase
          .from('summary_templates')
          .insert([{ ...templateData, user_id: user?.id }]);

        if (error) throw error;
        toast({ title: "Template created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (template: Template) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('summary_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast({ title: "Template deleted successfully" });
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const categories = ['Technical Interview', 'Behavioral Interview', 'Leadership Interview', 'Cultural Fit', 'Other'];

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded"></div>;
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Analysis Templates</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the template"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Template Content (JSON or Prompt)</Label>
                  <Textarea
                    id="content"
                    value={formData.template_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                    placeholder="Enter template content as JSON or plain text prompt"
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_public">Make this template public</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveTemplate}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          <Button
            variant={selectedTemplateId === null ? "default" : "outline"}
            onClick={() => onSelectTemplate?.(null)}
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            Default Analysis Template
          </Button>
          
          {templates.map((template) => (
            <Button
              key={template.id}
              variant={selectedTemplateId === template.id ? "default" : "outline"}
              onClick={() => onSelectTemplate?.(template)}
              className="w-full justify-start"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {template.is_public ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>{template.name}</span>
                </div>
                {template.category && (
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analysis Templates</h2>
          <p className="text-muted-foreground">
            Manage custom analysis templates for different interview types
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Template Content (JSON or Prompt)</Label>
                <Textarea
                  id="content"
                  value={formData.template_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                  placeholder="Enter template content as JSON or plain text prompt"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_public">Make this template public</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">No templates yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first analysis template to customize how interviews are processed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {template.is_public ? (
                        <Globe className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {template.category && (
                          <Badge variant="secondary">{template.category}</Badge>
                        )}
                      </CardTitle>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Created {new Date(template.created_at).toLocaleDateString()}
                  {template.updated_at !== template.created_at && (
                    <span> • Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};