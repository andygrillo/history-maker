# History Maker - Product Requirements Document

## Overview

History Maker is a web application designed to streamline the creation of documentary-style videos for YouTube, YouTube Shorts, and other platforms. The initial focus is on history documentaries, with architecture designed to support other content types in the future.

## Tech Stack

| Component | Technology | Plan |
|-----------|------------|------|
| Frontend | Next.js + Material UI | - |
| Hosting | Vercel | Free |
| Backend/Auth | Supabase | Free |
| Media Storage | Cloudflare R2 | Free tier |
| AI Conversation | AWS Bedrock (Claude Sonnet 4.5 / Haiku) | Pay per use |
| Voice Generation | ElevenLabs API | Pay per use |
| Image/Video AI | Google Gemini + Veo 3.1 | Pay per use |

---

## UI/UX Design

### Design Philosophy
- **Modern, clean Material UI** aesthetic
- **DaVinci Resolve-inspired workflow** with horizontal zone navigation (not sidebar)
- **Prompt-first interaction** with configuration panels below

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LOGO                                              [Settings] [Profile] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [ Planner ] [ Script ] [ Audio ] [ Image ] [ Video ] [ Music ] [ Export ] │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │                     PROMPT / INPUT WINDOW                        │   │
│  │                                                                  │   │
│  │  [Text input area for prompts, scripts, or content]             │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CONFIGURATION PANEL                                            │   │
│  │                                                                  │   │
│  │  [Toggles] [Dropdowns] [Sliders] [Action Buttons]               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OUTPUT / PREVIEW PANEL                                         │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Zone Navigation
Horizontal tabs at top of workspace area, similar to DaVinci Resolve:
- **Planner** - Content calendar and video planning
- **Script** - Script writing and generation
- **Audio** - Voice generation and sound design
- **Image** - Visual asset creation and management
- **Video** - Video generation from images
- **Music** - Background music selection
- **Export** - Asset management and downloads

---

## Settings

### API Configuration

#### Cloudflare R2 Storage
| Field | Example |
|-------|---------|
| Endpoint | `https://f0778b69e50db12ab164cee5b3120710.r2.cloudflarestorage.com` |
| Bucket Name | `doc-haiti` |
| Access Key | `<access_key>` |
| Secret Access Key | `<secret_key>` |
| Public URL | `https://pub-5081c909eb3a4a4db4ea6d016a9802cb.r2.dev` |

**[Test Connection]** button to validate R2 configuration

#### AI Services
| Service | Purpose |
|---------|---------|
| AWS Bedrock API Key | Conversation AI (Sonnet 4.5 for quality, Haiku for cost savings) |
| ElevenLabs API Key | Text-to-speech voice generation |
| Google Gemini API Key | Image generation and video creation |
| Artlist.io API Key | Background music search and licensing |

---

## Workflow Zones

### 1. Planner Zone

**Purpose:** AI-assisted content planning and calendar creation

#### Flow
1. User enters a **topic** (e.g., "Revolutions", "Ancient Empires")
2. User selects **target platforms** (default: YouTube + YouTube Shorts)
3. User sets **weekly production goal** (AI suggests realistic targets)
4. AI (Bedrock Sonnet 4.5) generates a **content calendar** with:
   - Video titles
   - Brief descriptions
   - Suggested format (long-form vs shorts)
   - Recommended posting schedule
5. User can **accept, edit, or regenerate** the plan
6. Individual videos can be selected to proceed to Script zone

#### UI Components
- **Prompt Window:** Topic input with platform toggles
- **Configuration Panel:**
  - Platform checkboxes (YouTube, YT Shorts, TikTok, etc.)
  - Weekly goal slider
  - Time horizon (1 week, 1 month, 3 months)
- **Output Panel:** Calendar view with video cards

---

### 2. Script Zone

**Purpose:** Source material gathering and script generation

#### Initial State (No Script)
Three options presented:
1. **Write a script** - Open blank editor
2. **Import document** - Drag & drop or file picker
3. **Grab from Wikipedia** - AI-assisted Wikipedia search

