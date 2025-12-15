import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seriesId, topic, format, scheduledDate, existingTitles, existingId } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    if (!seriesId) {
      return NextResponse.json({ error: 'Series ID is required' }, { status: 400 });
    }

    // Verify series belongs to user
    const { data: series } = await supabase
      .from('series')
      .select('id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single();

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    // Get Bedrock API key from environment
    const bedrockApiKey = process.env.BEDROCK_API_KEY;
    if (!bedrockApiKey) {
      return NextResponse.json({ error: 'Bedrock API key not configured' }, { status: 500 });
    }

    const client = createBedrockClient({
      apiKey: bedrockApiKey,
    });

    const formatLabels: Record<string, string> = {
      youtube: 'YouTube long-form video (10-20 minutes)',
      youtube_short: 'YouTube Short (under 60 seconds)',
      tiktok: 'TikTok video (15-60 seconds)',
    };

    const existingTitlesNote = existingTitles && existingTitles.length > 0
      ? `\n\nIMPORTANT: Do NOT use any of these existing titles or similar ideas:\n${existingTitles.map((t: string) => `- ${t}`).join('\n')}`
      : '';

    const system = `You are a content strategist specializing in documentary video content.
Generate a single unique, engaging video idea for the given topic and format.
Respond in JSON format with: { "title": "string", "description": "string" }
The title should be catchy and specific. The description should be 1-2 sentences explaining the angle.`;

    const userPrompt = `Generate a unique video idea about "${topic}" for ${formatLabels[format] || format}.${existingTitlesNote}`;

    const result = await invokeClaudeModel({
      client,
      model: 'haiku', // Use Haiku for speed and cost
      messages: [{ role: 'user', content: userPrompt }],
      system,
      maxTokens: 500,
    });

    // Parse the response
    let videoIdea;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        videoIdea = JSON.parse(jsonMatch[0]);
      } else {
        videoIdea = JSON.parse(result);
      }
    } catch {
      // Fallback if parsing fails
      videoIdea = {
        title: `${topic} - ${format}`,
        description: `A video about ${topic}`,
      };
    }

    // Save or update in database
    let videoId = existingId;

    if (existingId) {
      // Update existing video
      await supabase
        .from('videos')
        .update({
          title: videoIdea.title,
          description: videoIdea.description,
        })
        .eq('id', existingId);
    } else {
      // Create new video
      const { data: newVideo } = await supabase
        .from('videos')
        .insert({
          series_id: seriesId,
          title: videoIdea.title,
          description: videoIdea.description,
          format,
          scheduled_date: scheduledDate,
          status: 'planned',
        })
        .select('id')
        .single();

      if (newVideo) {
        videoId = newVideo.id;
      }
    }

    return NextResponse.json({
      id: videoId,
      title: videoIdea.title,
      description: videoIdea.description,
    });
  } catch (error) {
    console.error('Single video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video idea' },
      { status: 500 }
    );
  }
}
