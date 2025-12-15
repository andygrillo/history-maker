'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { AutoAwesome, ArrowForward, Casino, Edit, Close, Save } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { createClient } from '@/lib/supabase/client';

interface VideoSlot {
  index: number;
  format: string;
  videoTitle?: string;
  description?: string;
  id?: string; // DB id if saved
  scheduledDate?: string;
  isEditing?: boolean;
  isGenerating?: boolean;
}

const platforms = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'youtube_short', label: 'YouTube Shorts' },
  { id: 'tiktok', label: 'TikTok' },
];

const timeHorizons = [
  { value: '1_week', label: '1 Week' },
  { value: '1_month', label: '1 Month' },
  { value: '3_months', label: '3 Months' },
];

const weeksMap: Record<string, number> = {
  '1_week': 1,
  '1_month': 4,
  '3_months': 12,
};

// Calculate platform breakdown using 1:3 ratio (same as bedrock.ts)
function calculatePlatformBreakdown(
  totalVideos: number,
  selectedPlatforms: string[]
): Record<string, number> {
  const hasYoutube = selectedPlatforms.includes('youtube');
  const otherPlatforms = selectedPlatforms.filter((p) => p !== 'youtube');
  const breakdown: Record<string, number> = {};

  if (hasYoutube && otherPlatforms.length > 0) {
    const youtubeCount = Math.max(1, Math.round(totalVideos / 4));
    const othersTotal = totalVideos - youtubeCount;
    const perOtherPlatform = Math.floor(othersTotal / otherPlatforms.length);
    const remainder = othersTotal % otherPlatforms.length;

    breakdown['youtube'] = youtubeCount;
    otherPlatforms.forEach((platform, index) => {
      breakdown[platform] = perOtherPlatform + (index < remainder ? 1 : 0);
    });
  } else if (hasYoutube) {
    breakdown['youtube'] = totalVideos;
  } else if (otherPlatforms.length > 0) {
    const perPlatform = Math.floor(totalVideos / otherPlatforms.length);
    const remainder = totalVideos % otherPlatforms.length;
    otherPlatforms.forEach((platform, index) => {
      breakdown[platform] = perPlatform + (index < remainder ? 1 : 0);
    });
  }

  return breakdown;
}

// Generate slots with platform assignments
function generateSlots(
  weeklyGoal: number,
  timeHorizon: string,
  selectedPlatforms: string[]
): VideoSlot[] {
  const weeks = weeksMap[timeHorizon] || 1;
  const totalVideos = weeks * weeklyGoal;
  const breakdown = calculatePlatformBreakdown(totalVideos, selectedPlatforms);

  const slots: VideoSlot[] = [];
  let index = 0;
  const startDate = new Date();

  // Create slots for each platform
  Object.entries(breakdown).forEach(([format, count]) => {
    for (let i = 0; i < count; i++) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(startDate.getDate() + Math.floor((index / totalVideos) * weeks * 7));

      slots.push({
        index,
        format,
        scheduledDate: scheduledDate.toISOString(),
      });
      index++;
    }
  });

  // Sort by scheduled date
  return slots.sort((a, b) =>
    new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
  );
}

