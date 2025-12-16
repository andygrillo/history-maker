import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBedrockClient, invokeClaudeModel } from '@/lib/api/bedrock';

const VISUAL_TAGGING_SYSTEM = `You are an expert documentary editor adding visual cues to narration scripts.

STEP 1: READ THE ENTIRE SCRIPT FIRST
Before adding ANY visual markers, read the complete script from start to end to understand:
- The overall narrative arc and story being told
- Key people, events, places mentioned throughout
- How topics connect and flow into each other
- What comes BEFORE and AFTER each section

This context is CRITICAL for choosing visuals that make sense in the flow.

STEP 2: ADD VISUAL MARKERS
Insert numbered visual markers at natural transition points.

FORMAT: (VISUAL X: description | KEYWORD: single_search_term)

PLACEMENT RULES:
1. ALWAYS start with (VISUAL 1: ...) at the very beginning BEFORE any text
2. Place markers at natural scene transitions, topic changes, or new subjects
3. Number sequentially: (VISUAL 1: ...), (VISUAL 2: ...), etc.
4. Keep ALL original text EXACTLY as written - only ADD markers

VISUAL SELECTION - CONTEXT IS KEY:
- Each visual must fit what is being discussed AT THAT MOMENT
- Consider what came before AND what comes after
- For people mentioned: use their portrait
- For events/battles: use a depiction of that specific event
- For places: use a painting or illustration of that location
- NEVER use maps unless text EXPLICITLY discusses geography/borders/territories
- NEVER invent atmospheric scenes (stormy nights, dramatic skies) not in the text
- Each description should be 10-20 words, factual and searchable

KEYWORD - THE MOST IMPORTANT PART:
The keyword will be typed into Wikimedia Commons to find this image.

GOOD KEYWORDS (specific, searchable):
- "Toussaint Louverture" (full name finds portraits)
- "Battle of Vertières" (specific event finds paintings)
- "Napoleon Bonaparte" (full name finds portraits)
- "HMS Victory" (specific ship)
- "Versailles Palace" (specific place)

BAD KEYWORDS (too vague):
- "Caribbean", "slavery", "colonial", "revolution", "battle scene", "historical"
- Any generic descriptor or adjective
- Media type words: painting, portrait, engraving, illustration

KEYWORD RULES:
- Use ONE keyword (can be 2-3 words like "Napoleon Bonaparte")
- ALWAYS use full proper names for people
- ALWAYS use specific event names, place names, or proper nouns
- The keyword must be something you would actually type into an image search`;

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
      model: 'sonnet', // Better quality for understanding context
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
