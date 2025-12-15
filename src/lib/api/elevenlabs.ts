const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
  labels: Record<string, string>;
}

interface VoicesResponse {
  voices: Voice[];
}

interface TimestampAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TextToSpeechWithTimestampsResponse {
  audio_base64: string;
  alignment: TimestampAlignment;
  normalized_alignment: TimestampAlignment;
}

interface TextToDialogueInput {
  text: string;
  voice_id: string;
}

interface TextToDialogueResponse {
  audio_base64: string;
  alignment: TimestampAlignment;
  normalized_alignment: TimestampAlignment;
  voice_segments: Array<{
    voice_id: string;
    start_time_seconds: number;
    end_time_seconds: number;
    character_start_index: number;
    character_end_index: number;
  }>;
}

export async function getVoices(apiKey: string): Promise<Voice[]> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.statusText}`);
  }

  const data: VoicesResponse = await response.json();
  return data.voices;
}

export async function textToSpeechWithTimestamps(
  apiKey: string,
  voiceId: string,
  text: string,
  options?: {
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    outputFormat?: string;
  }
): Promise<{
  audio: Buffer;
  timestamps: Array<{ text: string; startTime: number; endTime: number }>;
}> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/with-timestamps?output_format=${options?.outputFormat || 'mp3_44100_128'}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: options?.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options?.stability ?? 0.5,
          similarity_boost: options?.similarityBoost ?? 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate speech: ${response.statusText} - ${errorText}`);
  }

  const data: TextToSpeechWithTimestampsResponse = await response.json();

  // Convert base64 audio to buffer
  const audio = Buffer.from(data.audio_base64, 'base64');

  // Parse character-level timestamps into word/phrase timestamps
  const timestamps = parseTimestamps(
    data.normalized_alignment.characters,
    data.normalized_alignment.character_start_times_seconds,
    data.normalized_alignment.character_end_times_seconds
  );

  return { audio, timestamps };
}

export async function textToDialogueWithTimestamps(
  apiKey: string,
  inputs: TextToDialogueInput[],
  options?: {
    modelId?: string;
    outputFormat?: string;
  }
): Promise<TextToDialogueResponse> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-dialogue/with-timestamps?output_format=${options?.outputFormat || 'mp3_44100_128'}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        model_id: options?.modelId || 'eleven_multilingual_v2',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate dialogue: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Helper function to parse character-level timestamps into word/phrase timestamps
function parseTimestamps(
  characters: string[],
  startTimes: number[],
  endTimes: number[]
): Array<{ text: string; startTime: number; endTime: number }> {
  const timestamps: Array<{ text: string; startTime: number; endTime: number }> = [];
  let currentWord = '';
  let wordStartTime = 0;
  let wordEndTime = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const startTime = startTimes[i];
    const endTime = endTimes[i];

    if (char === ' ' || char === '\n' || char === '.' || char === ',' || char === '!' || char === '?') {
      if (currentWord.length > 0) {
        timestamps.push({
          text: currentWord,
          startTime: wordStartTime,
          endTime: wordEndTime,
        });
        currentWord = '';
      }

      // Handle punctuation as separate entries for pause timing
      if (char !== ' ' && char !== '\n') {
        timestamps.push({
          text: char,
          startTime,
          endTime,
        });
      }
    } else {
      if (currentWord.length === 0) {
        wordStartTime = startTime;
      }
      currentWord += char;
      wordEndTime = endTime;
    }
  }

  // Don't forget the last word
  if (currentWord.length > 0) {
    timestamps.push({
      text: currentWord,
      startTime: wordStartTime,
      endTime: wordEndTime,
    });
  }

  return timestamps;
}

// Helper to process tagged text for ElevenLabs
export function processTaggedText(taggedText: string): string {
  // Remove our custom tags that ElevenLabs doesn't understand
  // but keep the text content
  let processed = taggedText;

  // Remove [dramatic], [whispered], etc. tags
  const tagPattern = /\[(dramatic|whispered|urgent|calm|excited|somber)\]/g;
  processed = processed.replace(tagPattern, '');

  // Convert ... to actual pauses (ElevenLabs uses <break> SSML)
  processed = processed.replace(/\.\.\./g, ' <break time="0.5s"/> ');

  // Remove pronunciation guides (parentheses) - ElevenLabs handles these differently
  // Keep them for now as they might help with context

  return processed.trim();
}

// Get voice preview URL for a specific voice
export function getVoicePreviewUrl(voice: Voice): string {
  return voice.preview_url;
}
