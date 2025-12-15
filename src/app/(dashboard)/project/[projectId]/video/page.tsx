'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  Videocam,
  PlayArrow,
  Download,
  ArrowForward,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { VideoModel, CameraMovement } from '@/types';

const videoModels: { value: VideoModel; label: string; description: string }[] = [
  { value: 'veo3.1_fast', label: 'Veo 3.1 Fast', description: 'Quick generation, good quality' },
  { value: 'veo3.1', label: 'Veo 3.1', description: 'Best quality, slower' },
  { value: 'kling2.6', label: 'Kling 2.6', description: '5s or 10s options' },
  { value: 'sora2', label: 'Sora 2', description: 'Up to 20s clips' },
];

const durationOptions: Record<VideoModel, number[]> = {
  'veo3.1_fast': [4, 6, 8],
  'veo3.1': [4, 6, 8],
  'kling2.6': [5, 10],
  'sora2': [5, 10, 15, 20],
};

interface Visual {
  id: string;
  sequenceNumber: number;
  description: string;
  cameraMovement: CameraMovement;
  imageUrl: string;
}

interface VideoClip {
  id: string;
  visualId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  error?: string;
}

export default function VideoPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const videoId = searchParams.get('videoId');

  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [videoClips, setVideoClips] = useState<Map<string, VideoClip>>(new Map());
  const [selectedModel, setSelectedModel] = useState<VideoModel>('veo3.1_fast');
  const [selectedDuration, setSelectedDuration] = useState(4);
  const [selectedFormat, setSelectedFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load visuals with selected images on mount
  useEffect(() => {
    async function loadVisuals() {
      if (videoId) {
        try {
          const response = await fetch(`/api/visuals/${videoId}`);
          if (response.ok) {
            const data = await response.json();
            setVisuals(data.visuals);

            // Initialize video clips state
            const clips = new Map<string, VideoClip>();
            data.videoClips?.forEach((clip: VideoClip) => {
              clips.set(clip.visualId, clip);
            });
            setVideoClips(clips);
          }
        } catch (err) {
          console.error('Failed to load visuals:', err);
        }
      }
    }
    loadVisuals();
  }, [videoId]);

  // Update duration options when model changes
  useEffect(() => {
    const options = durationOptions[selectedModel];
    if (!options.includes(selectedDuration)) {
      setSelectedDuration(options[0]);
    }
  }, [selectedModel]);

  const handleGenerateVideo = async (visual: Visual) => {
    setError(null);

    // Update clip status to processing
    setVideoClips((prev) => {
      const updated = new Map(prev);
      updated.set(visual.id, {
        id: `temp-${visual.id}`,
        visualId: visual.id,
        status: 'processing',
        progress: 0,
      });
      return updated;
    });

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualId: visual.id,
          imageUrl: visual.imageUrl,
          prompt: visual.description,
          cameraMovement: visual.cameraMovement,
          model: selectedModel,
          duration: selectedDuration,
          format: selectedFormat,
        }),
      });

      if (!response.ok) throw new Error('Failed to start video generation');

      const data = await response.json();

      // Start polling for completion
      pollVideoStatus(visual.id, data.operationId);
    } catch (err) {
      setVideoClips((prev) => {
        const updated = new Map(prev);
        updated.set(visual.id, {
          id: `error-${visual.id}`,
          visualId: visual.id,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Generation failed',
        });
        return updated;
      });
    }
  };

  const pollVideoStatus = async (visualId: string, operationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/status?operationId=${operationId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setVideoClips((prev) => {
            const updated = new Map(prev);
            updated.set(visualId, {
              id: data.clipId,
              visualId,
              status: 'completed',
              videoUrl: data.videoUrl,
            });
            return updated;
          });
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setVideoClips((prev) => {
            const updated = new Map(prev);
            updated.set(visualId, {
              id: `error-${visualId}`,
              visualId,
              status: 'failed',
              error: data.error || 'Generation failed',
            });
            return updated;
          });
        } else {
          // Update progress
          setVideoClips((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(visualId);
            if (existing) {
              updated.set(visualId, {
                ...existing,
                progress: data.progress || (existing.progress || 0) + 5,
              });
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 10000); // Poll every 10 seconds

    // Timeout after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setVideoClips((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(visualId);
        if (existing?.status === 'processing') {
          updated.set(visualId, {
            ...existing,
            status: 'failed',
            error: 'Generation timed out',
          });
        }
        return updated;
      });
    }, 600000);
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    for (const visual of visuals) {
      const clip = videoClips.get(visual.id);
      if (!clip || clip.status === 'failed') {
        await handleGenerateVideo(visual);
        // Small delay between generations
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    setIsGenerating(false);
  };

  const handleProceedToMusic = () => {
    if (videoId) {
      router.push(`/project/${projectId}/music?videoId=${videoId}`);
    }
  };

  const getClipStatusIcon = (clip?: VideoClip) => {
    if (!clip) return <Schedule color="disabled" />;
    switch (clip.status) {
      case 'processing':
        return <CircularProgress size={20} />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const completedCount = Array.from(videoClips.values()).filter((c) => c.status === 'completed').length;

  const promptPanel = (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Images ready for video generation: {visuals.length}
      </Typography>
      <Grid container spacing={1}>
        {visuals.slice(0, 8).map((visual) => (
          <Grid size={{ xs: 3 }} key={visual.id}>
            <Card variant="outlined" sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height="60"
                image={visual.imageUrl}
                sx={{ objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'background.paper',
                  borderRadius: '50%',
                  p: 0.5,
                }}
              >
                {getClipStatusIcon(videoClips.get(visual.id))}
              </Box>
            </Card>
          </Grid>
        ))}
        {visuals.length > 8 && (
          <Grid size={{ xs: 3 }}>
            <Box
              sx={{
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary">+{visuals.length - 8} more</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={(e) => setSelectedModel(e.target.value as VideoModel)}
          >
            {videoModels.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                <Box>
                  <Typography>{m.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Duration</InputLabel>
          <Select
            value={selectedDuration}
            label="Duration"
            onChange={(e) => setSelectedDuration(e.target.value as number)}
          >
            {durationOptions[selectedModel].map((d) => (
              <MenuItem key={d} value={d}>
                {d} seconds
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Format</InputLabel>
          <Select
            value={selectedFormat}
            label="Format"
            onChange={(e) => setSelectedFormat(e.target.value as 'landscape' | 'portrait')}
          >
            <MenuItem value="landscape">Landscape (16:9)</MenuItem>
            <MenuItem value="portrait">Portrait (9:16)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={16} /> : <Videocam />}
          onClick={handleGenerateAll}
          disabled={isGenerating || visuals.length === 0}
        >
          Generate All Videos
        </Button>
        {completedCount > 0 && (
          <Button
            variant="contained"
            color="secondary"
            endIcon={<ArrowForward />}
            onClick={handleProceedToMusic}
          >
            Proceed to Music
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary">
        Progress: {completedCount} / {visuals.length} clips completed
      </Typography>
      <LinearProgress
        variant="determinate"
        value={(completedCount / visuals.length) * 100 || 0}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const outputPanel = (
    <Box>
      {visuals.length === 0 ? (
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
            No visuals available. Complete the Image zone first.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {visuals.map((visual) => {
            const clip = videoClips.get(visual.id);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={visual.id}>
                <Card variant="outlined">
                  <Box sx={{ position: 'relative' }}>
                    {clip?.status === 'completed' && clip.videoUrl ? (
                      <video
                        src={clip.videoUrl}
                        style={{ width: '100%', height: 150, objectFit: 'cover' }}
                        controls
                      />
                    ) : (
                      <CardMedia
                        component="img"
                        height="150"
                        image={visual.imageUrl}
                        sx={{
                          objectFit: 'cover',
                          filter: clip?.status === 'processing' ? 'brightness(0.5)' : 'none',
                        }}
                      />
                    )}
                    {clip?.status === 'processing' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <CircularProgress size={40} />
                        <Typography variant="caption" color="white" sx={{ mt: 1 }}>
                          {clip.progress || 0}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <CardContent sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">
                        Clip {visual.sequenceNumber}
                      </Typography>
                      <Chip
                        size="small"
                        label={visual.cameraMovement.replace('_', ' ')}
                        variant="outlined"
                      />
                    </Box>
                    {clip?.status === 'failed' && (
                      <Typography variant="caption" color="error">
                        {clip.error}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ pt: 0 }}>
                    {clip?.status === 'completed' ? (
                      <IconButton
                        size="small"
                        component="a"
                        href={clip.videoUrl || ''}
                        download
                      >
                        <Download />
                      </IconButton>
                    ) : (
                      <Button
                        size="small"
                        startIcon={clip?.status === 'processing' ? <CircularProgress size={14} /> : <Videocam />}
                        onClick={() => handleGenerateVideo(visual)}
                        disabled={clip?.status === 'processing'}
                      >
                        {clip?.status === 'failed' ? 'Retry' : 'Generate'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Source Images"
      configTitle="Video Generation Settings"
      outputTitle="Generated Video Clips"
    />
  );
}
