import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateImage } from '@/lib/api/gemini';
import { uploadToR2, R2Config } from '@/lib/storage/r2';

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

    const { videoId, seriesId, visualNumber, description, style, aspectRatio = '16:9' } = await request.json();

    if (!videoId || !seriesId || !visualNumber || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, seriesId, visualNumber, description' },
        { status: 400 }
      );
    }

    // Get user settings (API keys and R2 config)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_gemini_api_key, r2_endpoint, r2_bucket_name, r2_access_key, r2_secret_key, r2_public_url')
      .eq('user_id', user.id)
      .single();

    // Check Gemini API key
    const geminiApiKey = settings?.google_gemini_api_key;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Check R2 config
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

    // Generate image with Gemini
    const styleMap: Record<string, '18th_century_painting' | '20th_century_modern' | 'map' | 'document' | 'photorealistic'> = {
      '18th_century_painting': '18th_century_painting',
      '20th_century_modern': '20th_century_modern',
      'map_style': 'map',
      'document_style': 'document',
    };

    const { imageData, mimeType } = await generateImage(geminiApiKey, description, {
      style: styleMap[style] || '18th_century_painting',
      aspectRatio: aspectRatio || '16:9',
    });

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    const extension = mimeType.includes('png') ? 'png' : 'jpg';

    // Generate unique visual ID
    const visualId = `visual_${visualNumber}_${Date.now()}`;

    // Upload to R2
    const r2Url = await uploadToR2(r2Config, {
      userId: user.id,
      seriesId,
      videoId,
      assetType: 'images',
      assetId: visualId,
      data: imageBuffer,
      contentType: mimeType,
      extension,
    });

    // Save to database (visuals table)
    const { data: scriptData } = await supabase
      .from('scripts')
      .select('id')
      .eq('video_id', videoId)
      .single();

    if (scriptData) {
      await supabase.from('visuals').insert({
        script_id: scriptData.id,
        sequence_number: visualNumber,
        description,
        r2_url: r2Url,
        style,
      });
    }

    return NextResponse.json({
      imageUrl: r2Url,
      visualId,
      visualNumber,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