#### Wikipedia Grab Flow
1. User enters subject (e.g., "Haitian Revolution")
2. Bedrock AI generates optimal search keywords
3. Wikipedia API returns list of matching articles
4. User selects from list
5. System parses article for clean text
6. Text appears in editable script window

#### Script Generation

**Prompt Window:** Editable source material text

**Configuration Panel:**
| Option | Values |
|--------|--------|
| Duration | 30s, 60s, 2min, 5min, 10min, 15min, 30min, 60min |
| Number of Episodes | 1-10 |
| Narrative Tone | Mike Duncan, Mark Felton (expandable) |
| Additional Prompt | Free text for custom instructions |

**Narrative Tones (with style descriptions and sample paragraphs):**

##### Mike Duncan Style
- Conversational yet authoritative
- Builds tension through pacing
- Uses rhetorical questions
- Sample paragraphs included in prompt

##### Mark Felton Style
- Direct, military precision
- Fact-dense delivery
- Minimal editorializing
- Sample paragraphs included in prompt

#### Output Format
- Clean text with one sentence per line
- Line numbers for reference
- Option to return to source material editing

---

### 3. Audio Zone

**Purpose:** Voice-over generation with emotional tagging

#### Flow
1. Display script text from previous zone
2. **Auto-tag dialogue** using Bedrock Haiku (cost-effective)
   - Emotional tags: `[dramatic]`, `[whispered]`, `[urgent]`
   - Emphasis markers: `...` for pauses
   - Pronunciation guides where needed
3. **Voice selection:**
   - Default voice pre-selected
   - Preview voices using ElevenLabs preview URLs
   - Voice list with audio samples

**Configuration Panel:**
| Option | Description |
|--------|-------------|
| Voice | Dropdown with preview button |
| Stability | ElevenLabs stability setting (0-1) |
| Output Format | MP3, WAV, etc. |

#### Generation
1. Generate audio via ElevenLabs Text-to-Speech API **with timestamps**
2. Playback with synchronized text highlighting (phrase by phrase)
3. Options:
   - Regenerate entire audio
   - Regenerate tags, then regenerate audio
   - Save to R2 storage

#### Saved Audio Panel
- List of saved audio files for this video
- Playback controls
- Download option

---

### 4. Image Zone

**Purpose:** Visual asset creation and management

#### Flow
1. Display script text (without audio tags)
2. **Auto-generate visual tags** using Bedrock:
   - Analyzes script content
   - User inputs target clip duration
   - Calculates number of visuals needed
   - Distributes tags throughout script
   - Each tag includes:
     - Sequential number (1, 2, 3...)
     - Visual description
     - Search keywords (for image search)
     - Camera movement (drifting still, dolly in, pan right, etc.)

#### Tag Management
- **Drag & drop** tags into script text
- Auto-renumbering on add/delete (maintains 1, 2, 3... sequence)
- Regenerate wipes existing tags
- Manual tag creation without AI

#### Image Sourcing
For each visual tag:
1. **Wikimedia Commons search** (primary)
2. Future: Additional image search APIs
3. User selects one or more variants (e.g., Visual 2 v1, v2, v3)
4. **AI Generation option** for missing images:
   - 18th century historical painting style
   - 20th century modern style
   - Map style
   - Document style

#### Image Filters (TypeScript + Google Nano Banana API)
| Filter | Purpose |
|--------|---------|
| Photorealistic Expand | Create photorealistic version, no frame, fill to 16:9 |
| YT Safe | Cover nudity while preserving content (pass YT filters) |
| Map Enhancement | Optimize map visuals |
| Document Enhancement | Optimize document/text visuals |

---

### 5. Video Zone

**Purpose:** Generate video clips from images

#### Video Generation (Google Veo 3.1)

**Configuration Panel:**
| Option | Values |
|--------|--------|
| Model | Veo 3.1 Fast, Veo 3.1 |
| Duration | 4s, 6s, 8s |
| Format | Portrait (YT Shorts), Landscape (YouTube) |

#### Generation Rules
- Input: Images from Image zone
- Camera movements from saved tag data
- **50% drifting still** to avoid constant motion
- No repeated camera movements consecutively
- Prompt ensures:
  - Realistic physics
  - Ambient sound only (no music, no dramatic sounds)

