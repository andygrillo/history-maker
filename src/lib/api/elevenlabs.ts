const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
}

interface VoicesResponse {
  voices: Voice[];
}

// Premade voices with verified preview URLs from ElevenLabs CDN
export const PREMADE_VOICES: Voice[] = [
  // Male voices
  {
    voice_id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    description: 'British male, deep, documentary style',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3',
  },
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'American male, deep, authoritative',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/d6905d7a-dd26-4187-bfff-1bd3a5ea7cac.mp3',
  },
  {
    voice_id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    description: 'American male, deep, narration',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/2dd3e72c-4fd3-42f1-93ea-abc5d4e5aa1d.mp3',
  },
  {
    voice_id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger',
    description: 'American male, confident, middle-aged',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3',
  },
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    description: 'British male, warm, raspy',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3',
  },
  {
    voice_id: 'N2lVS1w4EtoT3dr4eOWO',
    name: 'Callum',
    description: 'Transatlantic male, intense, hoarse',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3',
  },
  {
    voice_id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'Liam',
    description: 'American male, young, articulate',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3',
  },
  {
    voice_id: 'SOYHLrjzK2X1ezoPC6cr',
    name: 'Harry',
    description: 'American male, young, anxious',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SOYHLrjzK2X1ezoPC6cr/86d178f6-f4b6-4e0e-85be-3de19f490794.mp3',
  },
  {
    voice_id: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie',
    description: 'Australian male, natural, conversational',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3',
  },
  {
    voice_id: 'cjVigY5qzO86Huf0OWal',
    name: 'Eric',
    description: 'American male, friendly, middle-aged',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3',
  },
  {
    voice_id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'American male, casual, middle-aged',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3',
  },
  {
    voice_id: 'bIHbv24MWmeRgasZH58o',
    name: 'Will',
    description: 'American male, friendly, young',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3',
  },
  {
    voice_id: 'pqHfZKP75CvOlQylNhV4',
    name: 'Bill',
    description: 'American male, trustworthy, documentary',
    category: 'male',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3',
  },
  // Female voices
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'American female, soft, news',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3',
  },
  {
    voice_id: 'FGY2WhTYpPnrIDTdsKH5',
    name: 'Laura',
    description: 'American female, upbeat, young',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/67341759-ad08-41a5-be6e-de12fe448618.mp3',
  },
  {
    voice_id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    description: 'British female, warm, raspy',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3',
  },
  {
    voice_id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'American female, warm, friendly',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3',
  },
  {
    voice_id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    description: 'British female, confident, middle-aged',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3',
  },
  {
    voice_id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Jessica',
    description: 'American female, expressive, young',
    category: 'female',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3',
  },
  // Non-binary voices
  {
    voice_id: 'SAz9YHcvj6GT2YYXdXww',
    name: 'River',
    description: 'American non-binary, confident, middle-aged',
    category: 'non-binary',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3',
  },
];

// Get premade voices (no API call needed)
export function getPremadeVoices(): Voice[] {
  return PREMADE_VOICES;
}

// Get voice by ID
export function getVoiceById(voiceId: string): Voice | undefined {
  return PREMADE_VOICES.find((v) => v.voice_id === voiceId);
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
