import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seriesId, title, description, format, scheduledDate } = body;

    if (!seriesId || !title) {
      return NextResponse.json({ error: 'Series ID and title are required' }, { status: 400 });
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

    // Create video
    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        series_id: seriesId,
        title,
        description: description || null,
        format: format || 'youtube',
        scheduled_date: scheduledDate || null,
        status: 'planned',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Video creation error:', error);
      return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
    }

    return NextResponse.json({ videoId: video.id });
  } catch (error) {
    console.error('Videos API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('seriesId');

    if (!seriesId) {
      return NextResponse.json({ error: 'Series ID is required' }, { status: 400 });
    }

    // Get videos for series
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('series_id', seriesId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Videos fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Videos API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
