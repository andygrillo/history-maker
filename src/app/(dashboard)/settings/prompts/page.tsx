'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { ExpandMore, RestoreOutlined } from '@mui/icons-material';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { defaultPrompts, PromptTemplates } from '@/lib/prompts/defaults';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const promptCategories = [
  {
    id: 'planner',
    label: 'Planner',
    prompts: [
      { key: 'plannerSystem', label: 'System Prompt', description: 'Instructions for content calendar generation' },
      { key: 'plannerUser', label: 'User Prompt Template', description: 'Template with {{topic}}, {{platforms}}, {{weeklyGoal}}, {{timeHorizon}}' },
    ],
  },
  {
    id: 'script',
    label: 'Script',
    prompts: [
      { key: 'scriptSystem', label: 'System Prompt', description: 'Instructions for script generation' },
      { key: 'scriptUser', label: 'User Prompt Template', description: 'Template with {{duration}}, {{sourceText}}, {{additionalPrompt}}' },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    prompts: [
      { key: 'audioTaggingSystem', label: 'System Prompt', description: 'Instructions for audio tagging' },
      { key: 'audioTaggingUser', label: 'User Prompt Template', description: 'Template with {{script}}' },
    ],
  },
  {
    id: 'visual',
    label: 'Visual',
    prompts: [
      { key: 'visualTaggingSystem', label: 'System Prompt', description: 'Instructions for visual tagging' },
      { key: 'visualTaggingUser', label: 'User Prompt Template', description: 'Template with {{numberOfVisuals}}, {{script}}' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    prompts: [
      { key: 'musicAnalysisSystem', label: 'System Prompt', description: 'Instructions for music analysis' },
      { key: 'musicAnalysisUser', label: 'User Prompt Template', description: 'Template with {{script}}' },
    ],
  },
  {
    id: 'tones',
    label: 'Narrative Tones',
    prompts: [
      { key: 'mikeDuncanTone', label: 'Mike Duncan Style', description: 'Revolutions podcast style instructions' },
      { key: 'markFeltonTone', label: 'Mark Felton Style', description: 'Military history style instructions' },
    ],
  },
];

export default function PromptsSettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [prompts, setPrompts] = useState<Partial<PromptTemplates>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const supabase = createClient();

  useEffect(() => {
    async function loadPrompts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const loadedPrompts: Partial<PromptTemplates> = {};

        // Map database fields to prompt keys
        const fieldMap: Record<string, keyof PromptTemplates> = {
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

        for (const [dbField, promptKey] of Object.entries(fieldMap)) {
          if (data[dbField]) {
            loadedPrompts[promptKey] = data[dbField];
          }
        }

        setPrompts(loadedPrompts);
      }
      setLoading(false);
    }

    loadPrompts();
  }, [supabase]);

  const handlePromptChange = (key: keyof PromptTemplates, value: string) => {
    setPrompts((prev) => ({
      ...prev,
      [key]: value || undefined, // Remove if empty to use default
    }));
  };

  const handleResetToDefault = (key: keyof PromptTemplates) => {
    setPrompts((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          prompt_planner_system: prompts.plannerSystem || null,
          prompt_planner_user: prompts.plannerUser || null,
          prompt_script_system: prompts.scriptSystem || null,
          prompt_script_user: prompts.scriptUser || null,
          prompt_audio_tagging_system: prompts.audioTaggingSystem || null,
          prompt_audio_tagging_user: prompts.audioTaggingUser || null,
          prompt_visual_tagging_system: prompts.visualTaggingSystem || null,
          prompt_visual_tagging_user: prompts.visualTaggingUser || null,
          prompt_music_analysis_system: prompts.musicAnalysisSystem || null,
          prompt_music_analysis_user: prompts.musicAnalysisUser || null,
          prompt_mike_duncan_tone: prompts.mikeDuncanTone || null,
          prompt_mark_felton_tone: prompts.markFeltonTone || null,
        });

      if (error) throw error;

      setSnackbar({ open: true, message: 'Prompts saved successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save prompts',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPromptValue = (key: keyof PromptTemplates): string => {
    return prompts[key] ?? '';
  };

  const isCustomized = (key: keyof PromptTemplates): boolean => {
    return prompts[key] !== undefined && prompts[key] !== '';
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Prompt Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Customize the AI prompts used throughout the application. Leave empty to use defaults.
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {promptCategories.map((cat, index) => (
              <Tab key={cat.id} label={cat.label} />
            ))}
          </Tabs>
        </Paper>

        {promptCategories.map((category, index) => (
          <TabPanel key={category.id} value={tabValue} index={index}>
            {category.prompts.map((prompt) => (
              <Accordion key={prompt.key} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography>{prompt.label}</Typography>
                    {isCustomized(prompt.key as keyof PromptTemplates) && (
                      <Chip size="small" label="Customized" color="primary" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {prompt.description}
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    value={getPromptValue(prompt.key as keyof PromptTemplates)}
                    onChange={(e) =>
                      handlePromptChange(prompt.key as keyof PromptTemplates, e.target.value)
                    }
                    placeholder={defaultPrompts[prompt.key as keyof PromptTemplates]}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      },
                    }}
                  />

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      startIcon={<RestoreOutlined />}
                      onClick={() => handleResetToDefault(prompt.key as keyof PromptTemplates)}
                      disabled={!isCustomized(prompt.key as keyof PromptTemplates)}
                    >
                      Reset to Default
                    </Button>

                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ minHeight: 'auto', '& .MuiAccordionSummary-content': { margin: 0 } }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          View Default
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            bgcolor: 'background.paper',
                            p: 2,
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                          }}
                        >
                          {defaultPrompts[prompt.key as keyof PromptTemplates]}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </TabPanel>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            Save All Prompts
          </Button>
        </Box>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
