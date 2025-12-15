import { SupabaseClient } from '@supabase/supabase-js';
import { defaultPrompts, PromptTemplates } from './defaults';

// Database field to prompt key mapping
const fieldToPromptKey: Record<string, keyof PromptTemplates> = {
  prompt_planner_system: 'plannerSystem',
  prompt_planner_user: 'plannerUser',
  prompt_script_system: 'scriptSystem',
  prompt_script_user: 'scriptUser',
  prompt_audio_tagging_system: 'audioTaggingSystem',
  prompt_audio_tagging_user: 'audioTaggingUser',
  prompt_visual_tagging_system: 'visualTaggingSystem',
  prompt_visual_tagging_user: 'visualTaggingUser',
  prompt_music_analysis_system: 'musicAnalysisSystem',
  prompt_music_analysis_user: 'musicAnalysisUser',
  prompt_mike_duncan_tone: 'mikeDuncanTone',
  prompt_mark_felton_tone: 'markFeltonTone',
};

// Get user prompts with fallback to defaults
export async function getUserPrompts(
  supabase: SupabaseClient,
  userId: string
): Promise<PromptTemplates> {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Start with defaults
  const prompts = { ...defaultPrompts };

  // Override with user customizations if present
  if (data) {
    for (const [dbField, promptKey] of Object.entries(fieldToPromptKey)) {
      if (data[dbField]) {
        prompts[promptKey] = data[dbField];
      }
    }
  }

  return prompts;
}

// Get a single prompt with fallback to default
export async function getUserPrompt(
  supabase: SupabaseClient,
  userId: string,
  promptKey: keyof PromptTemplates
): Promise<string> {
  const prompts = await getUserPrompts(supabase, userId);
  return prompts[promptKey];
}

// Get tone instructions for script generation
export async function getTonePrompt(
  supabase: SupabaseClient,
  userId: string,
  tone: string
): Promise<string> {
  const prompts = await getUserPrompts(supabase, userId);

  switch (tone) {
    case 'mike_duncan':
      return prompts.mikeDuncanTone;
    case 'mark_felton':
      return prompts.markFeltonTone;
    default:
      return '';
  }
}
