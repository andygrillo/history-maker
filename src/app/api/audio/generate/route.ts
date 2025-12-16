import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const MAX_CHUNK_SIZE = 4500; // Buffer under 5000 char limit

interface TimestampAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TextToDialogueResponse {
  audio_base64: string;
  alignment: TimestampAlignment;
  normalized_alignment: TimestampAlignment;
}

// Process tagged text - v3 models support [tags] natively
function processTaggedText(text: string): string {
  // v3 models support emotion/delivery tags like [sad], [whispering], etc.
  // Just clean up extra whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// Split text into chunks at sentence boundaries
function splitTextIntoChunks(text: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single sentence exceeds max, split by words
      if (sentence.length > maxSize) {
        const words = sentence.split(/\s+/);
        currentChunk = '';
        for (const word of words) {
          if (currentChunk.length + word.length + 1 <= maxSize) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Parse character timestamps into word timestamps
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

      if (char !== ' ' && char !== '\n') {
        timestamps.push({ text: char, startTime, endTime });
      }
    } else {
      if (currentWord.length === 0) {
        wordStartTime = startTime;
      }
      currentWord += char;
      wordEndTime = endTime;
    }
  }

  if (currentWord.length > 0) {
    timestamps.push({
      text: currentWord,
      startTime: wordStartTime,
      endTime: wordEndTime,
    });
  }

  return timestamps;
}

// Generate audio using Text-to-Dialogue API with timestamps
async function generateDialogueAudio(
  apiKey: string,
  voiceId: string,
  text: string,
  outputFormat: string = 'mp3_44100_128'
): Promise<{ audioBuffer: Buffer; alignment: TimestampAlignment }> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-dialogue/with-timestamps?output_format=${outputFormat}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [
          {
            text,
            voice_id: voiceId,
          },
        ],
        model_id: 'eleven_v3',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const data: TextToDialogueResponse = await response.json();
  const audioBuffer = Buffer.from(data.audio_base64, 'base64');

  return {
    audioBuffer,
    alignment: data.normalized_alignment,
  };
}

// Get audio duration from alignment
function getAudioDuration(alignment: TimestampAlignment): number {
  const endTimes = alignment.character_end_times_seconds;
  return endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;
}

// Merge alignments with time offset
function mergeAlignments(
  alignments: TimestampAlignment[],
  durations: number[]
): TimestampAlignment {
  const merged: TimestampAlignment = {
    characters: [],
    character_start_times_seconds: [],
    character_end_times_seconds: [],
  };

  let timeOffset = 0;

  for (let i = 0; i < alignments.length; i++) {
    const alignment = alignments[i];

    merged.characters.push(...alignment.characters);
    merged.character_start_times_seconds.push(
      ...alignment.character_start_times_seconds.map((t) => t + timeOffset)
    );
    merged.character_end_times_seconds.push(
      ...alignment.character_end_times_seconds.map((t) => t + timeOffset)
    );

    timeOffset += durations[i];
  }

  return merged;
}

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

    const { text, voiceId, outputFormat = 'mp3_44100_128' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    // Get ElevenLabs API key from user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('elevenlabs_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.elevenlabs_api_key;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Process tagged text (remove custom tags)
    const processedText = processTaggedText(text);

    // Split into chunks for large texts
    const chunks = splitTextIntoChunks(processedText);

    // Generate audio for each chunk using Text-to-Dialogue API
    const results: Array<{ audioBuffer: Buffer; alignment: TimestampAlignment }> = [];

    for (const chunk of chunks) {
      const result = await generateDialogueAudio(apiKey, voiceId, chunk, outputFormat);
      results.push(result);
    }

    // Calculate durations and merge alignments
    const durations = results.map((r) => getAudioDuration(r.alignment));
    const mergedAlignment = mergeAlignments(
      results.map((r) => r.alignment),
      durations
    );

    // Concatenate audio buffers
    const combinedBuffer = Buffer.concat(results.map((r) => r.audioBuffer));

    // Convert to base64 data URL
    const audioBase64 = combinedBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Parse timestamps for word-level sync
    const timestamps = parseTimestamps(
      mergedAlignment.characters,
      mergedAlignment.character_start_times_seconds,
      mergedAlignment.character_end_times_seconds
    );

    return NextResponse.json({
      audioUrl,
      timestamps,
      duration: durations.reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
