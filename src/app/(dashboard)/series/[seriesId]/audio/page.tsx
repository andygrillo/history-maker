'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Slider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Chip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  AutoAwesome,
  Refresh,
  Save,
  ArrowForward,
  VolumeUp,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { TimestampData } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { PREMADE_VOICES, Voice } from '@/lib/api/elevenlabs';

export default function AudioPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  const [script, setScript] = useState('');
  const [taggedText, setTaggedText] = useState('');
  const [voices] = useState<Voice[]>(PREMADE_VOICES);
  const [selectedVoice, setSelectedVoice] = useState(PREMADE_VOICES[0]?.voice_id || '');
  const [stability, setStability] = useState(0.5);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timestamps, setTimestamps] = useState<TimestampData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [savedAudios, setSavedAudios] = useState<{ id: string; url: string; createdAt: string }[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Load script and voices on mount
  useEffect(() => {
    async function loadData() {
      // Load script from database
      if (videoId) {
        try {
          const supabase = createClient();

          // Load script
          const { data: scriptData } = await supabase
            .from('scripts')
            .select('id, generated_script')
            .eq('video_id', videoId)
            .single();

          if (scriptData) {
            setScript(scriptData.generated_script || '');

            // Load existing audio with tagged text if available
            const { data: audioData } = await supabase
              .from('audios')
              .select('tagged_text')
              .eq('script_id', scriptData.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (audioData?.tagged_text) {
              setTaggedText(audioData.tagged_text);
            }
          }
        } catch (err) {
          console.error('Failed to load script:', err);
        }
      }

    }

    loadData();
  }, [videoId]);

  // Audio time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const handleGenerateTags = async () => {
    if (!script.trim()) {
      setError('No script available');
      return;
    }

    setIsGeneratingTags(true);
    setError(null);

    try {
      const response = await fetch('/api/audio/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) throw new Error('Failed to generate tags');

      const data = await response.json();
      setTaggedText(data.taggedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tags');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleGenerateAudio = async () => {
    const textToGenerate = taggedText || script;
    if (!textToGenerate.trim() || !selectedVoice) {
      setError('Please provide text and select a voice');
      return;
    }

    setIsGeneratingAudio(true);
    setError(null);

    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          text: textToGenerate,
          voiceId: selectedVoice,
          stability,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate audio');

      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setTimestamps(data.timestamps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSaveAudio = async () => {
    if (!audioUrl || !videoId) return;

    try {
      const response = await fetch('/api/audio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          audioUrl,
          taggedText,
          voiceId: selectedVoice,
          stability,
          timestamps,
        }),
      });

      if (!response.ok) throw new Error('Failed to save audio');

      const data = await response.json();
      setSavedAudios((prev) => [
        { id: data.id, url: audioUrl, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save audio');
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const previewVoice = (voice: Voice) => {
    if (previewAudioRef.current) {
      // If already playing this voice, stop it
      if (previewingVoice === voice.voice_id) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        setPreviewingVoice(null);
      } else {
        // Play new voice preview
        previewAudioRef.current.src = voice.preview_url;
        previewAudioRef.current.play();
        setPreviewingVoice(voice.voice_id);
      }
    }
  };

  const handleProceedToImage = () => {
    if (videoId) {
      router.push(`/series/${seriesId}/image?videoId=${videoId}`);
    }
  };

  // Find current word based on timestamp
  const getCurrentWordIndex = () => {
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (currentTime >= timestamps[i].startTime) {
        return i;
      }
    }
    return -1;
  };

  // Tag color mapping
  const tagColors: Record<string, string> = {
    dramatically: '#d32f2f',
    solemnly: '#1976d2',
    thoughtfully: '#0288d1',
    'with emphasis': '#ed6c02',
    'speaking softly': '#2e7d32',
    whispering: '#9c27b0',
    excited: '#ff9800',
    sad: '#9c27b0',
    hopeful: '#4caf50',
    'speaking slowly': '#607d8b',
    'speaking firmly': '#d32f2f',
    'speaking quickly': '#ff5722',
    happy: '#4caf50',
    serious: '#455a64',
    angry: '#c62828',
    fearful: '#7b1fa2',
    melancholic: '#5c6bc0',
    triumphant: '#ffc107',
    gravely: '#37474f',
    wistfully: '#8e24aa',
    cheerfully: '#66bb6a',
  };

  // Render text with colored tags
  const renderColoredText = (text: string) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const tagRegex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = tagRegex.exec(text)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }

      // Add the colored tag
      const tagName = match[1].toLowerCase();
      const color = tagColors[tagName] || '#9e9e9e';
      parts.push(
        <span key={key++} style={{ color, fontWeight: 500 }}>
          [{match[1]}]
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const [isEditingTaggedText, setIsEditingTaggedText] = useState(false);

  const promptPanel = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Script with Audio Tags
        </Typography>
        <Button
          size="small"
          onClick={() => setIsEditingTaggedText(!isEditingTaggedText)}
          sx={{ textTransform: 'none', minWidth: 'auto', p: 0.5 }}
        >
          {isEditingTaggedText ? 'Preview' : 'Edit'}
        </Button>
      </Box>
      {isEditingTaggedText ? (
        <TextField
          fullWidth
          multiline
          rows={8}
          value={taggedText || script}
          onChange={(e) => setTaggedText(e.target.value)}
          placeholder="Script will be loaded from the Script zone..."
          variant="outlined"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            },
          }}
        />
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            minHeight: 200,
            maxHeight: 300,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setIsEditingTaggedText(true)}
        >
          {renderColoredText(taggedText || script) || (
            <Typography color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Script will be loaded from the Script zone...
            </Typography>
          )}
        </Paper>
      )}
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Available tags:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Chip size="small" label="dramatically" color="error" variant="outlined" />
            <Chip size="small" label="solemnly" color="primary" variant="outlined" />
            <Chip size="small" label="thoughtfully" color="info" variant="outlined" />
            <Chip size="small" label="with emphasis" color="warning" variant="outlined" />
            <Chip size="small" label="speaking softly" color="success" variant="outlined" />
            <Chip size="small" label="whispering" color="secondary" variant="outlined" />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip size="small" label="excited" sx={{ borderColor: '#ff9800', color: '#ff9800' }} variant="outlined" />
            <Chip size="small" label="sad" sx={{ borderColor: '#9c27b0', color: '#9c27b0' }} variant="outlined" />
            <Chip size="small" label="hopeful" sx={{ borderColor: '#4caf50', color: '#4caf50' }} variant="outlined" />
            <Chip size="small" label="speaking slowly" sx={{ borderColor: '#607d8b', color: '#607d8b' }} variant="outlined" />
            <Chip size="small" label="..." title="pause" sx={{ borderColor: '#795548', color: '#795548' }} variant="outlined" />
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={isGeneratingTags ? <CircularProgress size={14} /> : <AutoAwesome />}
          onClick={handleGenerateTags}
          disabled={isGeneratingTags || !script.trim()}
        >
          Auto-tag
        </Button>
      </Box>
    </Box>
  );

  const selectedVoiceData = voices.find((v) => v.voice_id === selectedVoice);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Voice selection and action buttons on same row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Voice</InputLabel>
          <Select
            value={selectedVoice}
            label="Voice"
            onChange={(e) => setSelectedVoice(e.target.value)}
            renderValue={(value) => {
              const voice = voices.find((v) => v.voice_id === value);
              return voice?.name || '';
            }}
          >
            {voices.map((voice) => (
              <MenuItem key={voice.voice_id} value={voice.voice_id}>
                <Box>
                  <Typography variant="body2">{voice.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {voice.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedVoiceData && (
          <IconButton
            size="small"
            onClick={() => previewVoice(selectedVoiceData)}
            color={previewingVoice === selectedVoice ? 'primary' : 'default'}
            title={previewingVoice === selectedVoice ? 'Stop preview' : 'Preview voice'}
          >
            {previewingVoice === selectedVoice ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          size="small"
          variant="contained"
          startIcon={isGeneratingAudio ? <CircularProgress size={14} /> : <VolumeUp />}
          onClick={handleGenerateAudio}
          disabled={isGeneratingAudio || !selectedVoice}
        >
          Generate Audio
        </Button>
        {audioUrl && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
            >
              Regenerate
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Save />}
              onClick={handleSaveAudio}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              endIcon={<ArrowForward />}
              onClick={handleProceedToImage}
            >
              Proceed to Images
            </Button>
          </>
        )}
      </Box>

      {/* Advanced settings toggle */}
      <Box>
        <Button
          size="small"
          onClick={() => setShowAdvanced(!showAdvanced)}
          sx={{ textTransform: 'none', color: 'text.secondary', p: 0 }}
        >
          {showAdvanced ? '▼ Hide Advanced' : '▶ Advanced'}
        </Button>
        {showAdvanced && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Stability:
            </Typography>
            <Slider
              value={stability}
              onChange={(_, v) => setStability(v as number)}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              sx={{ width: 120 }}
            />
            <Typography variant="caption" color="text.secondary">
              {stability.toFixed(2)}
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <audio ref={previewAudioRef} onEnded={() => setPreviewingVoice(null)} />
    </Box>
  );

  const currentWordIndex = getCurrentWordIndex();

  const outputPanel = (
    <Box>
      {!audioUrl ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'text.secondary',
          }}
        >
          <Typography>
            Generated audio will appear here with synchronized text playback.
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* Audio Player */}
          <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={togglePlayback} color="primary" size="large">
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Slider
                value={currentTime}
                max={audioRef.current?.duration || 100}
                onChange={(_, v) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = v as number;
                  }
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </Typography>
            <audio ref={audioRef} src={audioUrl} />
          </Paper>

          {/* Synchronized Text Display */}
          <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
            <Typography component="div" sx={{ lineHeight: 2 }}>
              {timestamps.map((ts, index) => (
                <Typography
                  key={index}
                  component="span"
                  sx={{
                    backgroundColor: index === currentWordIndex ? 'primary.main' : 'transparent',
                    color: index === currentWordIndex ? 'primary.contrastText' : 'text.primary',
                    px: 0.5,
                    borderRadius: 0.5,
                    transition: 'all 0.1s',
                  }}
                >
                  {ts.text}{' '}
                </Typography>
              ))}
            </Typography>
          </Paper>

          {/* Saved Audios */}
          {savedAudios.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Saved Audio Files
              </Typography>
              <List dense>
                {savedAudios.map((audio) => (
                  <ListItem key={audio.id}>
                    <ListItemText
                      primary={`Audio ${audio.id.slice(0, 8)}`}
                      secondary={new Date(audio.createdAt).toLocaleString()}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setAudioUrl(audio.url);
                        }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Tagged Script"
      configTitle="Voice Settings"
      outputTitle="Audio Preview"
    />
  );
}
