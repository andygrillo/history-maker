'use client';

import { useState, useEffect, useRef } from 'react';
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
  TextField,
  Tooltip,
  Chip,
  Dialog,
  IconButton,
} from '@mui/material';
import { AutoAwesome, ArrowForward, ArrowBack, Search, Check, SkipNext, CloudUpload, Brush, Close } from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { createClient } from '@/lib/supabase/client';

// Available visual durations for video clips
const availableDurations = [4, 6, 8];

// Image option from Wikimedia
interface ImageOption {
  url: string;
  title: string;
  thumb: string;
  license?: string;
  description?: string;
  artist?: string;
  date?: string;
  width?: number;
  height?: number;
}

// Media type filter
type MediaType = 'all' | 'paintings' | 'engravings' | 'maps' | 'pre1900';

const mediaTypeOptions: { value: MediaType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'paintings', label: 'Paintings' },
  { value: 'engravings', label: 'Engravings' },
  { value: 'maps', label: 'Maps' },
  { value: 'pre1900', label: 'Pre-1900' },
];

// Quality filter
type QualityFilter = 'all' | 'valued' | 'featured';

const qualityOptions: { value: QualityFilter; label: string }[] = [
  { value: 'all', label: 'All Quality' },
  { value: 'valued', label: 'Valued Images' },
  { value: 'featured', label: 'Featured' },
];

// Visual item
interface VisualItem {
  id: string;
  number: number;
  description: string;
  keywords: string;
  selectedUrl?: string;
  selectedThumb?: string;
}

