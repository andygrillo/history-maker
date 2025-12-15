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
    const { topic, platforms, weeklyGoal, timeHorizon } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
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
        id: crypto.randomUUID(),
        videoTitle: `${topic} - Introduction`,
        description: `An introduction to ${topic}`,
        format: 'youtube',
        scheduledDate: new Date().toISOString(),
        status: 'planned',
      }];
    }

    // Normalize the items
    const normalizedItems = items.map((item: Record<string, unknown>, index: number) => ({
      id: item.id || crypto.randomUUID(),
      videoTitle: item.videoTitle || item.title || `Video ${index + 1}`,
      description: item.description || '',
      format: item.format || 'youtube',
      scheduledDate: item.scheduledDate || new Date(Date.now() + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'planned',
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
