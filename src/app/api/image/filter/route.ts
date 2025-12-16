import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { convertToPhoto } from '@/lib/api/gemini';
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

    const { videoId, seriesId, visualNumber, imageUrl, filterType, instructions } = await request.json();

    if (!videoId || !seriesId || !visualNumber || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, seriesId, visualNumber, imageUrl' },
        { status: 400 }
      );
    }

    if (filterType !== 'photorealistic') {
      return NextResponse.json({ error: 'Invalid filter type. Supported: photorealistic' }, { status: 400 });
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

    // Download the source image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch source image: ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const imageBase64 = imageBuffer.toString('base64');

    // Determine mime type from response or URL
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageMimeType = contentType.split(';')[0].trim();

    // Detect aspect ratio from image dimensions
    // We'll use 16:9 as default, but try to match common aspect ratios
    let aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '16:9';

    // Check content-length and try to detect from image header if needed
    // For simplicity, we'll let the prompt instruction handle aspect ratio preservation
    // and not specify an explicit ratio (Gemini should maintain it from the input image)

    // Apply the filter (convert to photorealistic)
    const { imageData, mimeType } = await convertToPhoto(geminiApiKey, imageBase64, imageMimeType, {
      instructions,
      aspectRatio,
    });

    // Convert base64 to buffer
    const filteredBuffer = Buffer.from(imageData, 'base64');
    const extension = mimeType.includes('png') ? 'png' : 'jpg';

    // Generate unique visual ID with filter suffix
    const visualId = `visual_${visualNumber}_photo_${Date.now()}`;

    // Upload to R2
    const r2Url = await uploadToR2(r2Config, {
      userId: user.id,
      seriesId,
      videoId,
      assetType: 'images',
      assetId: visualId,
      data: filteredBuffer,
      contentType: mimeType,
      extension,
    });

    // Update database with processed_url
    const { data: scriptData } = await supabase
      .from('scripts')
      .select('id')
      .eq('video_id', videoId)
      .single();

    if (scriptData) {
      // Find the visual for this sequence number
      const { data: visualData } = await supabase
        .from('visuals')
        .select('id')
        .eq('script_id', scriptData.id)
        .eq('sequence_number', visualNumber)
        .single();

      if (visualData) {
        // Update the selected variant with processed_url
        await supabase
          .from('visual_variants')
          .update({
            processed_url: r2Url,
            filters: ['photorealistic'],
          })
          .eq('visual_id', visualData.id)
          .eq('source_url', imageUrl)
          .eq('is_selected', true);
      }
    }

    return NextResponse.json({
      imageUrl: r2Url,
      visualId,
      visualNumber,
      filterType,
    });
  } catch (error) {
    console.error('Image filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply filter' },
      { status: 500 }
    );
  }
}
