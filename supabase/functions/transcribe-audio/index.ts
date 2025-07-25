import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and verify user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing audio transcription for user:', user.id);

    const { interviewId, audioData } = await req.json();
    
    if (!interviewId || !audioData) {
      throw new Error('Missing interviewId or audioData');
    }

    console.log('Received audio data for interview:', interviewId);

    // Verify the interview belongs to the user
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (interviewError || !interview) {
      throw new Error('Interview not found or unauthorized');
    }

    // Update interview status to processing
    await supabase
      .from('interviews')
      .update({ status: 'processing' })
      .eq('id', interviewId);

    console.log('Updated interview status to processing');

    // Process audio in chunks to prevent memory issues
    const binaryAudio = processBase64Chunks(audioData);
    console.log('Processed audio data, size:', binaryAudio.length);
    
    // Prepare form data for OpenAI
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' }); // OpenAI Whisper accepts various formats
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'text');

    console.log('Sending audio to OpenAI Whisper...');

    // Send to OpenAI Whisper
    const openAIResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const transcriptionText = await openAIResponse.text();
    console.log('Received transcription from OpenAI, length:', transcriptionText.length);

    if (!transcriptionText || transcriptionText.trim().length === 0) {
      throw new Error('No transcription received from OpenAI');
    }

    // Now process the transcript with the existing process-interview function
    console.log('Processing transcript with AI analysis...');
    
    const processResponse = await supabase.functions.invoke('process-interview', {
      body: {
        interviewId,
        transcript: transcriptionText,
      },
      headers: {
        Authorization: authHeader,
      },
    });

    if (processResponse.error) {
      console.error('Error processing interview:', processResponse.error);
      throw new Error('Failed to process transcript');
    }

    console.log('Successfully completed audio transcription and analysis');

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcription: transcriptionText,
        message: 'Audio transcribed and analyzed successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});