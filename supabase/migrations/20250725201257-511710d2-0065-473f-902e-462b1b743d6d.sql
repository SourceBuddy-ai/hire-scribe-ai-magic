-- Fix security warnings for functions by setting search_path

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add new tables for enhanced features

-- Share links table for collaboration
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  permissions TEXT[] DEFAULT ARRAY['view'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on share_links
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_links
CREATE POLICY "Users can view their own share links" 
ON public.share_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = share_links.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create share links for their interviews" 
ON public.share_links 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = share_links.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own share links" 
ON public.share_links 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = share_links.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

-- Comments and feedback table
CREATE TABLE public.interview_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  section_key TEXT, -- e.g., 'jobSummary', 'mustHaves'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interview_comments
ALTER TABLE public.interview_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_comments
CREATE POLICY "Users can view comments for their interviews" 
ON public.interview_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = interview_comments.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comments for their interviews" 
ON public.interview_comments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = interview_comments.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.interview_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.interview_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Interview ratings and feedback
CREATE TABLE public.interview_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  ai_accuracy_rating INTEGER CHECK (ai_accuracy_rating >= 1 AND ai_accuracy_rating <= 5),
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(interview_id, user_id)
);

-- Enable RLS on interview_ratings
ALTER TABLE public.interview_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for interview_ratings
CREATE POLICY "Users can view ratings for their interviews" 
ON public.interview_ratings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = interview_ratings.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create ratings for their interviews" 
ON public.interview_ratings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interviews 
    WHERE interviews.id = interview_ratings.interview_id 
    AND interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own ratings" 
ON public.interview_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Usage analytics table
CREATE TABLE public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'upload', 'process', 'download', 'share'
  resource_type TEXT, -- 'interview', 'template', 'summary'
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on usage_analytics
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_analytics
CREATE POLICY "Users can view their own analytics" 
ON public.usage_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics" 
ON public.usage_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_interviews_user_id_created_at ON public.interviews(user_id, created_at DESC);
CREATE INDEX idx_interview_summaries_interview_id ON public.interview_summaries(interview_id);
CREATE INDEX idx_share_links_access_token ON public.share_links(access_token);
CREATE INDEX idx_share_links_expires_at ON public.share_links(expires_at);
CREATE INDEX idx_interview_comments_interview_id ON public.interview_comments(interview_id);
CREATE INDEX idx_usage_analytics_user_id_created_at ON public.usage_analytics(user_id, created_at DESC);

-- Add triggers for updated_at columns
CREATE TRIGGER update_interview_comments_updated_at
  BEFORE UPDATE ON public.interview_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_ratings_updated_at
  BEFORE UPDATE ON public.interview_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track usage analytics
CREATE OR REPLACE FUNCTION public.track_usage(
  p_action_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_analytics (
    user_id,
    action_type,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;