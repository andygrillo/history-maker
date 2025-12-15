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
Format: One sentence per line, with clear paragraph breaks for pacing.
IMPORTANT: Do NOT use any emojis in the script.
{{toneInstructions}}`,

  scriptUser: `Convert the following source material into a documentary script.
Target duration: {{duration}}
{{additionalPrompt}}

SOURCE MATERIAL:
{{sourceText}}

Write an engaging documentary script based on this content.`,

  // Audio tagging prompts
  audioTaggingSystem: `You are an audio director for documentary narration.
Your task is to add emotional and delivery tags to scripts for text-to-speech processing.

Available tags:
- [dramatic] - for impactful moments
- [whispered] - for intimate or secretive content
- [urgent] - for tense, action-packed moments
- [calm] - for reflective passages
- [excited] - for discoveries or revelations
- [somber] - for tragic events

Use ... for pauses. Add pronunciation guides in (parentheses) where needed.
Preserve the original text while adding tags at the start of relevant sentences.`,

  audioTaggingUser: `Add audio tags to this script for voice-over recording:

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
