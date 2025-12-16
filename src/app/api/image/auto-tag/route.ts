import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

const VISUAL_TAGGING_SYSTEM = `You are an expert at adding visual cues to documentary narration scripts.

Your task is to insert numbered visual markers into the script at natural transition points.

CRITICAL: Match visuals to WHAT THE TEXT ACTUALLY DISCUSSES. Do NOT invent dramatic scenes (stormy nights, dramatic skies, etc.) that aren't mentioned in the script.

IMPORTANT RULES:
1. Keep ALL original text EXACTLY as written - do not modify any words
2. Only ADD visual markers in this format: (VISUAL X: description | KEYWORD: single_search_term)
3. ALWAYS start with (VISUAL 1: ...) at the very beginning BEFORE any text - this is the opening image
4. Place subsequent markers at natural scene transitions, topic changes, or when a new subject is introduced
5. Number visuals sequentially starting from 1: (VISUAL 1: ...), (VISUAL 2: ...), etc.
6. Visual descriptions should match the content being discussed:
   - PREFER portraits, paintings, and historical scenes
   - For mentions of people: use their portrait
   - For events/battles: use a depiction of that event
   - For places: use a painting or illustration of the location
   - NEVER use maps unless the text EXPLICITLY discusses geography, borders, territories, or locations on a map
   - Do NOT invent atmospheric/cinematic scenes not in the text
7. Each visual description should be 10-20 words, factual and searchable

8. KEYWORD - THIS IS THE MOST IMPORTANT PART:

You must provide ONE single keyword that will be typed into an image search bar to find this exact image.

Imagine you are searching Google Images or Wikimedia Commons. What single search term would you type to find this image?

GOOD KEYWORD EXAMPLES (these work in image search):
- "Toussaint Louverture" (person's full name - finds portraits)
- "Battle of Vertières" (specific battle - finds paintings of this battle)
- "Napoleon Bonaparte" (full name - finds portraits)
- "Storming of the Bastille" (specific event - finds depictions)
- "HMS Victory" (specific ship - finds images of this ship)
- "Versailles Palace" (specific place - finds images)
- "French Revolution 1789" (event + year for specificity)

BAD KEYWORD EXAMPLES (too vague for image search):
- "Caribbean" (too broad - millions of results)
- "slavery" (abstract concept - no specific image)
- "colonial" (adjective, not searchable)
- "revolution" (which one? too generic)
- "battle scene" (generic, not specific)
- "historical" (meaningless in search)
- "map" (never use maps unless text explicitly discusses geography)

RULES:
- Use ONE keyword only (can be 2-3 words like "Napoleon Bonaparte" or "Battle of Waterloo")
- The keyword must be something you would actually type into an image search
- ALWAYS use full proper names for people (first + last name)
- ALWAYS use specific event names, place names, or proper nouns
- NEVER use generic descriptors, adjectives, or abstract concepts
- NEVER use media type words: painting, portrait, engraving, illustration, photograph
- NEVER suggest maps unless the script explicitly discusses geography or territorial changes`;

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

    const { script, visualDuration, numVisuals } = await request.json();

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

    const userPrompt = `Add approximately ${numVisuals} visual markers to this script (targeting ~${visualDuration}s per visual).

VISUAL COUNT AND PACING:
- Target approximately ${numVisuals} visual markers (each visual will display for ~${visualDuration} seconds)
- This is a GUIDELINE, not a strict requirement - prioritize placing visuals at natural content boundaries
- If the content has more or fewer natural transition points, adjust the count accordingly
- Ensure visuals are distributed evenly throughout the script (don't cluster at beginning or end)
- Each major topic, person, event, or scene change should typically have a visual

Let the content guide exact placement - prioritize natural transition points over hitting the exact number.
Keep all original text exactly as-is, only add the visual markers.

SCRIPT:
${script}

Return the complete script with visual markers inserted:`;

    const taggedScript = await invokeClaudeModel({
      client,
      model: 'haiku', // Fast and cost-effective, user can edit keywords if needed
      messages: [{ role: 'user', content: userPrompt }],
      system: VISUAL_TAGGING_SYSTEM,
      maxTokens: 16384,
      temperature: 0.3,
    });

    return NextResponse.json({ taggedScript });
  } catch (error) {
    console.error('Visual tagging error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate visual tags' },
      { status: 500 }
    );
  }
}
