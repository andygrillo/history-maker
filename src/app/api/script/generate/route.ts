import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';
import { getUserPrompts } from '@/lib/prompts/getUserPrompts';
import { fillTemplate } from '@/lib/prompts/defaults';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, sourceText, duration, tone, additionalPrompt } = body;

    if (!sourceText) {
      return NextResponse.json({ error: 'Source text is required' }, { status: 400 });
    }

    if (!duration) {
      return NextResponse.json({ error: 'Duration is required' }, { status: 400 });
    }

    // Verify video belongs to user (if videoId provided)
    if (videoId) {
      const { data: video } = await supabase
        .from('videos')
        .select('id, series_id')
        .eq('id', videoId)
        .single();

      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      // Verify series belongs to user
      const { data: series } = await supabase
        .from('series')
        .select('user_id')
        .eq('id', video.series_id)
        .single();

      if (!series || series.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get Bedrock API key from environment
    const bedrockApiKey = process.env.BEDROCK_API_KEY;
    if (!bedrockApiKey) {
      return NextResponse.json({ error: 'Bedrock API key not configured' }, { status: 500 });
    }

    const client = createBedrockClient({
      apiKey: bedrockApiKey,
    });

    // Get user-customized prompts (or defaults)
    const prompts = await getUserPrompts(supabase, user.id);

    // Get the appropriate tone instructions
    let toneInstructions = '';
    if (tone === 'mike_duncan') {
      toneInstructions = prompts.mikeDuncanTone;
    } else if (tone === 'mark_felton') {
      toneInstructions = prompts.markFeltonTone;
    }

    // Build system prompt with tone instructions
    const systemPrompt = fillTemplate(prompts.scriptSystem, {
      toneInstructions,
    });

    // Build user prompt
    const userPrompt = fillTemplate(prompts.scriptUser, {
      duration,
      sourceText,
      additionalPrompt: additionalPrompt ? `Additional instructions: ${additionalPrompt}` : '',
    });

    // Generate the script
    const script = await invokeClaudeModel({
      client,
      model: 'sonnet',
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
      maxTokens: 8192,
    });

    // Optionally save script to video record
    if (videoId) {
      await supabase
        .from('videos')
        .update({ script })
        .eq('id', videoId);
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
      { status: 500 }
    );
  }
}
