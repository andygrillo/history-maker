'use client';

import { useState, useEffect } from 'react';
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
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AutoAwesome,
  Search,
  Add,
  Delete,
  Check,
  ArrowForward,
  Image as ImageIcon,
  FilterAlt,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { VisualTag, CameraMovement, ImageStyle, ImageFilter } from '@/types';

const cameraMovements: { value: CameraMovement; label: string }[] = [
  { value: 'drifting_still', label: 'Drifting Still' },
  { value: 'dolly_in', label: 'Dolly In' },
  { value: 'dolly_out', label: 'Dolly Out' },
  { value: 'pan_left', label: 'Pan Left' },
  { value: 'pan_right', label: 'Pan Right' },
  { value: 'tilt_up', label: 'Tilt Up' },
  { value: 'tilt_down', label: 'Tilt Down' },
  { value: 'zoom_in', label: 'Zoom In' },
  { value: 'zoom_out', label: 'Zoom Out' },
];

const imageStyles: { value: ImageStyle; label: string }[] = [
  { value: '18th_century_painting', label: '18th Century Painting' },
  { value: '20th_century_modern', label: '20th Century Modern' },
  { value: 'map_style', label: 'Map Style' },
  { value: 'document_style', label: 'Document Style' },
];

const imageFilters: { value: ImageFilter; label: string; description: string }[] = [
  { value: 'photorealistic_expand', label: 'Expand to 16:9', description: 'Create photorealistic version' },
  { value: 'yt_safe', label: 'YT Safe', description: 'Cover nudity for YouTube' },
  { value: 'map_enhancement', label: 'Map Enhancement', description: 'Optimize map visuals' },
  { value: 'document_enhancement', label: 'Document Enhancement', description: 'Optimize documents' },
];

interface ImageVariant {
  id: string;
  sourceUrl: string;
  processedUrl?: string;
  filters: ImageFilter[];
  isSelected: boolean;
}

interface Visual extends VisualTag {
  variants: ImageVariant[];
}

