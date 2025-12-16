import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, R2Config, getContentType, getExtension } from '@/lib/storage/r2';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, audioBase64, taggedText, voiceId, stability, timestamps, outputFormat } =
      await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    if (!audioBase64) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    // Get video and verify ownership
    const { data: video } = await supabase
      .from('videos')
      .select('id, series_id, series:series_id(user_id)')
      .eq('id', videoId)
      .single();

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Handle both array and object formats from Supabase join
    const seriesData = video.series;
    const series = Array.isArray(seriesData) ? seriesData[0] : seriesData;
    if (!series || (series as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get script for this video
    const { data: script } = await supabase
      .from('scripts')
      .select('id')
      .eq('video_id', videoId)
      .single();

    if (!script) {
      return NextResponse.json({ error: 'Script not found for this video' }, { status: 404 });
    }

    // Get R2 config from user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('r2_endpoint, r2_bucket_name, r2_access_key, r2_secret_key, r2_public_url')
      .eq('user_id', user.id)
      .single();

    if (
      !settings?.r2_endpoint ||
      !settings?.r2_bucket_name ||
      !settings?.r2_access_key ||
      !settings?.r2_secret_key ||
      !settings?.r2_public_url
    ) {
      return NextResponse.json(
        { error: 'R2 storage not configured. Please add R2 credentials in Settings.' },
        { status: 400 }
      );
    }

    const r2Config: R2Config = {
      endpoint: settings.r2_endpoint,
      bucketName: settings.r2_bucket_name,
      accessKey: settings.r2_access_key,
      secretKey: settings.r2_secret_key,
      publicUrl: settings.r2_public_url,
    };

    // Generate a unique audio ID
    const audioId = crypto.randomUUID();

    // Convert base64 to buffer (strip data URL prefix if present)
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const format = outputFormat || 'mp3_44100_128';
    const extension = getExtension(format);
    const contentType = getContentType(format);

    // Upload to R2
    const r2Url = await uploadToR2(r2Config, {
      userId: user.id,
      seriesId: video.series_id,
      videoId,
      assetType: 'audio',
      assetId: audioId,
      data: audioBuffer,
      contentType,
      extension,
    });

    // Save audio record to database
    const { data: audioRecord, error: insertError } = await supabase
      .from('audios')
      .insert({
        id: audioId,
        script_id: script.id,
        tagged_text: taggedText,
        voice_id: voiceId,
        stability: stability || 0.5,
        r2_url: r2Url,
        timestamps: timestamps || [],
      })
      .select('id, r2_url, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      id: audioRecord.id,
      url: audioRecord.r2_url,
      createdAt: audioRecord.created_at,
    });
  } catch (error) {
    console.error('Audio save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save audio' },
      { status: 500 }
    );
  }
}
