import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, generateContentCalendar } from '@/lib/api/bedrock';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seriesId, topic, platforms, weeklyGoal, timeHorizon } = body;

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

    const result = await generateContentCalendar(
      client,
      topic,
      platforms || ['youtube', 'youtube_short'],
      weeklyGoal || 3,
      timeHorizon || '1_month'
    );

    // Parse the AI response
    let items;
    try {
      // Try to parse as JSON
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        items = JSON.parse(result);
      }
    } catch {
      // If parsing fails, create a simple response
      items = [{
        videoTitle: `${topic} - Introduction`,
        description: `An introduction to ${topic}`,
        format: 'youtube',
        scheduledDate: new Date().toISOString(),
      }];
    }

    // Normalize the items and prepare for database insert
    const videosToInsert = items.map((item: Record<string, unknown>, index: number) => ({
      series_id: seriesId,
      title: item.videoTitle || item.title || `Video ${index + 1}`,
      description: item.description || '',
      format: item.format || 'youtube',
      scheduled_date: item.scheduledDate || new Date(Date.now() + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'planned',
    }));

    // Insert all videos into the database
    const { data: insertedVideos, error: insertError } = await supabase
      .from('videos')
      .insert(videosToInsert)
      .select('id, title, description, format, scheduled_date, status');

    if (insertError) {
      console.error('Video insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save video ideas' }, { status: 500 });
    }

    // Return normalized items with database IDs
    const normalizedItems = insertedVideos.map((video) => ({
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
