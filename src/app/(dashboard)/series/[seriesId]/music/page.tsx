'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Slider,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  AutoAwesome,
  Search,
  ArrowForward,
  Check,
  Download,
  MusicNote,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { MusicTrack } from '@/types';

interface MusicAnalysis {
  mood: string;
  tempo: string;
  genres: string[];
  sections: Array<{
    startPosition: number;
    endPosition: number;
    mood: string;
    intensity: string;
  }>;
}

export default function MusicPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  const [script, setScript] = useState('');
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load script on mount
  useEffect(() => {
    async function loadScript() {
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
    }
    loadScript();
  }, [videoId]);

  const handleAnalyzeScript = async () => {
    if (!script.trim()) {
      setError('No script available');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/music/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) throw new Error('Failed to analyze script');

      const data = await response.json();
      setAnalysis(data.analysis);

      // Auto-search based on analysis
      setSearchQuery(`${data.analysis.mood} ${data.analysis.genres.join(' ')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          mood: analysis?.mood,
          tempo: analysis?.tempo,
          genres: analysis?.genres,
        }),
      });

      if (!response.ok) throw new Error('Failed to search music');

      const data = await response.json();
      setTracks(data.tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks((prev) => {
      const updated = new Set(prev);
      if (updated.has(trackId)) {
        updated.delete(trackId);
      } else {
        updated.add(trackId);
      }
      return updated;
    });
  };

  const playTrack = (track: MusicTrack) => {
    if (audioRef.current) {
      if (playingTrackId === track.id) {
        audioRef.current.pause();
        setPlayingTrackId(null);
      } else {
        audioRef.current.src = track.previewUrl;
        audioRef.current.play();
        setPlayingTrackId(track.id);
      }
    }
  };

  const handleSaveSelection = async () => {
    if (selectedTracks.size === 0) {
      setError('Please select at least one track');
      return;
    }

    try {
      const response = await fetch('/api/music/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          trackIds: Array.from(selectedTracks),
        }),
      });

      if (!response.ok) throw new Error('Failed to save selection');

      router.push(`/series/${seriesId}/export?videoId=${videoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const promptPanel = (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Script excerpt for music analysis
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={5}
        value={script.slice(0, 1000) + (script.length > 1000 ? '...' : '')}
        InputProps={{ readOnly: true }}
        variant="outlined"
        sx={{
          '& .MuiInputBase-root': {
            fontFamily: 'monospace',
            fontSize: '0.8rem',
          },
        }}
      />
      {analysis && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            AI Analysis Results
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Mood: ${analysis.mood}`} color="primary" size="small" />
            <Chip label={`Tempo: ${analysis.tempo}`} color="secondary" size="small" />
            {analysis.genres.map((genre, i) => (
              <Chip key={i} label={genre} variant="outlined" size="small" />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={isAnalyzing ? <CircularProgress size={16} /> : <AutoAwesome />}
          onClick={handleAnalyzeScript}
          disabled={isAnalyzing || !script.trim()}
        >
          Analyze Script
        </Button>

        <TextField
          sx={{ flex: 1 }}
          placeholder="Search for music (mood, genre, tempo...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <CircularProgress size={20} /> : <Search />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {selectedTracks.size > 0 && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography>
            {selectedTracks.size} track(s) selected
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            endIcon={<ArrowForward />}
            onClick={handleSaveSelection}
          >
            Save & Proceed to Export
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setPlayingTrackId(null)}
      />
    </Box>
  );

  const outputPanel = (
    <Box>
      {tracks.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'text.secondary',
          }}
        >
          <MusicNote sx={{ fontSize: 48, mb: 2 }} />
          <Typography>
            Analyze your script or search for music to find matching tracks.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {tracks.map((track) => (
            <Grid size={{ xs: 12, sm: 6 }} key={track.id}>
              <Card
                variant="outlined"
                sx={{
                  border: selectedTracks.has(track.id) ? 2 : 1,
                  borderColor: selectedTracks.has(track.id) ? 'primary.main' : 'divider',
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1">{track.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {track.artist}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDuration(track.duration)}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={track.mood} variant="outlined" />
                    <Chip size="small" label={track.tempo} variant="outlined" />
                    <Chip size="small" label={track.genre} variant="outlined" />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Box>
                    <IconButton
                      onClick={() => playTrack(track)}
                      color={playingTrackId === track.id ? 'primary' : 'default'}
                    >
                      {playingTrackId === track.id ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton size="small">
                      <Download />
                    </IconButton>
                  </Box>
                  <Button
                    size="small"
                    variant={selectedTracks.has(track.id) ? 'contained' : 'outlined'}
                    startIcon={selectedTracks.has(track.id) ? <Check /> : null}
                    onClick={() => toggleTrackSelection(track.id)}
                  >
                    {selectedTracks.has(track.id) ? 'Selected' : 'Select'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Script Analysis"
      configTitle="Music Search"
      outputTitle="Available Tracks"
    />
  );
}
