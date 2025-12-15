// Series (a documentary series about a topic)
export interface Series {
  id: string;
  userId: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;
}

// Video
export interface Video {
  id: string;
  seriesId: string;
  title: string;
  description: string;
  format: 'youtube' | 'youtube_short' | 'tiktok';
  status: 'planned' | 'scripting' | 'audio' | 'image' | 'video' | 'complete';
  scheduledDate?: Date;
}

// Script
export interface Script {
  id: string;
  videoId: string;
  sourceText: string;
  generatedScript: string;
  duration: string;
  episodes: number;
  tone: string;
}

// Audio
export interface TimestampData {
  text: string;
  startTime: number;
  endTime: number;
}

export interface Audio {
  id: string;
  scriptId: string;
  taggedText: string;
  voiceId: string;
  stability: number;
  r2Url: string;
  timestamps: TimestampData[];
}

// Visual
export interface VisualVariant {
  id: string;
  visualId: string;
  sourceUrl: string;
  processedUrl?: string;
  filters: string[];
}

export interface Visual {
  id: string;
  scriptId: string;
  sequenceNumber: number;
  description: string;
  keywords: string[];
  cameraShot: string;
  variants: VisualVariant[];
}

// VideoClip
export interface VideoClip {
  id: string;
  visualId: string;
  model: 'veo3.1_fast' | 'veo3.1' | 'kling2.6' | 'sora2';
  duration: number;
  format: 'portrait' | 'landscape';
  r2Url: string;
}

// Music Track
export interface MusicTrack {
  id: string;
  videoId: string;
  artlistId: string;
  title: string;
  artist: string;
  duration: number;
  mood: string;
  tempo: string;
  genre: string;
  previewUrl: string;
  r2Url?: string;
  licenseInfo: string;
}

// User Settings
export interface UserSettings {
  id: string;
  userId: string;
  r2Endpoint?: string;
  r2BucketName?: string;
  r2AccessKey?: string;
  r2SecretKey?: string;
  r2PublicUrl?: string;
  awsBedrockApiKey?: string;
  elevenLabsApiKey?: string;
  googleGeminiApiKey?: string;
  artlistApiKey?: string;
}

// Zone types
export type ZoneType = 'planner' | 'script' | 'audio' | 'image' | 'video' | 'music' | 'export';

// Duration options for scripts
export type ScriptDuration = '30s' | '60s' | '2min' | '5min' | '10min' | '15min' | '30min' | '60min';

// Narrative tones
export type NarrativeTone = 'mike_duncan' | 'mark_felton';

// Camera movements
export type CameraMovement =
  | 'drifting_still'
  | 'dolly_in'
  | 'dolly_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'zoom_in'
  | 'zoom_out';

// Image filters
export type ImageFilter =
  | 'photorealistic_expand'
  | 'yt_safe'
  | 'map_enhancement'
  | 'document_enhancement';

// Image generation styles
export type ImageStyle =
  | '18th_century_painting'
  | '20th_century_modern'
  | 'map_style'
  | 'document_style';

// Video generation models
export type VideoModel = 'veo3.1_fast' | 'veo3.1' | 'kling2.6' | 'sora2';

// Planner content calendar item
export interface ContentCalendarItem {
  id: string;
  videoTitle: string;
  description: string;
  format: 'youtube' | 'youtube_short' | 'tiktok';
  scheduledDate: Date;
  status: 'planned' | 'in_progress' | 'completed';
}

// Wikipedia article
export interface WikipediaArticle {
  pageid: number;
  title: string;
  extract: string;
  fullUrl: string;
}

// Emotional tags for audio
export type EmotionalTag = 'dramatic' | 'whispered' | 'urgent' | 'calm' | 'excited' | 'somber';

// Visual tag in script
export interface VisualTag {
  id: string;
  sequenceNumber: number;
  description: string;
  keywords: string[];
  cameraMovement: CameraMovement;
  position: number; // character position in script
}

// Export asset status
export interface ExportAsset {
  type: 'script' | 'audio' | 'images' | 'video_clips' | 'music';
  status: 'pending' | 'ready' | 'partial';
  count?: number;
  totalCount?: number;
}
