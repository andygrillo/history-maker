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
  Save,
  ArrowForward,
  VolumeUp,
  Delete,
  Check,
  RadioButtonChecked,
  RadioButtonUnchecked,
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
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track multiple generated takes
  interface AudioTake {
    id: string;
    audioUrl: string;
    timestamps: TimestampData[];
    voiceId: string;
    voiceName: string;
    createdAt: Date;
    saved: boolean;
    saving: boolean;
    r2Url?: string;
  }
  const [takes, setTakes] = useState<AudioTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Get active take
  const activeTake = takes.find(t => t.id === activeTakeId);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const intentionalPlayRef = useRef(false);

  // Load script and saved audios on mount
  useEffect(() => {
    async function loadData() {
      if (!videoId) return;

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

          // Load all saved audios for this script
          const { data: audiosData } = await supabase
            .from('audios')
            .select('id, tagged_text, voice_id, r2_url, timestamps, created_at')
            .eq('script_id', scriptData.id)
            .order('created_at', { ascending: false });

          if (audiosData && audiosData.length > 0) {
            // Use tagged text from most recent audio
            if (audiosData[0].tagged_text) {
              setTaggedText(audiosData[0].tagged_text);
            }

            // Convert saved audios to takes
            const savedTakes: AudioTake[] = audiosData.map((audio) => {
              const voice = voices.find(v => v.voice_id === audio.voice_id);
              return {
                id: audio.id,
                audioUrl: audio.r2_url,
                timestamps: audio.timestamps || [],
                voiceId: audio.voice_id,
                voiceName: voice?.name || 'Unknown',
                createdAt: new Date(audio.created_at),
                saved: true,
                saving: false,
                r2Url: audio.r2_url,
              };
            });

            setTakes(savedTakes);
            if (savedTakes.length > 0) {
              setActiveTakeId(savedTakes[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    loadData();
  }, [videoId, voices]);

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
  }, [activeTake?.audioUrl]);

  // Reset playback when switching takes (unless intentionally playing)
  useEffect(() => {
    setCurrentTime(0);
    if (!intentionalPlayRef.current) {
      setIsPlaying(false);
    }
    intentionalPlayRef.current = false;
  }, [activeTakeId]);

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
          outputFormat,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate audio');

      // Create new take
      const voiceData = voices.find(v => v.voice_id === selectedVoice);
      const newTake: AudioTake = {
        id: crypto.randomUUID(),
        audioUrl: data.audioUrl,
        timestamps: data.timestamps,
        voiceId: selectedVoice,
        voiceName: voiceData?.name || 'Unknown',
        createdAt: new Date(),
        saved: false,
        saving: false,
      };

      setTakes(prev => [newTake, ...prev]);
      setActiveTakeId(newTake.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSaveTake = async (takeId: string) => {
    const take = takes.find(t => t.id === takeId);
    if (!take || !videoId || take.saved) return;

    // Mark as saving
    setTakes(prev => prev.map(t =>
      t.id === takeId ? { ...t, saving: true } : t
    ));
    setError(null);

    try {
      // Extract base64 from data URL
      const audioBase64 = take.audioUrl.replace(/^data:audio\/\w+;base64,/, '');

      const response = await fetch('/api/audio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          audioBase64,
          taggedText,
          voiceId: take.voiceId,
          stability,
          timestamps: take.timestamps,
          outputFormat,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save audio');

      // Mark as saved with R2 URL
      setTakes(prev => prev.map(t =>
        t.id === takeId ? { ...t, saved: true, saving: false, r2Url: data.url } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save audio');
      setTakes(prev => prev.map(t =>
        t.id === takeId ? { ...t, saving: false } : t
      ));
    }
  };

  const handleDeleteTake = (takeId: string) => {
    setTakes(prev => prev.filter(t => t.id !== takeId));
    if (activeTakeId === takeId) {
      const remaining = takes.filter(t => t.id !== takeId);
      setActiveTakeId(remaining[0]?.id || null);
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

  // Group timestamps into sentences
  const getSentences = () => {
    if (!activeTake) return [];

    const sentences: Array<{ text: string; startTime: number; endTime: number }> = [];
    let currentSentence: string[] = [];
    let sentenceStart = 0;
    let sentenceEnd = 0;

    activeTake.timestamps.forEach((ts) => {
      if (currentSentence.length === 0) {
        sentenceStart = ts.startTime;
      }
      currentSentence.push(ts.text);
      sentenceEnd = ts.endTime;

      // Check if this is end of sentence
      if (ts.text === '.' || ts.text === '!' || ts.text === '?') {
        sentences.push({
          text: currentSentence.join(' ').replace(/ ([.!?,])/g, '$1'),
          startTime: sentenceStart,
          endTime: sentenceEnd,
        });
        currentSentence = [];
      }
    });

    // Add remaining words as final sentence
    if (currentSentence.length > 0) {
      sentences.push({
        text: currentSentence.join(' '),
        startTime: sentenceStart,
        endTime: sentenceEnd,
      });
    }

    return sentences;
  };

  // Find current sentence based on timestamp
  const getCurrentSentence = () => {
    const sentences = getSentences();
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (currentTime >= sentences[i].startTime) {
        return sentences[i].text;
      }
    }
    return '';
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

  // Estimate voiceover time (~150 words per minute for narration)
  const getEstimatedTime = (text: string) => {
    // Remove tags and count words
    const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\.\.\./g, ' ');
    const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;
    const minutes = wordCount / 150;
    if (minutes < 1) {
      return `~${Math.round(minutes * 60)}s`;
    }
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `~${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const promptPanel = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Script with Audio Tags
          </Typography>
          {(taggedText || script) && (
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
              {getEstimatedTime(taggedText || script)}
            </Typography>
          )}
        </Box>
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
          {takes.length > 0 ? 'New Take' : 'Generate Audio'}
        </Button>
        {takes.length > 0 && (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            endIcon={<ArrowForward />}
            onClick={handleProceedToImage}
          >
            Proceed to Images
          </Button>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                sx={{ width: 100 }}
              />
              <Typography variant="caption" color="text.secondary">
                {stability.toFixed(2)}
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={outputFormat}
                label="Format"
                onChange={(e) => setOutputFormat(e.target.value)}
              >
                <MenuItem value="mp3_44100_128">MP3 128kbps</MenuItem>
                <MenuItem value="mp3_44100_192">MP3 192kbps</MenuItem>
                <MenuItem value="pcm_16000">PCM 16kHz</MenuItem>
                <MenuItem value="pcm_22050">PCM 22kHz</MenuItem>
                <MenuItem value="pcm_24000">PCM 24kHz</MenuItem>
                <MenuItem value="pcm_44100">PCM 44kHz</MenuItem>
              </Select>
            </FormControl>
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

  const outputPanel = (
    <Box>
      {takes.length === 0 ? (
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
          {/* Audio Player - only for unsaved takes (preview mode) */}
          {activeTake && !activeTake.saved && (
            <>
              <Paper sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
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
              </Paper>

              {/* Current Sentence Display */}
              <Paper
                sx={{
                  py: 1,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 40,
                  mb: 2,
                }}
              >
                <Typography
                  variant="body1"
                  component="div"
                  sx={{
                    textAlign: 'center',
                  }}
                >
                  {getCurrentSentence()}
                </Typography>
              </Paper>
            </>
          )}

          {/* Hidden audio element for all playback */}
          {activeTake && (
            <audio ref={audioRef} src={activeTake.audioUrl} />
          )}

          {/* Takes List */}
          <Typography variant="subtitle2" gutterBottom>
            Generated Takes
          </Typography>
          <List dense>
            {takes.map((take) => {
              const isThisTakePlaying = take.id === activeTakeId && isPlaying;
              return (
                <ListItem
                  key={take.id}
                  sx={{
                    bgcolor: take.id === activeTakeId ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Play/Stop button */}
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      if (take.id !== activeTakeId) {
                        intentionalPlayRef.current = true;
                        setActiveTakeId(take.id);
                        setTimeout(() => {
                          if (audioRef.current) {
                            audioRef.current.load();
                            audioRef.current.play();
                            setIsPlaying(true);
                          }
                        }, 100);
                      } else {
                        togglePlayback();
                      }
                    }}
                  >
                    {isThisTakePlaying ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
                  </IconButton>

                  {/* Voice name and saved status */}
                  <Box sx={{ minWidth: 100 }}>
                    <Typography variant="body2">{take.voiceName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {take.createdAt.toLocaleTimeString()}
                    </Typography>
                  </Box>

                  {/* Moving dialogue when playing */}
                  <Box sx={{ flex: 1, mx: 2, overflow: 'hidden' }}>
                    {isThisTakePlaying && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontStyle: 'italic',
                          color: 'white',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {getCurrentSentence()}
                      </Typography>
                    )}
                  </Box>

                  {/* Status chip */}
                  {take.saved && (
                    <Chip size="small" label="Saved" color="success" sx={{ height: 20, mr: 1 }} />
                  )}

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!take.saved && (
                      <IconButton
                        size="small"
                        onClick={() => handleSaveTake(take.id)}
                        disabled={take.saving}
                        title="Save to R2"
                      >
                        {take.saving ? <CircularProgress size={18} /> : <Save fontSize="small" />}
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTake(take.id)}
                      title="Remove"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
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
