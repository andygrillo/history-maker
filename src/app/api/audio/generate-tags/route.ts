import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

const AUDIO_TAGGING_SYSTEM = `You are an expert at preparing scripts for text-to-dialogue AI voice generation.

Your task is to add emotional/delivery tags AND natural breaks to narration scripts
to make them more expressive and natural when converted to speech using ElevenLabs
Text-to-Dialogue API.

AVAILABLE TAGS (use these sparingly and strategically):
- Emotions: [sad], [happy], [excited], [serious], [angry], [fearful], [hopeful],
            [melancholic], [triumphant]
- Delivery: [whispering], [speaking softly], [speaking firmly], [speaking slowly],
            [speaking quickly], [with emphasis]
- Tone: [dramatically], [thoughtfully], [solemnly], [cheerfully], [gravely], [wistfully]

RULES:
1. Add tags BEFORE the relevant sentence or phrase, not after
2. Use tags sparingly - only where they enhance the emotional impact
3. Don't add tags to every sentence - use them at key dramatic moments
4. Match the tag to the content's natural emotional tone
5. ADD BREAKS for natural pacing:
   - Use "..." for dramatic pauses mid-sentence or before important reveals
   - Use "—" for abrupt interruptions or sudden shifts
   - Add line breaks between paragraphs or topic shifts for breathing room
   - Insert "..." after impactful statements to let them land
6. Preserve ALL original text - only ADD tags and breaks, never remove content
7. Output ONLY the tagged script with no explanations or commentary`;

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

    const { script } = await request.json();

    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    // Get Bedrock API key from environment
    const bedrockApiKey = process.env.BEDROCK_API_KEY;
    if (!bedrockApiKey) {
      return NextResponse.json({ error: 'Bedrock API key not configured' }, { status: 500 });
    }

    const client = createBedrockClient({
      apiKey: bedrockApiKey,
    });

    const userPrompt = `Add emotional tags and natural breaks to this narration script:

${script}`;

    const taggedText = await invokeClaudeModel({
      client,
      model: 'haiku', // Use Haiku for faster/cheaper processing
      messages: [{ role: 'user', content: userPrompt }],
      system: AUDIO_TAGGING_SYSTEM,
      maxTokens: 8192,
      temperature: 0.3, // Lower temperature for more consistent output
    });

    return NextResponse.json({ taggedText });
  } catch (error) {
    console.error('Audio tagging error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate audio tags' },
      { status: 500 }
    );
  }
}
