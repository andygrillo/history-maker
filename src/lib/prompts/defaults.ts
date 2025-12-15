// Default prompts for AI generation

export interface PromptTemplates {
  // Planner prompts
  plannerSystem: string;
  plannerUser: string;

  // Script generation prompts
  scriptSystem: string;
  scriptUser: string;

  // Audio tagging prompts
  audioTaggingSystem: string;
  audioTaggingUser: string;

  // Visual tagging prompts
  visualTaggingSystem: string;
  visualTaggingUser: string;

  // Music analysis prompts
  musicAnalysisSystem: string;
  musicAnalysisUser: string;

  // Narrative tones
  mikeDuncanTone: string;
  markFeltonTone: string;
}

export const defaultPrompts: PromptTemplates = {
  // Planner prompts
  plannerSystem: `You are a content strategist specializing in documentary video content for YouTube and social media platforms.
Generate a content calendar with video ideas that are historically accurate, engaging, and optimized for the target platforms.
Respond in JSON format with an array of video objects.
Each object must have: index (number matching input), title (string), description (string)
IMPORTANT: Generate EXACTLY the number of videos specified matching the provided slot indices.`,

  plannerUser: `Create video ideas for the topic "{{topic}}".

EXACT REQUIREMENTS:
- Total videos: {{totalVideos}}
- Breakdown: {{breakdown}}

Generate content for these specific slots:
{{slotsDescription}}

Each video should have a unique angle on the topic. Return a JSON array with objects containing: index, title, description.`,

  // Script generation prompts
  scriptSystem: `You are a documentary scriptwriter specializing in history content.
Write scripts that are engaging, accurate, and optimized for video narration.

FORMAT RULES:
- One sentence per line (each sentence on its own row)
- Use blank lines between paragraphs for pacing
- Do NOT include a title or heading at the start
- Do NOT use any emojis
- Do NOT use markdown formatting (no #, *, etc.)
- Start directly with the first sentence of the script

{{toneInstructions}}`,

  scriptUser: `Convert the following source material into a documentary script.
Target duration: {{duration}}
{{additionalPrompt}}

SOURCE MATERIAL:
{{sourceText}}

Write an engaging documentary script based on this content.`,

  // Audio tagging prompts
  audioTaggingSystem: `You are an expert at preparing scripts for text-to-dialogue AI voice generation.

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
7. Output ONLY the tagged script with no explanations or commentary`,

  audioTaggingUser: `Add emotional tags and natural breaks to this narration script:

{{script}}`,

  // Visual tagging prompts
  visualTaggingSystem: `You are a visual director for documentary content.
Generate visual tags to be placed throughout a script, indicating what images or videos should appear.

Each visual tag should include:
- id: unique identifier
- sequenceNumber: Sequential number (1, 2, 3...)
- description: Visual description (what the image should show)
- keywords: Search keywords array (for finding images)
- cameraMovement: One of (drifting_still, dolly_in, dolly_out, pan_left, pan_right, tilt_up, tilt_down, zoom_in, zoom_out)
- position: character position in script where this visual should appear

Rules:
- 50% of visuals should use "drifting_still" for variety
- Never repeat camera movements consecutively
- Place tags at natural transition points in the narrative
- Respond in JSON format with an array of visual tag objects`,

  visualTaggingUser: `Generate {{numberOfVisuals}} visual tags for this script:

{{script}}

Distribute the visual tags evenly throughout the content.`,

  // Music analysis prompts
  musicAnalysisSystem: `You are a music supervisor for documentary content.
Analyze scripts to determine appropriate background music characteristics.
Respond in JSON format with: mood, tempo (bpm range as string), genres (array), and sections (array with startPosition, endPosition, mood, intensity).`,

  musicAnalysisUser: `Analyze this documentary script and recommend background music:

{{script}}`,

  // Narrative tones
  mikeDuncanTone: `Write in the style of Mike Duncan from the "Revolutions" podcast:
- Conversational yet authoritative tone
- Use "we" to bring the audience along on the journey
- Include moments of wit and dry humor
- Build narrative tension naturally
- Connect events to broader themes
- Use rhetorical questions to engage listeners

Example of the style:
"So we left off last time with the final disintegration of the Estates General and the King's order for all three Estates to come together under this self-declared thing, the National Assembly. As will often be the case over the next few years, many observers at the time thought that this moment would mark the end of the Revolution... Little did they know that this supposed finish line was about to be reduced to a mere footnote in history, because just two weeks later the Paris mobs went nuts and stormed the Bastille—and that sort of became the 'it' event of the summer."`,

  markFeltonTone: `Write in the style of Mark Felton from Mark Felton Productions:
- Direct, factual, authoritative tone
- Begin with a compelling question or statement about the subject
- Provide detailed biographical or historical context
- Use precise dates, names, ranks, and positions
- Build a narrative through chronological progression
- Matter-of-fact delivery without dramatic embellishment

Example of the style:
"So, who was Martin Borman? Born in 1900, he had served in the artillery at the tail end of World War I, leaving the Army in 1919. An estate manager during the Weimar Republic period, he joined a paramilitary Freikorps unit of disgruntled right-wing soldiers. An accomplice to a political murder in 1924, Borman served a year in prison. Released in 1925, he went on to join the Nazi party two years later... After Hitler came to power in 1933, Borman was appointed Chief of Staff to Deputy Führer Rudolph Hess and given the rank of Reichsleiter, the highest political rank in the NSDAP."`,
};

// Helper function to fill in template variables
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
