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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const videoId = formData.get('videoId') as string;
    const seriesId = formData.get('seriesId') as string;
    const visualNumber = formData.get('visualNumber') as string;
    const description = formData.get('description') as string | null;

    if (!file || !videoId || !seriesId || !visualNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: file, videoId, seriesId, visualNumber' },
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension from mime type
    const mimeType = file.type;
    let extension = 'jpg';
    if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('webp')) extension = 'webp';

    // Generate unique visual ID
    const visualId = `visual_${visualNumber}_${Date.now()}`;

    // Upload to R2
    const r2Url = await uploadToR2(r2Config, {
      userId: user.id,
      seriesId,
      videoId,
      assetType: 'images',
      assetId: visualId,
      data: buffer,
      contentType: mimeType,
      extension,
    });

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
            sequence_number: parseInt(visualNumber),
            description: description || undefined,
          },
          { onConflict: 'script_id,sequence_number' }
        )
        .select('id')
        .single();

      if (visualData) {
        // Insert visual variant - uploaded images are NOT AI-generated
        await supabase.from('visual_variants').insert({
          visual_id: visualData.id,
          source_url: r2Url,
          is_ai_generated: false,
          is_selected: true,
        });
      }
    }

    return NextResponse.json({
      imageUrl: r2Url,
      visualId,
      visualNumber: parseInt(visualNumber),
      isAiGenerated: false,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
