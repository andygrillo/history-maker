'use client';

import { useState, useEffect } from 'react';
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
import { AutoAwesome, Refresh, ArrowForward, Casino } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { ContentCalendarItem } from '@/types';
import { createClient } from '@/lib/supabase/client';

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
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);

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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Save the topic to the series
    await saveTopic(topic);

    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId,
          topic,
          platforms: selectedPlatforms,
          weeklyGoal,
          timeHorizon,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content calendar');
      }

      const data = await response.json();
      setCalendarItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVideo = (item: ContentCalendarItem) => {
    // Video is already saved to database, just navigate to script page
    router.push(`/series/${seriesId}/script?videoId=${item.id}`);
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
    return <Chip size="small" label={labels[format]} color={colors[format]} />;
  };

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

        <Button
          variant="contained"
          size="small"
          startIcon={isGenerating ? <CircularProgress size={14} /> : <AutoAwesome />}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          Generate Plan
        </Button>
        {calendarItems.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            Regenerate
          </Button>
        )}
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
      {calendarItems.length === 0 ? (
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
            Enter your series topic above and click "Generate Plan" to get AI-suggested video ideas.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {calendarItems.map((item) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    {formatBadge(item.format)}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.scheduledDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {item.videoTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => handleSelectVideo(item)}
                  >
                    Create Script
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
      promptTitle="Series Topic"
      configTitle="Planning Options"
      outputTitle="Video Ideas"
    />
  );
}
