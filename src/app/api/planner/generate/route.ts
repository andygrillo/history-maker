import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

interface Slot {
  index: number;
  format: string;
  scheduledDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seriesId, topic, slots } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    if (!seriesId) {
      return NextResponse.json({ error: 'Series ID is required' }, { status: 400 });
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({ error: 'Slots are required' }, { status: 400 });
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

    // Count videos by format
    const formatCounts: Record<string, number> = {};
    (slots as Slot[]).forEach((slot) => {
      formatCounts[slot.format] = (formatCounts[slot.format] || 0) + 1;
    });

    const formatLabels: Record<string, string> = {
      youtube: 'YouTube long-form',
      youtube_short: 'YouTube Shorts',
      tiktok: 'TikTok',
    };

    const breakdownStr = Object.entries(formatCounts)
      .map(([format, count]) => `${count} ${formatLabels[format] || format}`)
      .join(', ');

    const system = `You are a content strategist specializing in documentary video content for YouTube and social media platforms.
Generate a content calendar with video ideas that are historically accurate, engaging, and optimized for the target platforms.
Respond in JSON format with an array of video objects.
Each object must have: index (number matching input), title (string), description (string)
IMPORTANT: Generate EXACTLY ${slots.length} videos matching the provided slot indices.`;

    const slotsDescription = (slots as Slot[])
      .map((s) => `- Index ${s.index}: ${formatLabels[s.format] || s.format}`)
      .join('\n');

    const userPrompt = `Create video ideas for the topic "${topic}".

EXACT REQUIREMENTS:
- Total videos: ${slots.length}
- Breakdown: ${breakdownStr}

Generate content for these specific slots:
${slotsDescription}

Each video should have a unique angle on the topic. Return a JSON array with objects containing: index, title, description.`;

    const result = await invokeClaudeModel({
      client,
      model: 'sonnet',
      messages: [{ role: 'user', content: userPrompt }],
      system,
    });

    // Parse the AI response
    let items;
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        items = JSON.parse(result);
      }
    } catch {
      // If parsing fails, create fallback items
      items = (slots as Slot[]).map((slot, i) => ({
        index: slot.index,
        title: `${topic} - Part ${i + 1}`,
        description: `A video about ${topic}`,
      }));
    }

    // Map generated items back to slots and prepare for database
    const videosToInsert = (slots as Slot[]).map((slot) => {
      const generated = items.find((item: { index: number }) => item.index === slot.index) || {
        title: `${topic} - ${slot.format}`,
        description: `A video about ${topic}`,
      };

      return {
        series_id: seriesId,
        title: generated.title || generated.videoTitle || `Video ${slot.index + 1}`,
        description: generated.description || '',
        format: slot.format,
        scheduled_date: slot.scheduledDate || new Date().toISOString(),
        status: 'planned',
        _slot_index: slot.index, // Temporary field for mapping
      };
    });

    // Insert all videos into the database
    const { data: insertedVideos, error: insertError } = await supabase
      .from('videos')
      .insert(videosToInsert.map(({ _slot_index, ...video }) => video))
      .select('id, title, description, format, scheduled_date, status');

    if (insertError) {
      console.error('Video insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save video ideas' }, { status: 500 });
    }

    // Return items with database IDs and original slot indices
    const normalizedItems = insertedVideos.map((video, idx) => ({
      index: (slots as Slot[])[idx].index,
      id: video.id,
      videoTitle: video.title,
      description: video.description,
      format: video.format,
      scheduledDate: video.scheduled_date,
      status: video.status,
    }));

    return NextResponse.json({ items: normalizedItems });
  } catch (error) {
    console.error('Planner generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate calendar' },
      { status: 500 }
    );
  }
}
