import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, transcript, templateId } = await req.json();
    
    // Create Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth user from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log(`Processing interview ${interviewId} for user ${user.id}`);

    // Get template if specified
    let template = null;
    if (templateId) {
      const { data: templateData } = await supabase
        .from('summary_templates')
        .select('template_content')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single();
      template = templateData?.template_content;
    }

    // Create AI prompt based on template or default structure
    const systemPrompt = template ? 
      `You are an expert hiring manager analyzing interview transcripts. Use this template structure: ${JSON.stringify(template)}` :
      `You are an expert hiring manager analyzing interview transcripts. Provide a structured analysis with the following sections:
      1. Job Summary - Brief overview of the role and key requirements
      2. Must-Haves - Critical skills and qualifications mentioned
      3. Challenges - Potential concerns or red flags identified
      4. Job Description - Suggested improvements to job posting
      5. Recap Email - Draft follow-up email to candidate
      
      Return your response as a JSON object with these exact keys: jobSummary, mustHaves, challenges, jobDescription, recapEmail`;

    const startTime = Date.now();

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this interview transcript:\n\n${transcript}` }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse JSON response or structure it if plain text
    let summaryContent;
    try {
      summaryContent = JSON.parse(aiResponse);
    } catch {
      // Fallback if not JSON format
      summaryContent = {
        jobSummary: aiResponse.substring(0, 500),
        mustHaves: 'Please review the full analysis',
        challenges: 'Please review the full analysis',
        jobDescription: 'Please review the full analysis',
        recapEmail: 'Please review the full analysis'
      };
    }

    const processingTime = Math.floor((Date.now() - startTime) / 1000);

    // Save summary to database
    const { data: summary, error: summaryError } = await supabase
      .from('interview_summaries')
      .insert({
        interview_id: interviewId,
        template_id: templateId,
        summary_content: summaryContent,
        processing_time_seconds: processingTime,
        ai_model_used: 'gpt-4o-mini',
        transcript_text: transcript
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
      throw summaryError;
    }

    // Update interview status
    await supabase
      .from('interviews')
      .update({ status: 'completed' })
      .eq('id', interviewId);

    console.log(`Successfully processed interview ${interviewId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      summary: summaryContent,
      summaryId: summary.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-interview function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});