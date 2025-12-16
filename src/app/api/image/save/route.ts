import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const { videoId, seriesId, visualNumber, originalUrl, processedUrl, isAiGenerated, description } =
      await request.json();

    if (!videoId || !seriesId || !visualNumber || !originalUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, seriesId, visualNumber, originalUrl' },
        { status: 400 }
      );
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

    let finalSourceUrl = originalUrl;
    let finalProcessedUrl = processedUrl;

    // Check if originalUrl needs to be uploaded to R2 (external URL)
    const isExternalUrl = !originalUrl.includes(settings.r2_public_url);
    if (isExternalUrl) {
      // Download and upload to R2
      const imageResponse = await fetch(originalUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch source image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine mime type and extension
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.split(';')[0].trim();
      let extension = 'jpg';
      if (mimeType.includes('png')) extension = 'png';
      else if (mimeType.includes('gif')) extension = 'gif';
      else if (mimeType.includes('webp')) extension = 'webp';

      const visualId = `visual_${visualNumber}_source_${Date.now()}`;

      finalSourceUrl = await uploadToR2(r2Config, {
        userId: user.id,
        seriesId,
        videoId,
        assetType: 'images',
        assetId: visualId,
        data: buffer,
        contentType: mimeType,
        extension,
      });
    }

    // Check if processedUrl needs to be uploaded to R2 (external URL)
    if (processedUrl) {
      const isProcessedExternal = !processedUrl.includes(settings.r2_public_url);
      if (isProcessedExternal) {
        const imageResponse = await fetch(processedUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch processed image: ${imageResponse.statusText}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.split(';')[0].trim();
        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('webp')) extension = 'webp';

        const visualId = `visual_${visualNumber}_processed_${Date.now()}`;

        finalProcessedUrl = await uploadToR2(r2Config, {
          userId: user.id,
          seriesId,
          videoId,
          assetType: 'images',
          assetId: visualId,
          data: buffer,
          contentType: mimeType,
          extension,
        });
      }
    }

    // Save to database
    const { data: scriptData } = await supabase
      .from('scripts')
      .select('id')
      .eq('video_id', videoId)
      .single();

    if (scriptData) {
      // Upsert visual (get or create)
      const { data: visualData } = await supabase
        .from('visuals')
        .upsert(
          {
            script_id: scriptData.id,
            sequence_number: visualNumber,
            description: description || undefined,
          },
          { onConflict: 'script_id,sequence_number' }
        )
        .select('id')
        .single();

      if (visualData) {
        // Insert or update visual variant
        await supabase.from('visual_variants').upsert(
          {
            visual_id: visualData.id,
            source_url: finalSourceUrl,
            processed_url: finalProcessedUrl || null,
            is_ai_generated: isAiGenerated || false,
            is_selected: true,
          },
          { onConflict: 'visual_id,source_url' }
        );
      }
    }

    return NextResponse.json({
      sourceUrl: finalSourceUrl,
      processedUrl: finalProcessedUrl,
      visualNumber,
      saved: true,
    });
  } catch (error) {
    console.error('Image save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save image' },
      { status: 500 }
    );
  }
}