export default function ImagePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const videoId = searchParams.get('videoId');

  const [script, setScript] = useState('');
  const [clipDuration, setClipDuration] = useState(4);
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [selectedVisual, setSelectedVisual] = useState<Visual | null>(null);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTab, setSearchTab] = useState(0);
  const [generationStyle, setGenerationStyle] = useState<ImageStyle>('18th_century_painting');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ImageVariant | null>(null);

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

  const handleGenerateVisualTags = async () => {
    if (!script.trim()) {
      setError('No script available');
      return;
    }

    setIsGeneratingTags(true);
    setError(null);

    try {
      const response = await fetch('/api/image/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, clipDuration }),
      });

      if (!response.ok) throw new Error('Failed to generate visual tags');

      const data = await response.json();
      setVisuals(data.tags.map((tag: VisualTag) => ({ ...tag, variants: [] })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tags');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleSearchWikimedia = async (visual: Visual) => {
    setIsSearching(true);
    setSelectedVisual(visual);
    setError(null);

    try {
      const response = await fetch('/api/image/search-wikimedia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: visual.keywords }),
      });

      if (!response.ok) throw new Error('Failed to search Wikimedia');

      const data = await response.json();
      const newVariants: ImageVariant[] = data.images.map((img: { url: string; title: string }, i: number) => ({
        id: `${visual.id}-wiki-${i}`,
        sourceUrl: img.url,
        filters: [],
        isSelected: false,
      }));

      setVisuals((prev) =>
        prev.map((v) =>
          v.id === visual.id ? { ...v, variants: [...v.variants, ...newVariants] } : v
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateImage = async (visual: Visual) => {
    setIsGeneratingImage(true);
    setSelectedVisual(visual);
    setError(null);

    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: visual.description,
          style: generationStyle,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate image');

      const data = await response.json();
      const newVariant: ImageVariant = {
        id: `${visual.id}-gen-${Date.now()}`,
        sourceUrl: data.imageUrl,
        filters: [],
        isSelected: false,
      };

      setVisuals((prev) =>
        prev.map((v) =>
          v.id === visual.id ? { ...v, variants: [...v.variants, newVariant] } : v
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleApplyFilter = async (filter: ImageFilter) => {
    if (!selectedVariant) return;

    setIsApplyingFilter(true);
    setError(null);

    try {
      const response = await fetch('/api/image/apply-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedVariant.processedUrl || selectedVariant.sourceUrl,
          filter,
        }),
      });

      if (!response.ok) throw new Error('Failed to apply filter');

      const data = await response.json();

      setVisuals((prev) =>
        prev.map((v) => ({
          ...v,
          variants: v.variants.map((variant) =>
            variant.id === selectedVariant.id
              ? { ...variant, processedUrl: data.imageUrl, filters: [...variant.filters, filter] }
              : variant
          ),
        }))
      );

      setSelectedVariant((prev) =>
        prev ? { ...prev, processedUrl: data.imageUrl, filters: [...prev.filters, filter] } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply filter');
    } finally {
      setIsApplyingFilter(false);
    }
  };

  const handleSelectVariant = (visualId: string, variantId: string) => {
    setVisuals((prev) =>
      prev.map((v) =>
        v.id === visualId
          ? {
              ...v,
              variants: v.variants.map((variant) => ({
                ...variant,
                isSelected: variant.id === variantId,
              })),
            }
          : v
      )
    );
  };

  const handleProceedToVideo = () => {
    if (videoId) {
      router.push(`/project/${projectId}/video?videoId=${videoId}`);
    }
  };

  const promptPanel = (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={6}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Script will be loaded from previous zone..."
        variant="outlined"
        sx={{
          '& .MuiInputBase-root': {
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          },
        }}
      />
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
        <Box sx={{ width: 200 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Clip Duration: {clipDuration}s
          </Typography>
          <Slider
            value={clipDuration}
            onChange={(_, v) => setClipDuration(v as number)}
            min={2}
            max={10}
            marks={[
              { value: 4, label: '4s' },
              { value: 6, label: '6s' },
              { value: 8, label: '8s' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>AI Generation Style</InputLabel>
          <Select
            value={generationStyle}
            label="AI Generation Style"
            onChange={(e) => setGenerationStyle(e.target.value as ImageStyle)}
          >
            {imageStyles.map((style) => (
              <MenuItem key={style.value} value={style.value}>
                {style.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={isGeneratingTags ? <CircularProgress size={16} /> : <AutoAwesome />}
          onClick={handleGenerateVisualTags}
          disabled={isGeneratingTags || !script.trim()}
        >
          Generate Visual Tags
        </Button>
        {visuals.length > 0 && (
          <Button
            variant="contained"
            color="secondary"
            endIcon={<ArrowForward />}
            onClick={handleProceedToVideo}
          >
            Proceed to Video
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
            Visual tags will appear here. Generate tags to begin sourcing images.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {visuals.map((visual) => (
            <Card key={visual.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1">
                      Visual {visual.sequenceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {visual.description}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {visual.keywords.map((kw, i) => (
                        <Chip key={i} size="small" label={kw} variant="outlined" />
                      ))}
                      <Chip
                        size="small"
                        label={visual.cameraMovement.replace('_', ' ')}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={isSearching && selectedVisual?.id === visual.id ? <CircularProgress size={14} /> : <Search />}
                      onClick={() => handleSearchWikimedia(visual)}
                      disabled={isSearching}
                    >
                      Wikimedia
                    </Button>
                    <Button
                      size="small"
                      startIcon={isGeneratingImage && selectedVisual?.id === visual.id ? <CircularProgress size={14} /> : <ImageIcon />}
                      onClick={() => handleGenerateImage(visual)}
                      disabled={isGeneratingImage}
                    >
                      Generate
                    </Button>
                  </Box>
                </Box>

                {visual.variants.length > 0 && (
                  <Grid container spacing={1}>
                    {visual.variants.map((variant) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={variant.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            position: 'relative',
                            border: variant.isSelected ? 2 : 1,
                            borderColor: variant.isSelected ? 'primary.main' : 'divider',
                          }}
                        >
                          <CardMedia
                            component="img"
                            height="100"
                            image={variant.processedUrl || variant.sourceUrl}
                            sx={{ objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => handleSelectVariant(visual.id, variant.id)}
                          />
                          <CardActions sx={{ p: 0.5, justifyContent: 'space-between' }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedVariant(variant);
                                setFilterDialogOpen(true);
                              }}
                            >
                              <FilterAlt fontSize="small" />
                            </IconButton>
                            {variant.isSelected && <Check color="primary" fontSize="small" />}
                          </CardActions>
                          {variant.filters.length > 0 && (
                            <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
                              <Chip size="small" label={variant.filters.length} color="primary" />
                            </Box>
                          )}
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Image Filter</DialogTitle>
        <DialogContent>
          {selectedVariant && (
            <Box sx={{ mb: 2 }}>
              <img
                src={selectedVariant.processedUrl || selectedVariant.sourceUrl}
                alt="Preview"
                style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
              />
            </Box>
          )}
          <Grid container spacing={1}>
            {imageFilters.map((filter) => (
              <Grid size={{ xs: 6 }} key={filter.value}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleApplyFilter(filter.value)}
                  disabled={isApplyingFilter}
                  startIcon={isApplyingFilter ? <CircularProgress size={14} /> : null}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2">{filter.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {filter.description}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Script (read-only view)"
      configTitle="Visual Generation"
      outputTitle="Visual Tags & Images"
    />
  );
}
