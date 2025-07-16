import { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSave: () => void;
}

export const ApiKeyInput = ({ apiKey, onApiKeyChange, onSave }: ApiKeyInputProps) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="bg-gradient-card shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Key className="h-4 w-4 text-primary" />
          </div>
          OpenAI API Key Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To process transcripts with AI, please enter your OpenAI API key. Your key is stored locally and not sent to our servers.
        </p>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button 
            onClick={onSave} 
            disabled={!apiKey.trim()}
            className="bg-gradient-primary"
          >
            Save Key
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Don't have an API key? Get one from{' '}
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenAI Platform
          </a>
        </p>
      </CardContent>
    </Card>
  );
};