export default function ImagePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  // Script and tagging state
  const [script, setScript] = useState('');
  const [taggedScript, setTaggedScript] = useState('');
  const [visualDuration, setVisualDuration] = useState(8);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  // Visuals state
  const [visuals, setVisuals] = useState<VisualItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Search state for current visual
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [searchResults, setSearchResults] = useState<ImageOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAspectRatio, setAiAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const [error, setError] = useState<string | null>(null);

  // Image preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);

  // Ref for script container to scroll to active tag
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  const currentVisual = visuals[currentIndex];

  // Calculate estimated script duration and number of visuals
  const getScriptStats = (text: string) => {
    const cleanText = text.replace(/\(VISUAL \d+:[^)]+\)/g, '');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const durationSeconds = (wordCount / 150) * 60;
    const numVisuals = Math.max(1, Math.round(durationSeconds / visualDuration));
    return { wordCount, durationSeconds, numVisuals };
  };

  const stats = getScriptStats(script);

  // Load script on mount
  useEffect(() => {
    async function loadScript() {
      if (!videoId) return;

      try {
        const supabase = createClient();

        const { data: scriptData } = await supabase
          .from('scripts')
          .select('generated_script')
          .eq('video_id', videoId)
          .single();

        if (scriptData) {
          setScript(scriptData.generated_script || '');
        }
      } catch (err) {
        console.error('Failed to load script:', err);
      }
    }

    loadScript();
  }, [videoId]);

  // When current visual changes, update search query and reset results
  useEffect(() => {
    if (currentVisual) {
      setSearchQuery(currentVisual.keywords);
      setSelectedImage(currentVisual.selectedUrl || null);
      setSearchResults([]);

      // Scroll to the active visual tag in the script
      setTimeout(() => {
        const activeTag = scriptContainerRef.current?.querySelector(
          `[data-visual-number="${currentVisual.number}"]`
        );
        if (activeTag) {
          activeTag.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [currentIndex, currentVisual]);

  // Parse visual tags from tagged script
  const parseVisualsFromScript = (text: string): VisualItem[] => {
    const items: VisualItem[] = [];
    const tagRegex = /\(VISUAL (\d+):([^|]+)\|([^)]+)\)/g;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      // Handle both KEYWORD: (singular) and KEYWORDS: (plural) formats
      const keywordPart = match[3].replace(/KEYWORDS?:/i, '').trim();
      items.push({
        id: `visual-${match[1]}`,
        number: parseInt(match[1]),
        description: match[2].trim(),
        keywords: keywordPart,
      });
    }

    return items;
  };

  // Handle auto-tagging
  const handleAutoTagScript = async () => {
    if (!script.trim()) {
      setError('No script available');
      return;
    }

    setIsGeneratingTags(true);
    setError(null);
    setVisuals([]);
    setCurrentIndex(0);

    try {
      const response = await fetch('/api/image/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          visualDuration,
          numVisuals: stats.numVisuals,
        }),
      });

      if (!response.ok) throw new Error('Failed to auto-tag script');

      const data = await response.json();
      setTaggedScript(data.taggedScript);

      const parsed = parseVisualsFromScript(data.taggedScript);
      setVisuals(parsed);

      if (parsed.length > 0) {
        setSearchQuery(parsed[0].keywords);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-tag');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Search Wikimedia
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/image/search-wikimedia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchQuery,
          limit: 20,
          mediaFilter: mediaType,
          qualityFilter,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.images || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Select an image
  const handleSelectImage = (url: string, thumb: string) => {
    setSelectedImage(url);
    // Update the visual with selected image
    setVisuals((prev) =>
      prev.map((v, idx) =>
        idx === currentIndex ? { ...v, selectedUrl: url, selectedThumb: thumb } : v
      )
    );
  };

  // Navigate to next visual
  const handleNext = () => {
    if (currentIndex < visuals.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSearchResults([]);
    }
  };

  // Navigate to previous visual
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSearchResults([]);
    }
  };

  // Skip current visual (no image selected)
  const handleSkip = () => {
    setVisuals((prev) =>
      prev.map((v, idx) =>
        idx === currentIndex ? { ...v, selectedUrl: undefined, selectedThumb: undefined } : v
      )
    );
    setSelectedImage(null);
    handleNext();
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!currentVisual || !videoId) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('videoId', videoId);
      formData.append('seriesId', seriesId);
      formData.append('visualNumber', currentVisual.number.toString());

      const response = await fetch('/api/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();

      // Set the uploaded image as selected
      setSelectedImage(data.imageUrl);
      setVisuals((prev) =>
        prev.map((v, idx) =>
          idx === currentIndex ? { ...v, selectedUrl: data.imageUrl, selectedThumb: data.imageUrl } : v
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Generate AI image
  const handleGenerateAI = async () => {
    if (!currentVisual || !videoId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          seriesId,
          visualNumber: currentVisual.number,
          description: currentVisual.description,
          style: '18th_century_painting',
          aspectRatio: aiAspectRatio,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();

      // Set the generated image as selected
      setSelectedImage(data.imageUrl);
      setVisuals((prev) =>
        prev.map((v, idx) =>
          idx === currentIndex ? { ...v, selectedUrl: data.imageUrl, selectedThumb: data.imageUrl } : v
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceedToVideo = () => {
    if (videoId) {
      router.push(`/series/${seriesId}/video?videoId=${videoId}`);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Render visual tags with colored highlighting
  const renderTaggedScript = (text: string) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const tagRegex = /\(VISUAL (\d+):([^|]+)\|([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = tagRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }

      const visualNum = parseInt(match[1]);
      const description = match[2].trim();
      const visual = visuals.find((v) => v.number === visualNum);
      const isActive = visual && visualNum === currentVisual?.number;
      const hasImage = visual?.selectedUrl;

      // Color: active = blue, has image = green, no image = grey
      let bgcolor = 'action.selected';
      let color = 'text.secondary';
      if (isActive) {
        bgcolor = 'primary.main';
        color = 'primary.contrastText';
      } else if (hasImage) {
        bgcolor = 'success.light';
        color = 'success.contrastText';
      }

      parts.push(
        <Box
          key={key++}
          component="span"
          data-visual-number={visualNum}
          sx={{
            display: 'inline',
            bgcolor,
            color,
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.8rem',
            mx: 0.5,
            cursor: 'pointer',
          }}
          onClick={() => {
            const idx = visuals.findIndex((v) => v.number === visualNum);
            if (idx >= 0) {
              setCurrentIndex(idx);
              setSearchResults([]);
            }
          }}
        >
          VISUAL {visualNum}{hasImage ? ' ✓' : ''}: {description.length > 25 ? description.slice(0, 25) + '...' : description}
        </Box>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  // Counts
  const selectedCount = visuals.filter((v) => v.selectedUrl).length;
  const totalCount = visuals.length;

  const promptPanel = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Script with Visual Tags
          </Typography>
          {script && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}
            >
              ~{formatDuration(stats.durationSeconds)} • {stats.numVisuals} visuals @ {visualDuration}s
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={visualDuration}
              onChange={(e) => setVisualDuration(e.target.value as number)}
              size="small"
              sx={{ height: 32 }}
            >
              {availableDurations.map((d: number) => (
                <MenuItem key={d} value={d}>
                  {d}s
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            startIcon={isGeneratingTags ? <CircularProgress size={14} /> : <AutoAwesome />}
            onClick={handleAutoTagScript}
            disabled={isGeneratingTags || !script.trim()}
          >
            Auto-tag
          </Button>
        </Box>
      </Box>
      <Box
        ref={scriptContainerRef}
        sx={{
          p: 1.5,
          minHeight: 200,
          maxHeight: 300,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        {taggedScript
          ? renderTaggedScript(taggedScript)
          : script || (
              <Typography color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                Script will be loaded from previous zone...
              </Typography>
            )}
      </Box>
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {visuals.length > 0 && currentVisual && (
        <>
          {/* Visual header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                Visual {currentVisual.number} of {totalCount}
              </Typography>
              <Chip
                size="small"
                label={`${selectedCount}/${totalCount} selected`}
                color={selectedCount === totalCount ? 'success' : 'default'}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                Prev
              </Button>
              <Button
                size="small"
                variant="outlined"
                endIcon={<SkipNext />}
                onClick={handleSkip}
                disabled={currentIndex === visuals.length - 1}
              >
                Skip
              </Button>
              <Button
                size="small"
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={handleNext}
                disabled={currentIndex === visuals.length - 1}
              >
                Next
              </Button>
            </Box>
          </Box>

          {/* Visual description */}
          <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {currentVisual.description}
            </Typography>
          </Box>

          {/* Search controls */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField
              label="Search Keywords"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={mediaType}
                label="Type"
                onChange={(e) => setMediaType(e.target.value as MediaType)}
              >
                {mediaTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Quality</InputLabel>
              <Select
                value={qualityFilter}
                label="Quality"
                onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
              >
                {qualityOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={isSearching ? <CircularProgress size={16} /> : <Search />}
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              Search
            </Button>
          </Box>

          {/* AI Generation controls */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Or generate with AI:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={aiAspectRatio}
                onChange={(e) => setAiAspectRatio(e.target.value as '16:9' | '9:16')}
                size="small"
              >
                <MenuItem value="16:9">Landscape</MenuItem>
                <MenuItem value="9:16">Portrait</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={isGenerating ? <CircularProgress size={16} /> : <Brush />}
              onClick={handleGenerateAI}
              disabled={isGenerating || isSearching}
            >
              Generate AI
            </Button>
          </Box>

          {/* Selected image indicator */}
          {selectedImage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Check color="success" />
              <Typography variant="body2" color="success.main">
                Image selected for this visual
              </Typography>
            </Box>
          )}
        </>
      )}

      {visuals.length === 0 && (
        <Typography color="text.secondary">
          Click Auto-tag to generate visual markers, then search for images one by one.
        </Typography>
      )}

      {/* Proceed button */}
      {selectedCount === totalCount && totalCount > 0 && (
        <Button
          variant="contained"
          color="success"
          endIcon={<ArrowForward />}
          onClick={handleProceedToVideo}
          sx={{ alignSelf: 'flex-start' }}
        >
          Proceed to Video ({selectedCount} images)
        </Button>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const outputPanel = (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        minHeight: 200,
        position: 'relative',
        border: isDragging ? 2 : 0,
        borderColor: 'primary.main',
        borderStyle: 'dashed',
        borderRadius: 1,
        bgcolor: isDragging ? 'action.hover' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      {/* Drop overlay */}
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            zIndex: 10,
          }}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography color="primary">Drop image here</Typography>
        </Box>
      )}

      {/* Uploading/Generating state */}
      {(isUploading || isGenerating) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
          }}
        >
          <CircularProgress sx={{ mb: 1 }} />
          <Typography color="text.secondary">
            {isGenerating ? 'Generating AI image...' : 'Uploading image...'}
          </Typography>
        </Box>
      )}

      {/* Show selected image for current visual */}
      {!isUploading && !isGenerating && !isSearching && selectedImage && searchResults.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Box
            onClick={() => setPreviewOpen(true)}
            sx={{
              position: 'relative',
              maxWidth: 400,
              maxHeight: 300,
              border: 3,
              borderColor: 'success.main',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'zoom-in',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            <img
              src={selectedImage}
              alt={currentVisual?.description || 'Selected image'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'success.main',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check sx={{ fontSize: 18, color: 'white' }} />
            </Box>
          </Box>
          <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
            Image selected for Visual {currentVisual?.number}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Click to enlarge • Search again to change
          </Typography>
        </Box>
      )}

      {/* Image preview modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{
              position: 'absolute',
              top: -40,
              right: 0,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <Close />
          </IconButton>
          <img
            src={selectedImage || ''}
            alt={currentVisual?.description || 'Selected image'}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </Box>
      </Dialog>

      {/* Empty state with drag hint */}
      {!isUploading && !isGenerating && searchResults.length === 0 && !isSearching && visuals.length > 0 && !selectedImage && (
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
          <Typography>Enter keywords and click Search to find images</Typography>
          <Typography variant="caption" sx={{ mt: 1 }}>
            or drag & drop an image file here
          </Typography>
        </Box>
      )}

      {!isUploading && !isGenerating && isSearching && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {!isUploading && !isGenerating && searchResults.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 1,
          }}
        >
          {searchResults.map((option, idx) => (
            <Tooltip
              key={idx}
              arrow
              placement="top"
              slotProps={{
                tooltip: {
                  sx: { maxWidth: 320, p: 0, bgcolor: 'background.paper', border: 1, borderColor: 'divider' },
                },
              }}
              title={
                <Box>
                  <img
                    src={option.thumb || option.url}
                    alt={option.title}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
                  />
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'text.primary' }}>
                      {option.title}
                    </Typography>
                    {option.description && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                        {option.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 0.5 }}>
                      {option.artist && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          By: {option.artist}
                        </Typography>
                      )}
                      {option.width && option.height && (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {option.width}×{option.height} • {option.license || 'Unknown'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              }
            >
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  cursor: 'pointer',
                  border: 3,
                  borderColor: selectedImage === option.url ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                  overflow: 'hidden',
                  '&:hover': {
                    borderColor: selectedImage === option.url ? 'primary.main' : 'action.hover',
                  },
                }}
                onClick={() => handleSelectImage(option.url, option.thumb)}
              >
                <img
                  src={option.thumb || option.url}
                  alt={option.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {selectedImage === option.url && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check sx={{ fontSize: 16, color: 'white' }} />
                  </Box>
                )}
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}

      {visuals.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'text.secondary',
          }}
        >
          <Typography>Auto-tag your script first to begin selecting images</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Script (read-only view)"
      configTitle="Image Selection"
      outputTitle={currentVisual ? `Search Results for Visual ${currentVisual.number}` : 'Search Results'}
    />
  );
}
