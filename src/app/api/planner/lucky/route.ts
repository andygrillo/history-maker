import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bedrockApiKey = process.env.BEDROCK_API_KEY;
    if (!bedrockApiKey) {
      return NextResponse.json({ error: 'Bedrock API key not configured' }, { status: 500 });
    }

    const client = createBedrockClient({
      apiKey: bedrockApiKey,
    });

    const result = await invokeClaudeModel({
      client,
      model: 'haiku',
      system: `You are a creative documentary producer. Generate a single compelling topic for a YouTube documentary series. Be specific but not overly narrow. Just respond with the topic itself, no explanation.`,
      messages: [{
        role: 'user',
        content: 'Suggest one interesting documentary topic.'
      }],
      maxTokens: 100,
      temperature: 1.0,
    });

    return NextResponse.json({ topic: result.trim() });
  } catch (error) {
    console.error('Lucky topic generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate topic' },
      { status: 500 }
    );
  }
}
