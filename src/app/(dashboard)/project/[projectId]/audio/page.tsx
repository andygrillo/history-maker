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
  AutoAwesome,
  Refresh,
  Save,
  ArrowForward,
  VolumeUp,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { TimestampData } from '@/types';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
}

export default function AudioPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const videoId = searchParams.get('videoId');

  const [script, setScript] = useState('');
  const [taggedText, setTaggedText] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
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
      // Load script from video
      if (videoId) {
        try {
          const response = await fetch(`/api/scripts/${videoId}`);
          if (response.ok) {
            const data = await response.json();
            setScript(data.generatedScript || '');
          }
        } catch (err) {
          console.error('Failed to load script:', err);
        }
      }

      // Load voices
      try {
        const response = await fetch('/api/elevenlabs/voices');
        if (response.ok) {
          const data = await response.json();
          setVoices(data.voices);
          if (data.voices.length > 0) {
            setSelectedVoice(data.voices[0].voice_id);
          }
        }
      } catch (err) {
        console.error('Failed to load voices:', err);
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
      previewAudioRef.current.src = voice.preview_url;
      previewAudioRef.current.play();
      setPreviewingVoice(voice.voice_id);
    }
  };

  const handleProceedToImage = () => {
    if (videoId) {
      router.push(`/project/${projectId}/image?videoId=${videoId}`);
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

  const promptPanel = (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Script with Audio Tags
      </Typography>
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
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip size="small" label="[dramatic]" />
        <Chip size="small" label="[whispered]" />
        <Chip size="small" label="[urgent]" />
        <Chip size="small" label="[calm]" />
        <Chip size="small" label="..." />
      </Box>
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Voice</InputLabel>
          <Select
            value={selectedVoice}
            label="Voice"
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voices.map((voice) => (
              <MenuItem key={voice.voice_id} value={voice.voice_id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography>{voice.name}</Typography>
                  <Chip size="small" label={voice.category} variant="outlined" />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      previewVoice(voice);
                    }}
                  >
                    <VolumeUp fontSize="small" />
                  </IconButton>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ width: 200 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Stability: {stability.toFixed(2)}
          </Typography>
          <Slider
            value={stability}
            onChange={(_, v) => setStability(v as number)}
            min={0}
            max={1}
            step={0.05}
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={isGeneratingTags ? <CircularProgress size={16} /> : <AutoAwesome />}
          onClick={handleGenerateTags}
          disabled={isGeneratingTags || !script.trim()}
        >
          Auto-tag Script
        </Button>
        <Button
          variant="contained"
          startIcon={isGeneratingAudio ? <CircularProgress size={16} /> : <VolumeUp />}
          onClick={handleGenerateAudio}
          disabled={isGeneratingAudio || !selectedVoice}
        >
          Generate Audio
        </Button>
        {audioUrl && (
          <>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
            >
              Regenerate
            </Button>
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={handleSaveAudio}
            >
              Save to R2
            </Button>
            <Button
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