export default function PlannerPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.seriesId as string;
  const supabase = createClient();

  const [topic, setTopic] = useState('');
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'youtube_short']);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [timeHorizon, setTimeHorizon] = useState('1_week');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingLucky, setIsLoadingLucky] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<VideoSlot[]>([]);
  const [existingVideos, setExistingVideos] = useState<VideoSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ index: number; title: string; description: string } | null>(null);

  // Load series topic on mount
  useEffect(() => {
    async function loadSeries() {
      const { data: series } = await supabase
        .from('series')
        .select('topic')
        .eq('id', seriesId)
        .single();

      if (series && series.topic !== 'My Documentary Series') {
        setTopic(series.topic);
      }
      setIsLoadingTopic(false);
    }
    loadSeries();
  }, [seriesId, supabase]);

  // Load existing videos for this series on mount
  useEffect(() => {
    async function loadVideos() {
      const { data: videos } = await supabase
        .from('videos')
        .select('id, title, description, format, scheduled_date, status')
        .eq('series_id', seriesId)
        .order('scheduled_date', { ascending: true });

      if (videos && videos.length > 0) {
        const items = videos.map((video, idx) => ({
          index: idx,
          id: video.id,
          videoTitle: video.title,
          description: video.description,
          format: video.format,
          scheduledDate: video.scheduled_date,
        }));
        setExistingVideos(items);
        setSlots(items);
      }
    }
    loadVideos();
  }, [seriesId, supabase]);

  // Calculate slots when config changes (only if no existing videos)
  const calculatedSlots = useMemo(() => {
    if (selectedPlatforms.length === 0) return [];
    return generateSlots(weeklyGoal, timeHorizon, selectedPlatforms);
  }, [weeklyGoal, timeHorizon, selectedPlatforms]);

  // Update slots when calculation changes (merge with existing)
  useEffect(() => {
    if (existingVideos.length > 0) {
      // Keep existing videos, they take priority
      setSlots(existingVideos);
    } else {
      setSlots(calculatedSlots);
    }
  }, [calculatedSlots, existingVideos]);

  // Save topic to series when it changes (debounced)
  const saveTopic = async (newTopic: string) => {
    if (!newTopic.trim()) return;
    await supabase
      .from('series')
      .update({ topic: newTopic.trim() })
      .eq('id', seriesId);
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleFeelingLucky = async () => {
    setIsLoadingLucky(true);
    setError(null);

    try {
      const response = await fetch('/api/planner/lucky', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate topic');
      }

      const data = await response.json();
      setTopic(data.topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topic');
    } finally {
      setIsLoadingLucky(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Save the topic to the series
    await saveTopic(topic);

    try {
      // Get only empty slots (no title)
      const emptySlots = slots.filter((s) => !s.videoTitle);

      if (emptySlots.length === 0) {
        setError('All slots are already filled');
        setIsGenerating(false);
        return;
      }

      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId,
          topic,
          slots: emptySlots.map((s) => ({
            index: s.index,
            format: s.format,
            scheduledDate: s.scheduledDate,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content calendar');
      }

      const data = await response.json();

      // Merge generated items back into slots
      setSlots((prev) => {
        const updated = [...prev];
        data.items.forEach((item: VideoSlot) => {
          const idx = updated.findIndex((s) => s.index === item.index);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], ...item };
          }
        });
        return updated;
      });

      // Update existing videos to include newly created ones
      setExistingVideos((prev) => {
        const newVideos = data.items.filter((item: VideoSlot) => item.id);
        return [...prev, ...newVideos];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSlot = async (slotIndex: number) => {
    if (!topic.trim()) {
      setError('Please enter a topic first');
      return;
    }

    const slot = slots.find((s) => s.index === slotIndex);
    if (!slot) return;

    // Mark slot as generating
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isGenerating: true } : s))
    );

    try {
      const existingTitles = slots
        .filter((s) => s.videoTitle && s.index !== slotIndex)
        .map((s) => s.videoTitle!);

      const response = await fetch('/api/planner/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId,
          topic,
          format: slot.format,
          scheduledDate: slot.scheduledDate,
          existingTitles,
          existingId: slot.id, // Pass existing ID to update instead of create
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate video idea');
      }

      const data = await response.json();

      setSlots((prev) =>
        prev.map((s) =>
          s.index === slotIndex
            ? {
                ...s,
                id: data.id,
                videoTitle: data.title,
                description: data.description,
                isGenerating: false,
              }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video idea');
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isGenerating: false } : s))
      );
    }
  };

  const handleStartEdit = (slot: VideoSlot) => {
    setEditingSlot({
      index: slot.index,
      title: slot.videoTitle || '',
      description: slot.description || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSlot) return;

    const slot = slots.find((s) => s.index === editingSlot.index);
    if (!slot) return;

    try {
      if (slot.id) {
        // Update existing video
        await supabase
          .from('videos')
          .update({
            title: editingSlot.title,
            description: editingSlot.description,
          })
          .eq('id', slot.id);
      } else {
        // Create new video
        const { data } = await supabase
          .from('videos')
          .insert({
            series_id: seriesId,
            title: editingSlot.title,
            description: editingSlot.description,
            format: slot.format,
            scheduled_date: slot.scheduledDate,
            status: 'planned',
          })
          .select('id')
          .single();

        if (data) {
          slot.id = data.id;
        }
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.index === editingSlot.index
            ? { ...s, videoTitle: editingSlot.title, description: editingSlot.description, id: slot.id }
            : s
        )
      );

      setEditingSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save video');
    }
  };

  const handleDeleteSlot = async (slotIndex: number) => {
    const slot = slots.find((s) => s.index === slotIndex);
    if (!slot) return;

    try {
      if (slot.id) {
        // Delete from database
        await supabase.from('videos').delete().eq('id', slot.id);
      }

      // Remove from slots
      setSlots((prev) => prev.filter((s) => s.index !== slotIndex));
      setExistingVideos((prev) => prev.filter((s) => s.index !== slotIndex));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    }
  };

  const handleSelectVideo = (slot: VideoSlot) => {
    if (slot.id) {
      router.push(`/series/${seriesId}/script?videoId=${slot.id}`);
    }
  };

  const formatBadge = (format: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'error'> = {
      youtube: 'primary',
      youtube_short: 'secondary',
      tiktok: 'error',
    };
    const labels: Record<string, string> = {
      youtube: 'YouTube',
      youtube_short: 'Shorts',
      tiktok: 'TikTok',
    };
    return <Chip size="small" label={labels[format] || format} color={colors[format] || 'default'} />;
  };

  const totalSlots = useMemo(() => {
    const weeks = weeksMap[timeHorizon] || 1;
    return weeks * weeklyGoal;
  }, [weeklyGoal, timeHorizon]);

  const promptPanel = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        fullWidth
        placeholder="Enter your series topic: 'The French Revolution', 'Ancient Rome', 'World War II'..."
        value={isLoadingTopic ? '' : topic}
        onChange={(e) => setTopic(e.target.value)}
        variant="outlined"
        size="small"
        disabled={isLoadingTopic}
      />
      <IconButton
        onClick={handleFeelingLucky}
        disabled={isLoadingLucky || isLoadingTopic}
        size="small"
        sx={{ border: 1, borderColor: 'divider' }}
      >
        {isLoadingLucky ? <CircularProgress size={18} /> : <Casino />}
      </IconButton>
    </Box>
  );

  const emptySlotCount = slots.filter((s) => !s.videoTitle).length;

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <FormGroup row sx={{ gap: 0 }}>
          {platforms.map((platform) => (
            <FormControlLabel
              key={platform.id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => handlePlatformToggle(platform.id)}
                />
              }
              label={<Typography variant="body2">{platform.label}</Typography>}
            />
          ))}
        </FormGroup>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {weeklyGoal}/week
          </Typography>
          <Slider
            value={weeklyGoal}
            onChange={(_, value) => setWeeklyGoal(value as number)}
            min={1}
            max={7}
            size="small"
            sx={{ width: 100 }}
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            displayEmpty
          >
            {timeHorizons.map((h) => (
              <MenuItem key={h.value} value={h.value}>
                {h.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary">
          {totalSlots} videos
        </Typography>

        <Button
          variant="contained"
          size="small"
          startIcon={isGenerating ? <CircularProgress size={14} /> : <AutoAwesome />}
          onClick={handleGenerateAll}
          disabled={isGenerating || emptySlotCount === 0}
        >
          Generate {emptySlotCount > 0 ? `(${emptySlotCount})` : 'All'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const outputPanel = (
    <Box>
      {slots.length === 0 ? (
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
            Select platforms and adjust the slider to create video slots.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {slots.map((slot) => {
            const isEditing = editingSlot?.index === slot.index;
            const isEmpty = !slot.videoTitle;

            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={slot.index}>
                <Card
                  variant="outlined"
                  sx={{
                    opacity: slot.isGenerating ? 0.7 : 1,
                    borderStyle: isEmpty ? 'dashed' : 'solid',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      {formatBadge(slot.format)}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {slot.isGenerating ? (
                          <CircularProgress size={20} />
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => isEditing ? handleSaveEdit() : handleStartEdit(slot)}
                              title={isEditing ? 'Save' : 'Edit'}
                            >
                              {isEditing ? <Save fontSize="small" /> : <Edit fontSize="small" />}
                            </IconButton>
                            {!isEditing && (
                              <IconButton
                                size="small"
                                onClick={() => handleRegenerateSlot(slot.index)}
                                title="Regenerate with AI"
                                disabled={!topic.trim()}
                              >
                                <AutoAwesome fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSlot(slot.index)}
                              title="Delete"
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>

                    {isEditing ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Video title..."
                          value={editingSlot.title}
                          onChange={(e) => setEditingSlot({ ...editingSlot, title: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          placeholder="Description..."
                          value={editingSlot.description}
                          onChange={(e) => setEditingSlot({ ...editingSlot, description: e.target.value })}
                          fullWidth
                          multiline
                          rows={2}
                        />
                      </Box>
                    ) : isEmpty ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 80,
                          color: 'text.secondary',
                        }}
                      >
                        <Typography variant="body2">
                          Empty slot - click edit or generate
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Typography variant="subtitle1" gutterBottom>
                          {slot.videoTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {slot.description}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                  {!isEmpty && !isEditing && slot.id && (
                    <CardActions>
                      <Button
                        size="small"
                        endIcon={<ArrowForward />}
                        onClick={() => handleSelectVideo(slot)}
                      >
                        Create Script
                      </Button>
                    </CardActions>
                  )}
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
      promptTitle="Series Topic"
      configTitle="Planning Options"
      outputTitle="Video Ideas"
    />
  );
}
