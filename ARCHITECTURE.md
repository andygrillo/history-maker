# Site Architecture

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React, MUI
- **Backend**: Next.js API Routes, Supabase (Postgres + Auth)
- **AI**: AWS Bedrock (Claude Sonnet/Haiku), Google Gemini (images/video)
- **External APIs**: ElevenLabs (TTS), Artlist (music)
- **Storage**: Cloudflare R2

## Pages

### Auth (`/src/app/(auth)/`)
| Route | Description |
|-------|-------------|
| `/login` | User login |
| `/sign-up` | Registration |
| `/sign-up-success` | Confirmation page |
| `/forgot-password` | Password reset request |
| `/update-password` | Password reset form |
| `/error` | Auth error display |

### Dashboard (`/src/app/(dashboard)/`)
| Route | Description |
|-------|-------------|
| `/dashboard` | Series list with CRUD |
| `/settings` | API keys configuration |
| `/settings/prompts` | Custom prompt templates |
| `/series/[seriesId]` | Series detail/overview |
| `/series/[seriesId]/planner` | Video slot planning (AI generation) |
| `/series/[seriesId]/script` | Script writing/generation |
| `/series/[seriesId]/audio` | TTS generation via ElevenLabs |
| `/series/[seriesId]/image` | Visual asset generation |
| `/series/[seriesId]/video` | Video clip generation via Veo |
| `/series/[seriesId]/music` | Background music selection |
| `/series/[seriesId]/export` | Final video export |

## API Routes (`/src/app/api/`)
| Route | Method | Description |
|-------|--------|-------------|
| `/videos` | GET/POST | Video CRUD |
| `/planner/generate` | POST | Bulk AI video idea generation |
| `/planner/generate-single` | POST | Single card regeneration |
| `/planner/lucky` | POST | Random topic generation |
| `/r2/test` | POST | R2 storage connection test |

## Libraries (`/src/lib/`)
| File | Purpose |
|------|---------|
| `api/bedrock.ts` | AWS Bedrock Claude wrapper |
| `api/gemini.ts` | Google Gemini API wrapper |
| `api/elevenlabs.ts` | ElevenLabs TTS wrapper |
| `api/r2.ts` | Cloudflare R2 storage |
| `supabase/client.ts` | Browser Supabase client |
| `supabase/server.ts` | Server Supabase client |
| `prompts/defaults.ts` | Default AI prompt templates |
| `theme.ts` | MUI theme configuration |

## Database Schema

```
profiles          → User profile (extends auth.users)
user_settings     → API keys, custom prompts
series            → Content series (topic, weekly_goal, time_horizon, platforms)
  └── videos      → Individual videos (title, format, status, scheduled_date)
      └── scripts → Video scripts (source_text, generated_script, tone)
          ├── audios         → TTS audio files
          └── visuals        → Visual descriptions/keywords
              └── visual_variants → Image variants with filters
              └── video_clips     → Generated video clips
      └── music_tracks → Background music
```

## Video Creation Workflow

```
Series → Planner → Script → Audio → Image → Video → Music → Export
   │         │         │        │        │       │       │
   │         │         │        │        │       │       └── Final render
   │         │         │        │        │       └── Veo video generation
   │         │         │        │        └── Gemini image generation
   │         │         │        └── ElevenLabs TTS
   │         │         └── Claude script writing
   │         └── Claude video idea generation
   └── Topic + config (weekly_goal, time_horizon, platforms)
```

## Key Formulas

**Slot Calculation** (planner):
```
weeks = { '1_week': 1, '1_month': 4, '3_months': 12 }
totalVideos = weeks × weeklyGoal
```

**Platform Split** (1:3 ratio):
- YouTube long-form: 25% of total
- Short-form (Shorts/TikTok): 75% of total, split evenly
