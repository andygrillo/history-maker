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
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, Check, Error as ErrorIcon, EditNote, ChevronRight } from '@mui/icons-material';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';

const settingsSchema = z.object({
  // R2 Storage
  r2Endpoint: z.string().url().optional().or(z.literal('')),
  r2BucketName: z.string().optional(),
  r2AccessKey: z.string().optional(),
  r2SecretKey: z.string().optional(),
  r2PublicUrl: z.string().url().optional().or(z.literal('')),
  // AI Services
  elevenLabsApiKey: z.string().optional(),
  googleGeminiApiKey: z.string().optional(),
  artlistApiKey: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingR2, setTestingR2] = useState(false);
  const [r2Status, setR2Status] = useState<'idle' | 'success' | 'error'>('idle');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        reset({
          r2Endpoint: data.r2_endpoint || '',
          r2BucketName: data.r2_bucket_name || '',
          r2AccessKey: data.r2_access_key || '',
          r2SecretKey: data.r2_secret_key || '',
          r2PublicUrl: data.r2_public_url || '',
          elevenLabsApiKey: data.elevenlabs_api_key || '',
          googleGeminiApiKey: data.google_gemini_api_key || '',
          artlistApiKey: data.artlist_api_key || '',
        });
      }
      setLoading(false);
    }

    loadSettings();
  }, [supabase, reset]);

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const testR2Connection = async () => {
    setTestingR2(true);
    setR2Status('idle');

    try {
      const values = getValues();
      const response = await fetch('/api/r2/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: values.r2Endpoint,
          bucketName: values.r2BucketName,
          accessKey: values.r2AccessKey,
          secretKey: values.r2SecretKey,
        }),
      });

      if (response.ok) {
        setR2Status('success');
      } else {
        setR2Status('error');
      }
    } catch {
      setR2Status('error');
    } finally {
      setTestingR2(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          r2_endpoint: data.r2Endpoint || null,
          r2_bucket_name: data.r2BucketName || null,
          r2_access_key: data.r2AccessKey || null,
          r2_secret_key: data.r2SecretKey || null,
          r2_public_url: data.r2PublicUrl || null,
          elevenlabs_api_key: data.elevenLabsApiKey || null,
          google_gemini_api_key: data.googleGeminiApiKey || null,
          artlist_api_key: data.artlistApiKey || null,
        });

      if (error) throw error;

      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings',
        severity: 'error'
      });
    }
  };

  const SecretField = ({
    name,
    label,
    placeholder,
  }: {
    name: keyof SettingsFormData;
    label: string;
    placeholder?: string;
  }) => (
    <TextField
      {...register(name)}
      label={label}
      placeholder={placeholder}
      type={showSecrets[name] ? 'text' : 'password'}
      fullWidth
      error={!!errors[name]}
      helperText={errors[name]?.message}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => toggleSecret(name)} edge="end">
              {showSecrets[name] ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header />
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure your API keys and storage settings
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Cloudflare R2 Storage */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cloudflare R2 Storage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your R2 bucket for storing media assets
            </Typography>

            <Stack spacing={2}>
              <TextField
                {...register('r2Endpoint')}
                label="Endpoint"
                placeholder="https://xxx.r2.cloudflarestorage.com"
                fullWidth
                error={!!errors.r2Endpoint}
                helperText={errors.r2Endpoint?.message}
              />

              <TextField
                {...register('r2BucketName')}
                label="Bucket Name"
                placeholder="my-bucket"
                fullWidth
                error={!!errors.r2BucketName}
                helperText={errors.r2BucketName?.message}
              />

              <SecretField name="r2AccessKey" label="Access Key" />
              <SecretField name="r2SecretKey" label="Secret Access Key" />

              <TextField
                {...register('r2PublicUrl')}
                label="Public URL"
                placeholder="https://pub-xxx.r2.dev"
                fullWidth
                error={!!errors.r2PublicUrl}
                helperText={errors.r2PublicUrl?.message}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={testR2Connection}
                  disabled={testingR2}
                  startIcon={testingR2 ? <CircularProgress size={16} /> : null}
                >
                  Test Connection
                </Button>
                {r2Status === 'success' && <Check color="success" />}
                {r2Status === 'error' && <ErrorIcon color="error" />}
              </Box>
            </Stack>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* AI Services */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your AI service API keys
            </Typography>

            <Stack spacing={2}>
              <SecretField
                name="elevenLabsApiKey"
                label="ElevenLabs API Key"
                placeholder="Text-to-speech voice generation"
              />

              <SecretField
                name="googleGeminiApiKey"
                label="Google Gemini API Key"
                placeholder="Image generation and video creation"
              />

              <SecretField
                name="artlistApiKey"
                label="Artlist.io API Key"
                placeholder="Background music search"
              />
            </Stack>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Prompt Templates */}
          <Paper
            component={Link}
            href="/settings/prompts"
            sx={{
              p: 3,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EditNote sx={{ fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">
                  Prompt Templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customize AI prompts for content generation
                </Typography>
              </Box>
            </Box>
            <ChevronRight color="action" />
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            >
              Save Settings
            </Button>
          </Box>
        </form>
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
