const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Image generation models - per CLAUDE.md
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Video generation models
const VIDEO_MODELS = {
  'veo3.1_fast': 'veo-3.1-fast-generate-preview',
  'veo3.1': 'veo-3.1-generate-preview',
} as const;

interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'photorealistic' | '18th_century_painting' | '20th_century_modern' | 'map' | 'document';
}

interface VideoGenerationOptions {
  model?: keyof typeof VIDEO_MODELS;
  duration?: 4 | 6 | 8;
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
}

interface GenerationOperation {
  name: string;
  done: boolean;
  result?: {
    generatedSamples?: Array<{
      video?: {
        uri: string;
      };
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

// Build detailed painting prompt for 18th-19th century style
function buildPaintingPrompt(description: string, aspectRatio?: string): string {
  const aspectInstructions: Record<string, string> = {
    '16:9': 'Create a wide landscape format image (16:9 aspect ratio).',
    '9:16': 'Create a tall portrait format image (9:16 aspect ratio).',
    '1:1': 'Create a square format image (1:1 aspect ratio).',
    '4:3': 'Create a standard format image (4:3 aspect ratio).',
    '3:4': 'Create a portrait format image (3:4 aspect ratio).',
  };

  return `Create an 18th-19th century oil painting in the style of historical academic art.

Subject: ${description}

Style Guidelines:
- Classical academic painting technique with visible brushstrokes
- Rich, warm color palette typical of historical oil paintings
- Dramatic lighting with strong chiaroscuro effects
- Period-accurate costumes, architecture, and details
- Composition following classical rules (golden ratio, rule of thirds)
- Atmospheric perspective for depth
- Fine detail in faces and important elements

${aspectRatio && aspectInstructions[aspectRatio] ? aspectInstructions[aspectRatio] : ''}

Generate a single high-quality painting image.

Avoid: modern elements, anachronisms, text, watermarks`;
}

export async function generateImage(
  apiKey: string,
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<{ imageData: string; mimeType: string }> {
  let fullPrompt: string;

  if (options.style === '18th_century_painting') {
    // Use detailed painting prompt for historical style
    fullPrompt = buildPaintingPrompt(prompt, options.aspectRatio);
  } else {
    // Use simple style prefixes for other styles
    const stylePrompts: Record<string, string> = {
      photorealistic: 'Photorealistic image, high quality photography, natural lighting,',
      '20th_century_modern': 'Modern art style, 20th century illustration, clean lines,',
      map: 'Historical map style, cartographic illustration, aged paper texture,',
      document: 'Historical document style, aged parchment, handwritten or printed text,',
    };
    const stylePrefix = options.style ? stylePrompts[options.style] || '' : '';
    fullPrompt = `${stylePrefix} ${prompt}`;
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: options.aspectRatio || '16:9',
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate image: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  // Find the image part in the response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No image generated in response');
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

export async function expandImage(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  targetAspectRatio: '16:9' | '9:16' = '16:9'
): Promise<{ imageData: string; mimeType: string }> {
  const expandPrompt = `Expand this image to fill a ${targetAspectRatio} frame. ${prompt} Photorealistic, seamless expansion, no frame or border.`;

  const response = await fetch(
    `${GEMINI_API_URL}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: expandPrompt },
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: targetAspectRatio,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to expand image: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No expanded image generated');
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

export async function makeYouTubeSafe(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string
): Promise<{ imageData: string; mimeType: string }> {
  const safePrompt = `Modify this image to be YouTube-safe. Cover any nudity or inappropriate content while preserving the historical context and artistic value. Use period-appropriate clothing or strategic positioning. Maintain the same style and composition.`;

  const response = await fetch(
    `${GEMINI_API_URL}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: safePrompt },
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to make image safe: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No safe image generated');
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

// Video Generation with Veo

const cameraMovementPrompts: Record<string, string> = {
  drifting_still: 'static camera with subtle drift',
  dolly_in: 'slow dolly in towards subject',
  dolly_out: 'slow dolly out from subject',
  pan_left: 'slow camera pan from right to left',
  pan_right: 'slow camera pan from left to right',
  tilt_up: 'slow camera tilt upward',
  tilt_down: 'slow camera tilt downward',
  zoom_in: 'slow zoom in on subject',
  zoom_out: 'slow zoom out from subject',
};

export async function generateVideoFromImage(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  cameraMovement: string,
  options: VideoGenerationOptions = {}
): Promise<string> {
  const model = VIDEO_MODELS[options.model || 'veo3.1_fast'];
  const cameraPrompt = cameraMovementPrompts[cameraMovement] || cameraMovementPrompts.drifting_still;

  const fullPrompt = `${prompt}. Camera: ${cameraPrompt}. Realistic physics, ambient sound only, no music, no dramatic sound effects.`;

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: fullPrompt,
            image: {
              bytesBase64Encoded: imageBase64,
              mimeType: imageMimeType,
            },
          },
        ],
        parameters: {
          aspectRatio: options.aspectRatio || '16:9',
          sampleCount: 1,
          durationSeconds: options.duration || 4,
          negativePrompt: options.negativePrompt || 'music, dramatic sounds, text overlay, watermark',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start video generation: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  // Return the operation name for polling
  return data.name;
}

export async function pollVideoGeneration(
  apiKey: string,
  operationName: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${GEMINI_API_URL}/${operationName}?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`Failed to poll operation: ${response.statusText}`);
    }

    const operation: GenerationOperation = await response.json();

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    if (operation.done) {
      const videoUri = operation.result?.generatedSamples?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error('Video generation completed but no video URI found');
      }
      return videoUri;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video generation timed out');
}

export async function downloadVideo(videoUri: string): Promise<Buffer> {
  const response = await fetch(videoUri);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function convertToPhoto(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  options?: {
    instructions?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  }
): Promise<{ imageData: string; mimeType: string }> {
  const prompt = `Convert this painting/artwork into a photorealistic image.

CRITICAL REQUIREMENTS:
- Keep ALL subjects and objects in EXACTLY the same position as the original
- Maintain the EXACT same composition, framing, and scene layout
- Do NOT move, resize, or reposition any person, object, or element
- Keep the EXACT same aspect ratio and dimensions as the original image
- ABSOLUTELY NO frame, border, text, caption, watermark, or overlay of any kind
- The image must fill the entire canvas edge-to-edge with no decorative elements

Preserve historical accuracy and period-appropriate details (clothing, architecture, etc).
${options?.instructions ? `Additional instructions: ${options.instructions}` : ''}
Output a single photorealistic image with NO borders or text.`;

  const response = await fetch(
    `${GEMINI_API_URL}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          ...(options?.aspectRatio && {
            imageConfig: {
              aspectRatio: options.aspectRatio,
            },
          }),
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to convert to photo: ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No photorealistic image generated');
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}
