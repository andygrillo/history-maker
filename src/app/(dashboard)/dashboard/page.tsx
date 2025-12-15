'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  DialogContentText,
} from '@mui/material';
import { Add, VideoLibrary, Delete, Casino } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';

interface SeriesWithCount {
  id: string;
  topic: string;
  created_at: string;
  updated_at: string;
  video_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seriesList, setSeriesList] = useState<SeriesWithCount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriesToDelete, setSeriesToDelete] = useState<SeriesWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingLucky, setIsLoadingLucky] = useState(false);

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Get all series with video counts
    const { data: series, error } = await supabase
      .from('series')
      .select(`
        id,
        topic,
        created_at,
        updated_at,
        videos(count)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load series:', error);
      setIsLoading(false);
      return;
    }

    const seriesWithCounts: SeriesWithCount[] = (series || []).map((s) => ({
      id: s.id,
      topic: s.topic,
      created_at: s.created_at,
      updated_at: s.updated_at,
      video_count: (s.videos as { count: number }[])?.[0]?.count || 0,
    }));

    setSeriesList(seriesWithCounts);
    setIsLoading(false);
  }

  async function handleFeelingLucky() {
    setIsLoadingLucky(true);
    try {
      const response = await fetch('/api/planner/lucky', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setNewTopic(data.topic);
      }
    } catch (err) {
      console.error('Failed to generate topic:', err);
    } finally {
      setIsLoadingLucky(false);
    }
  }

  async function handleCreateSeries() {
    if (!newTopic.trim()) return;

    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newSeries, error } = await supabase
      .from('series')
      .insert({ user_id: user.id, topic: newTopic.trim() })
      .select('id')
      .single();

    if (error || !newSeries) {
      console.error('Failed to create series:', error);
      setIsCreating(false);
      return;
    }

    setDialogOpen(false);
    setNewTopic('');
    setIsCreating(false);

    // Navigate to the new series planner page
    router.push(`/series/${newSeries.id}/planner`);
  }

  function handleOpenSeries(seriesId: string) {
    router.push(`/series/${seriesId}/planner`);
  }

  function handleDeleteClick(e: React.MouseEvent, series: SeriesWithCount) {
    e.stopPropagation();
    setSeriesToDelete(series);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!seriesToDelete) return;

    setIsDeleting(true);

    const { error } = await supabase
      .from('series')
      .delete()
      .eq('id', seriesToDelete.id);

    if (error) {
      console.error('Failed to delete series:', error);
      setIsDeleting(false);
      return;
    }

    // Remove from local state
    setSeriesList((prev) => prev.filter((s) => s.id !== seriesToDelete.id));
    setDeleteDialogOpen(false);
    setSeriesToDelete(null);
    setIsDeleting(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header />
        <Container sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading your series...</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Your Series</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            New Series
          </Button>
        </Box>

        <Grid container spacing={3}>
          {seriesList.map((series) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={series.id}>
              <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
                <CardActionArea onClick={() => handleOpenSeries(series.id)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap sx={{ pr: 4 }}>
                      {series.topic}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        icon={<VideoLibrary />}
                        label={`${series.video_count} video${series.video_count !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {formatDate(series.updated_at)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteClick(e, series)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Card>
            </Grid>
          ))}

          {seriesList.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  cursor: 'pointer',
                }}
                onClick={() => setDialogOpen(true)}
              >
                <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  Create your first documentary series
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Create Series Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Series</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={1}
                maxRows={3}
                placeholder="e.g., The French Revolution, Ancient Rome, World War II"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateSeries()}
              />
              <IconButton
                onClick={handleFeelingLucky}
                disabled={isLoadingLucky}
                sx={{ border: 1, borderColor: 'divider', flexShrink: 0 }}
              >
                {isLoadingLucky ? <CircularProgress size={20} /> : <Casino />}
              </IconButton>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateSeries}
              disabled={!newTopic.trim() || isCreating}
            >
              {isCreating ? <CircularProgress size={20} /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Series</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{seriesToDelete?.topic}"? This will also delete all
              {seriesToDelete?.video_count ? ` ${seriesToDelete.video_count}` : ''} video{seriesToDelete?.video_count !== 1 ? 's' : ''} and
              associated content. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