#### Output
- Saved video clips in R2
- List view with playback
- Download individual clips or batch

---

### 6. Music Zone

**Purpose:** Background music selection

#### Integration
- **Artlist.io API** ([developer.artlist.io](https://developer.artlist.io))

#### Flow
1. Bedrock AI analyzes script to determine:
   - Mood/tone
   - Tempo requirements
   - Genre suggestions
2. Search Artlist API with AI-generated parameters
3. Present options with preview playback
4. User selects track(s)
5. Save selection to project

#### Output
- Downloaded music tracks saved to R2
- Multiple track options per video
- License information stored

---

### 7. Export Zone

**Purpose:** Final asset management, download, and export

#### Asset Overview
Display all generated assets for the current video project:

| Asset Type | Status | Actions |
|------------|--------|---------|
| Script | ✓ Complete | View, Download (.txt, .md) |
| Audio | ✓ Complete | Play, Download (.mp3, .wav) |
| Images | 12/15 Ready | View Gallery, Download (.zip) |
| Video Clips | 8/12 Ready | Preview, Download (.mp4, .zip) |
| Music | ✓ Selected | Play, Download |

#### Download Options

**Individual Downloads:**
- Script as .txt or .md
- Audio files as .mp3 or .wav
- Individual images (original or processed)
- Individual video clips
- Music tracks

**Batch Downloads:**
- **All Assets** - Complete project bundle (.zip)
- **Images Only** - All visuals as .zip
- **Video Clips Only** - All clips as .zip
- **Audio Bundle** - Voiceover + music tracks

#### Project Summary
- Total duration estimate
- Asset count breakdown
- Storage usage (R2)
- Generation costs summary (API usage)

#### Export Presets (Future)
- YouTube Upload Ready (thumbnail + video + metadata)
- YT Shorts Package
- TikTok Package
- Raw Assets Only

#### History & Versions
- List of all saved versions per asset type
- Restore previous versions
- Compare versions side-by-side

---

## Future Enhancements

### Video Editor Zone
- Timeline-based editing
- Combine:
  - Video clips
  - Audio voiceover
  - Background music
- Transitions
- Text overlays / titles
- Export final video

### Additional Content Types
- Science documentaries
- True crime
- Educational content
- News summaries

### Additional Platforms
- TikTok optimization
- Instagram Reels
- Twitter/X video

---

## Data Model

### Project
```typescript
interface Project {
  id: string;
  userId: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Video
```typescript
interface Video {
  id: string;
  projectId: string;
  title: string;
  description: string;
  format: 'youtube' | 'youtube_short' | 'tiktok';
  status: 'planned' | 'scripting' | 'audio' | 'image' | 'video' | 'complete';
  scheduledDate?: Date;
}
```

### Script
```typescript
interface Script {
  id: string;
  videoId: string;
  sourceText: string;
  generatedScript: string;
  duration: string;
  episodes: number;
  tone: string;
}
```

### Audio
```typescript
interface Audio {
  id: string;
  scriptId: string;
  taggedText: string;
  voiceId: string;
  stability: number;
  r2Url: string;
  timestamps: TimestampData[];
}
```

### Visual
```typescript
interface Visual {
  id: string;
  scriptId: string;
  sequenceNumber: number;
  description: string;
  keywords: string[];
  cameraShot: string;
  variants: VisualVariant[];
}

interface VisualVariant {
  id: string;
  visualId: string;
  sourceUrl: string;
  processedUrl?: string;
  filters: string[];
}
```

### VideoClip
```typescript
interface VideoClip {
  id: string;
  visualId: string;
  model: 'veo3.1_fast' | 'veo3.1';
  duration: number;
  format: 'portrait' | 'landscape';
  r2Url: string;
}
```

---

## API Integrations

| API | Endpoint | Purpose |
|-----|----------|---------|
| AWS Bedrock | Claude Sonnet 4.5 | Planning, script generation, image tagging |
| AWS Bedrock | Claude Haiku | Audio tagging (cost optimization) |
| Wikipedia | REST API | Article search and content retrieval |
| ElevenLabs | Text-to-Speech | Voice generation with timestamps |
| Wikimedia Commons | Search API | Image sourcing |
| Google Gemini | Nano Banana | Image filtering/processing |
| Google Veo | 3.1 / 3.1 Fast | Image-to-video generation |
| Artlist.io | Developer API | Music search and licensing |

---

## MVP Scope

### Phase 1 (MVP)
- [ ] Settings with API key management and R2 connection
- [ ] Planner zone with AI calendar generation
- [ ] Script zone with Wikipedia grab and script generation
- [ ] Audio zone with ElevenLabs integration
- [ ] Image zone with Wikimedia Commons search
- [ ] Video zone with Veo 3.1 generation
- [ ] Music zone with Artlist.io integration
- [ ] Export zone with asset management and downloads

### Phase 2
- [ ] Additional image search sources
- [ ] More narrative tones
- [ ] Export presets (YouTube-ready packages)

### Phase 3
- [ ] Video editor for final assembly
- [ ] Additional platform formats
- [ ] Content type expansion beyond history

---

## Implementation Plan

### Project Foundation

**Initialize Project:**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Dependencies:**
- `@mui/material`, `@emotion/react`, `@emotion/styled`
- `@supabase/supabase-js`, `@supabase/ssr`
- `@aws-sdk/client-bedrock-runtime`
- `zustand`, `@tanstack/react-query`
- `react-hook-form`, `zod`

---

### Folder Structure

```
/src
├── app/
│   ├── (auth)/login, signup
│   ├── (dashboard)/
│   │   ├── project/[projectId]/
│   │   │   ├── layout.tsx (zone tabs)
│   │   │   ├── planner/page.tsx
│   │   │   ├── script/page.tsx
│   │   │   ├── audio/page.tsx
│   │   │   ├── image/page.tsx
│   │   │   ├── video/page.tsx
│   │   │   ├── music/page.tsx
│   │   │   └── export/page.tsx
│   │   └── settings/page.tsx
│   └── api/ (all AI & external service routes)
├── components/
│   ├── layout/ (Header, ZoneTabs, panels)
│   ├── zones/ (planner/, script/, audio/, etc.)
│   └── ui/ (shared MUI components)
├── lib/
│   ├── supabase/ (client, server, middleware)
│   ├── api/ (bedrock, elevenlabs, gemini, veo, kling, sora, r2)
│   └── prompts/ (AI prompt templates)
├── hooks/ (useProject, useScript, useAudio, etc.)
├── stores/ (projectStore, videoStore, settingsStore)
└── types/ (TypeScript interfaces)
```

---

### Database Schema (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `user_settings` | Encrypted API keys |
| `projects` | Topic-based projects |
| `videos` | Individual videos in project |
| `scripts` | Source + generated scripts |
| `audios` | TTS files with timestamps |
| `visuals` | Image placeholders with tags |
| `visual_variants` | Multiple images per visual |
| `video_clips` | Generated video clips |
| `music_tracks` | Selected music |

---

### Video Generation Models

| Model | Provider | Duration Options |
|-------|----------|------------------|
| Veo 3.1 | Google | 4s, 6s, 8s |
| Veo 3.1 Fast | Google | 4s, 6s, 8s |
| Kling 2.6 | Kuaishou | 5s, 10s |
| Sora 2 | OpenAI | 5s, 10s, 15s, 20s |

---

### Build Order

1. **Foundation** - Next.js setup, MUI theme, Supabase auth
2. **Layout** - Header, ZoneTabs, three-panel structure
3. **Settings** - API key management
4. **Planner** - Calendar generation
5. **Script** - Wikipedia + script gen
6. **Audio** - ElevenLabs TTS
7. **Image** - Wikimedia + Gemini
8. **Video** - Veo/Kling/Sora generation
9. **Music** - Artlist integration
10. **Export** - Downloads

---

### Critical Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/project/[projectId]/layout.tsx` | Zone navigation layout |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/api/bedrock.ts` | AWS Bedrock AI client |
| `src/lib/api/r2.ts` | Cloudflare R2 storage client |
| `src/types/index.ts` | All TypeScript definitions |

---

### Technical Notes

- All external API calls through Next.js API routes (security)
- Video generation is async (up to 6 min) - needs polling
- Use React Query for caching + background updates
- Store API keys encrypted in Supabase