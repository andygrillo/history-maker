import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * R2 Storage Structure:
 * /{user_id}/
 *   /series/{series_id}/
 *     /videos/{video_id}/
 *       /audio/{audio_id}.mp3
 *       /images/{visual_id}_{variant_id}.png
 *       /clips/{clip_id}.mp4
 */

export interface R2Config {
  endpoint: string;
  bucketName: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
}

export type AssetType = 'audio' | 'images' | 'clips';

export interface UploadParams {
  userId: string;
  seriesId: string;
  videoId: string;
  assetType: AssetType;
  assetId: string;
  data: Buffer;
  contentType: string;
  extension: string;
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
}

function buildKey(params: Omit<UploadParams, 'data' | 'contentType'>): string {
  const { userId, seriesId, videoId, assetType, assetId, extension } = params;
  return `${userId}/series/${seriesId}/videos/${videoId}/${assetType}/${assetId}.${extension}`;
}

export async function uploadToR2(
  config: R2Config,
  params: UploadParams
): Promise<string> {
  const client = createR2Client(config);
  const key = buildKey(params);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: params.data,
    ContentType: params.contentType,
  });

  await client.send(command);

  // Return the public URL
  const publicUrl = config.publicUrl.endsWith('/')
    ? config.publicUrl.slice(0, -1)
    : config.publicUrl;
  return `${publicUrl}/${key}`;
}

export async function deleteFromR2(
  config: R2Config,
  params: Omit<UploadParams, 'data' | 'contentType'>
): Promise<void> {
  const client = createR2Client(config);
  const key = buildKey(params);

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}

// Helper to get content type from format
export function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    // Audio
    mp3_44100_128: 'audio/mpeg',
    mp3_44100_192: 'audio/mpeg',
    pcm_16000: 'audio/wav',
    pcm_22050: 'audio/wav',
    pcm_24000: 'audio/wav',
    pcm_44100: 'audio/wav',
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return contentTypes[format] || 'application/octet-stream';
}

// Helper to get file extension from format
export function getExtension(format: string): string {
  if (format.startsWith('mp3_')) return 'mp3';
  if (format.startsWith('pcm_')) return 'wav';
  return format;
}
