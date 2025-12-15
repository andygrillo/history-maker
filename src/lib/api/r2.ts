import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface R2Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  publicUrl?: string;
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
}

export async function testR2Connection(config: R2Config): Promise<boolean> {
  const client = createR2Client(config);

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return true;
  } catch {
    return false;
  }
}

export async function uploadToR2(
  config: R2Config,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const client = createR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return public URL if configured, otherwise return the key
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }

  return key;
}

export async function getSignedUploadUrl(
  config: R2Config,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = createR2Client(config);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getSignedDownloadUrl(
  config: R2Config,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = createR2Client(config);

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function listR2Objects(
  config: R2Config,
  prefix?: string
): Promise<string[]> {
  const client = createR2Client(config);

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix,
    })
  );

  return (response.Contents || []).map((obj) => obj.Key!).filter(Boolean);
}
