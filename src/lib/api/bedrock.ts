interface BedrockConfig {
  region?: string;
  apiKey: string;
}

interface BedrockClient {
  region: string;
  apiKey: string;
}

export function createBedrockClient(config: BedrockConfig): BedrockClient {
  return {
    region: config.region || 'us-east-1',
    apiKey: config.apiKey,
  };
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InvokeClaudeOptions {
  client: BedrockClient;
  model?: 'sonnet' | 'opus' | 'haiku';
  messages: ConversationMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

// Model IDs for Claude on Bedrock (cross-region inference profiles)
const CLAUDE_MODELS = {
  sonnet: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  opus: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  haiku: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
} as const;

export async function invokeClaudeModel({
  client,
  model = 'sonnet',
  messages,
  system,
  maxTokens = 4096,
  temperature = 0.7,
}: InvokeClaudeOptions): Promise<string> {
  const modelId = CLAUDE_MODELS[model];
  const endpoint = `https://bedrock-runtime.${client.region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
  }

  const responseBody = await response.json();
  return responseBody.content[0].text;
}

// Convenience functions for specific use cases

export async function generateContentCalendar(
  client: BedrockClient,
  topic: string,
  platforms: string[],
  weeklyGoal: number,
  timeHorizon: string
): Promise<string> {
  // Calculate weeks from time horizon
  const weeksMap: Record<string, number> = {
    '1_week': 1,
    '1_month': 4,
    '3_months': 12,
  };
  const weeks = weeksMap[timeHorizon] || 1;

  // Calculate total videos
  const totalVideos = weeks * weeklyGoal;

  // Calculate platform breakdown with 1:3 ratio (youtube:others)
  const hasYoutube = platforms.includes('youtube');
  const otherPlatforms = platforms.filter(p => p !== 'youtube');

  let platformBreakdown: Record<string, number> = {};

  if (hasYoutube && otherPlatforms.length > 0) {
    // 1:3 ratio - youtube gets 1/4 of total, others split the remaining 3/4
    const youtubeCount = Math.max(1, Math.round(totalVideos / 4));
    const othersTotal = totalVideos - youtubeCount;
    const perOtherPlatform = Math.floor(othersTotal / otherPlatforms.length);
    const remainder = othersTotal % otherPlatforms.length;

    platformBreakdown['youtube'] = youtubeCount;
    otherPlatforms.forEach((platform, index) => {
      platformBreakdown[platform] = perOtherPlatform + (index < remainder ? 1 : 0);
    });
  } else if (hasYoutube) {
    // Only youtube selected
    platformBreakdown['youtube'] = totalVideos;
  } else {
    // No youtube, split evenly among other platforms
    const perPlatform = Math.floor(totalVideos / otherPlatforms.length);
    const remainder = totalVideos % otherPlatforms.length;
    otherPlatforms.forEach((platform, index) => {
      platformBreakdown[platform] = perPlatform + (index < remainder ? 1 : 0);
    });
  }

  // Build exact breakdown string for prompt
  const breakdownStr = Object.entries(platformBreakdown)
    .map(([platform, count]) => `${count} ${platform.replace('_', ' ')} videos`)
    .join(', ');

  const system = `You are a content strategist specializing in documentary video content for YouTube and social media platforms.
Generate a content calendar with video ideas that are historically accurate, engaging, and optimized for the target platforms.
Respond in JSON format with an array of video objects containing: title, description, format (youtube, youtube_short, or tiktok), scheduledDate.
IMPORTANT: Generate EXACTLY the number of videos specified for each platform - no more, no less.`;

  const userPrompt = `Create a content calendar for the topic "${topic}".

EXACT VIDEO REQUIREMENTS:
- Total videos: ${totalVideos}
- Breakdown: ${breakdownStr}
- Time period: ${weeks} week(s)

Generate EXACTLY ${totalVideos} video ideas with this exact breakdown:
${Object.entries(platformBreakdown).map(([platform, count]) => `- ${platform}: ${count} videos`).join('\n')}

Each video should have a unique angle on the topic. Schedule them evenly across the ${weeks} week period starting from today.`;

  return invokeClaudeModel({
    client,
    model: 'sonnet',
    messages: [{ role: 'user', content: userPrompt }],
    system,
  });
}

export async function generateScript(
  client: BedrockClient,
  sourceText: string,
  duration: string,
  tone: string,
  additionalPrompt?: string
): Promise<string> {
  const toneDescriptions: Record<string, string> = {
    mike_duncan: `Write in the style of Mike Duncan from the "Revolutions" podcast:
- Conversational yet authoritative tone
- Use "we" to bring the audience along on the journey
- Include moments of wit and dry humor
- Build narrative tension naturally
- Connect events to broader themes
- Use rhetorical questions to engage listeners

Example of the style:
"So we left off last time with the final disintegration of the Estates General and the King's order for all three Estates to come together under this self-declared thing, the National Assembly. As will often be the case over the next few years, many observers at the time thought that this moment would mark the end of the Revolution... Little did they know that this supposed finish line was about to be reduced to a mere footnote in history, because just two weeks later the Paris mobs went nuts and stormed the Bastille—and that sort of became the 'it' event of the summer."`,
    mark_felton: `Write in the style of Mark Felton from Mark Felton Productions:
- Direct, factual, authoritative tone
- Begin with a compelling question or statement about the subject
- Provide detailed biographical or historical context
- Use precise dates, names, ranks, and positions
- Build a narrative through chronological progression
- Matter-of-fact delivery without dramatic embellishment

Example of the style:
"So, who was Martin Borman? Born in 1900, he had served in the artillery at the tail end of World War I, leaving the Army in 1919. An estate manager during the Weimar Republic period, he joined a paramilitary Freikorps unit of disgruntled right-wing soldiers. An accomplice to a political murder in 1924, Borman served a year in prison. Released in 1925, he went on to join the Nazi party two years later... After Hitler came to power in 1933, Borman was appointed Chief of Staff to Deputy Führer Rudolph Hess and given the rank of Reichsleiter, the highest political rank in the NSDAP."`,
  };

  const system = `You are a documentary scriptwriter specializing in history content.
Write scripts that are engaging, accurate, and optimized for video narration.

FORMAT RULES:
- One sentence per line (each sentence on its own row)
- Use blank lines between paragraphs for pacing
- Do NOT include a title or heading at the start
- Do NOT use any emojis
- Do NOT use markdown formatting (no #, *, etc.)
- Start directly with the first sentence of the script

${toneDescriptions[tone] || ''}`;

  const userPrompt = `Convert the following source material into a documentary script.
Target duration: ${duration}
${additionalPrompt ? `Additional instructions: ${additionalPrompt}` : ''}

SOURCE MATERIAL:
${sourceText}

Write an engaging documentary script based on this content.`;

  return invokeClaudeModel({
    client,
    model: 'sonnet',
    messages: [{ role: 'user', content: userPrompt }],
    system,
    maxTokens: 8192,
  });
}

export async function generateAudioTags(
  client: BedrockClient,
  script: string
): Promise<string> {
  const system = `You are an audio director for documentary narration.
Your task is to add emotional and delivery tags to scripts for text-to-speech processing.

Available tags:
- [dramatic] - for impactful moments
- [whispered] - for intimate or secretive content
- [urgent] - for tense, action-packed moments
- [calm] - for reflective passages
- [excited] - for discoveries or revelations
- [somber] - for tragic events

Use ... for pauses. Add pronunciation guides in (parentheses) where needed.
Preserve the original text while adding tags at the start of relevant sentences.`;

  const userPrompt = `Add audio tags to this script for voice-over recording:

${script}`;

  return invokeClaudeModel({
    client,
    model: 'haiku', // Use Haiku for cost optimization
    messages: [{ role: 'user', content: userPrompt }],
    system,
  });
}

export async function generateVisualTags(
  client: BedrockClient,
  script: string,
  clipDuration: number,
  totalDuration: number
): Promise<string> {
  const numberOfVisuals = Math.ceil(totalDuration / clipDuration);

  const system = `You are a visual director for documentary content.
Generate visual tags to be placed throughout a script, indicating what images or videos should appear.

Each visual tag should include:
- Sequential number (1, 2, 3...)
- Visual description (what the image should show)
- Search keywords (for finding images)
- Camera movement suggestion (drifting_still, dolly_in, dolly_out, pan_left, pan_right, tilt_up, tilt_down, zoom_in, zoom_out)

Rules:
- 50% of visuals should use "drifting_still" for variety
- Never repeat camera movements consecutively
- Place tags at natural transition points in the narrative
- Respond in JSON format`;

  const userPrompt = `Generate ${numberOfVisuals} visual tags for this script:

${script}

Distribute the visual tags evenly throughout the content.`;

  return invokeClaudeModel({
    client,
    model: 'sonnet',
    messages: [{ role: 'user', content: userPrompt }],
    system,
  });
}

export async function analyzeMusicRequirements(
  client: BedrockClient,
  script: string
): Promise<string> {
  const system = `You are a music supervisor for documentary content.
Analyze scripts to determine appropriate background music characteristics.
Respond in JSON format with: mood, tempo (bpm range), genre suggestions, and specific emotional notes for different sections.`;

  const userPrompt = `Analyze this documentary script and recommend background music:

${script}`;

  return invokeClaudeModel({
    client,
    model: 'haiku',
    messages: [{ role: 'user', content: userPrompt }],
    system,
  });
}

export async function generateWikipediaSearchKeywords(
  client: BedrockClient,
  topic: string
): Promise<string[]> {
  const system = `You are a research assistant. Generate optimal search keywords for finding Wikipedia articles about historical topics.
Return a JSON array of 3-5 search terms, ordered from most specific to most general.`;

  const userPrompt = `Generate Wikipedia search keywords for: ${topic}`;

  const response = await invokeClaudeModel({
    client,
    model: 'haiku',
    messages: [{ role: 'user', content: userPrompt }],
    system,
  });

  try {
    return JSON.parse(response);
  } catch {
    // If parsing fails, extract keywords from text
    return response.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
}
