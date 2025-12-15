when using these technolgies refer to these sites:

SUPABASE:
https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

VERCEL:
https://vercel.com/marketplace/supabase

GEMINI nano banana image:
https://ai.google.dev/gemini-api/docs/image-generation
(always use gemini-3-pro-image-preview)

GEMINI veo video:
https://ai.google.dev/gemini-api/docs/video?example=dialogue
(always use 3.1 fast or 3.1)

ARTLIST:
https://developer.artlist.io/welcome

ELEVENLABS:
https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert-with-timestamps

BEDROCK API:
https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Operations_Amazon_Bedrock.html

SUPABASE CLI (Database Migrations):
- Create migrations in: supabase/migrations/
- Push migrations to remote: `npx supabase db push`
- Check schema diff: `npx supabase db diff --linked`
- Dump remote schema: `npx supabase db dump --schema public`
- If schema cache error (PGRST204), refresh via Supabase Dashboard: Settings → API → Reload schema cache