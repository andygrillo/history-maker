import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const bedrockApiKey = process.env.BEDROCK_API_KEY;
    if (!bedrockApiKey) {
      return NextResponse.json({ error: 'Bedrock API key not configured' }, { status: 500 });
    }

    const client = createBedrockClient({ apiKey: bedrockApiKey });

    const system = `You are a research assistant. Generate optimal search keywords for finding Wikipedia articles about historical topics.
Return ONLY a JSON array of exactly 3 search terms that would help find relevant Wikipedia articles.
The keywords should capture the main subject, key figures, and relevant historical context.
Example output: ["Napoleon Bonaparte", "French Revolution military", "Battle of Austerlitz"]`;

    const userPrompt = `Generate 3 Wikipedia search keywords for this video topic: "${title}"`;

    const response = await invokeClaudeModel({
      client,
      model: 'haiku',
      messages: [{ role: 'user', content: userPrompt }],
      system,
      maxTokens: 256,
      temperature: 0.3,
    });

    let keywords: string[];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keywords = JSON.parse(jsonMatch[0]);
      } else {
        keywords = JSON.parse(response);
      }
    } catch {
      // Fallback: extract from text
      keywords = response
        .replace(/[\[\]"]/g, '')
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('Keyword generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate keywords' },
      { status: 500 }
    );
  }
}
