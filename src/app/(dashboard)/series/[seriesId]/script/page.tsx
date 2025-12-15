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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Container,
  Snackbar,
} from '@mui/material';
import {
  AutoAwesome,
  Description,
  Upload,
  Language,
  Refresh,
  ArrowForward,
  Save,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ScriptDuration, NarrativeTone, WikipediaArticle, Video } from '@/types';
import { createClient } from '@/lib/supabase/client';

const durations: { value: ScriptDuration; label: string }[] = [
  { value: '30s', label: '30 seconds' },
  { value: '60s', label: '1 minute' },
  { value: '2min', label: '2 minutes' },
  { value: '5min', label: '5 minutes' },
  { value: '10min', label: '10 minutes' },
  { value: '15min', label: '15 minutes' },
  { value: '30min', label: '30 minutes' },
  { value: '60min', label: '60 minutes' },
];

const tones: { value: NarrativeTone; label: string }[] = [
  { value: 'mike_duncan', label: 'Mike Duncan' },
  { value: 'mark_felton', label: 'Mark Felton' },
];

type MainTab = 'source' | 'script';
type SourceMode = 'wikipedia' | 'write';

export default function ScriptPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('source');

  // Video state
  const [video, setVideo] = useState<Video | null>(null);

  // Source material state
  const [sourceMode, setSourceMode] = useState<SourceMode>('wikipedia');
  const [sourceText, setSourceText] = useState('');

  // Script generation state
  const [generatedScript, setGeneratedScript] = useState('');
  const [duration, setDuration] = useState<ScriptDuration>('5min');
  const [tone, setTone] = useState<NarrativeTone>('mike_duncan');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Wikipedia search state
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiResults, setWikiResults] = useState<WikipediaArticle[]>([]);
  const [searchingWiki, setSearchingWiki] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');

  // Fetch video data on mount
  useEffect(() => {
    async function loadVideo() {
      if (!videoId) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (data) {
        setVideo(data as Video);
        setWikiSearch(data.title || '');
        // Load existing script if available
        if (data.script) {
          setGeneratedScript(data.script);
        }
      }
    }
    loadVideo();
  }, [videoId]);

  const handleWikipediaSearch = async () => {
    if (!wikiSearch.trim()) return;

    setSearchingWiki(true);
    setError(null);
    setWikiResults([]);

    try {
      setSearchStatus('Generating search keywords...');
      const keywordsResponse = await fetch('/api/wikipedia/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: wikiSearch }),
      });

      if (!keywordsResponse.ok) throw new Error('Failed to generate keywords');
      const { keywords } = await keywordsResponse.json();

      setSearchStatus('Searching Wikipedia...');
      const allArticles: WikipediaArticle[] = [];
      const seenPageIds = new Set<number>();

      for (const keyword of keywords) {
        const response = await fetch('/api/wikipedia/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: keyword }),
        });

        if (response.ok) {
          const data = await response.json();
          for (const article of data.articles || []) {
            if (!seenPageIds.has(article.pageid)) {
              seenPageIds.add(article.pageid);
              allArticles.push(article);
            }
          }
        }
      }

      setWikiResults(allArticles);
      setSearchStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search Wikipedia');
      setSearchStatus('');
    } finally {
      setSearchingWiki(false);
    }
  };

  const handleSelectWikiArticle = async (article: WikipediaArticle) => {
    setSearchingWiki(true);
    try {
      const response = await fetch('/api/wikipedia/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageid: article.pageid }),
      });

      if (!response.ok) throw new Error('Failed to fetch article content');

      const data = await response.json();
      setSourceText(data.content);
      setSourceMode('write');
      setWikiResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch article');
    } finally {
      setSearchingWiki(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!sourceText.trim()) {
      setError('Please provide source text');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          sourceText,
          duration,
          tone,
          additionalPrompt,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate script');

      const data = await response.json();
      setGeneratedScript(data.script);
      // Auto-switch to Final Script tab
      setMainTab('script');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveScript = async () => {
    if (!videoId || !generatedScript) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('videos')
        .update({ script: generatedScript })
        .eq('id', videoId);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Script saved successfully' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save script');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedToAudio = () => {
    if (generatedScript && videoId) {
      router.push(`/series/${seriesId}/audio?videoId=${videoId}`);
    }
  };

  // Truncate text to approximately 2 lines (around 100 chars)
  const truncateToTwoLines = (text: string | undefined) => {
    if (!text) return '';
    const maxLength = 100;
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Video title header */}
      {video && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {video.title}
        </Typography>
      )}

      {/* Main tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            value="source"
            label="Source Material"
            icon={<Description />}
            iconPosition="start"
          />
          <Tab
            value="script"
            label="Final Script"
            icon={<EditIcon />}
            iconPosition="start"
            disabled={!generatedScript}
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Source Material Tab */}
          {mainTab === 'source' && (
            <Box>
              {/* Source mode tabs */}
              <Tabs
                value={sourceMode}
                onChange={(_, v) => setSourceMode(v)}
                sx={{ mb: 3 }}
              >
                <Tab value="wikipedia" label="Wikipedia" icon={<Language />} iconPosition="start" />
                <Tab value="write" label="Write / Import" icon={<Description />} iconPosition="start" />
              </Tabs>

              {/* Wikipedia search */}
              {sourceMode === 'wikipedia' && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      placeholder="Search Wikipedia..."
                      value={wikiSearch}
                      onChange={(e) => setWikiSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleWikipediaSearch()}
                      disabled={searchingWiki}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleWikipediaSearch}
                      disabled={searchingWiki || !wikiSearch.trim()}
                      sx={{ minWidth: 100 }}
                    >
                      {searchingWiki ? <CircularProgress size={20} /> : 'Search'}
                    </Button>
                  </Box>

                  {searchStatus && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {searchStatus}
                    </Typography>
                  )}

                  {wikiResults.length > 0 && (
                    <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                      {wikiResults.map((article) => (
                        <ListItem key={article.pageid} disablePadding>
                          <ListItemButton onClick={() => handleSelectWikiArticle(article)}>
                            <ListItemText
                              primary={article.title}
                              secondary={truncateToTwoLines(article.extract)}
                              slotProps={{
                                secondary: {
                                  sx: {
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  },
                                },
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Write/Import */}
              {sourceMode === 'write' && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    placeholder="Paste or type your source material here..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    variant="outlined"
                  />
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      component="label"
                      size="small"
                      startIcon={<Upload />}
                      sx={{ color: 'text.secondary' }}
                    >
                      Import file
                      <input
                        type="file"
                        hidden
                        accept=".txt,.md"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              setSourceText(text);
                            };
                            reader.readAsText(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {sourceText.trim() ? sourceText.trim().split(/\s+/).length.toLocaleString() : 0} words
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Generation options */}
              <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Script Options
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={duration}
                      label="Duration"
                      onChange={(e) => setDuration(e.target.value as ScriptDuration)}
                    >
                      {durations.map((d) => (
                        <MenuItem key={d.value} value={d.value}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Tone</InputLabel>
                    <Select
                      value={tone}
                      label="Tone"
                      onChange={(e) => setTone(e.target.value as NarrativeTone)}
                    >
                      {tones.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    placeholder="Additional instructions..."
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 150 }}
                  />
                </Box>

                <Button
                  variant="contained"
                  startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !sourceText.trim()}
                  fullWidth
                >
                  {isGenerating ? 'Generating Script...' : 'Generate Script'}
                </Button>
              </Paper>

              {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {/* Final Script Tab */}
          {mainTab === 'script' && (
            <Box>
              {/* Numbered script display */}
              <Paper
                variant="outlined"
                sx={{
                  maxHeight: '60vh',
                  overflow: 'auto',
                  bgcolor: 'background.default',
                }}
              >
                {generatedScript.split('\n').map((line, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 40,
                        px: 1,
                        py: 0.75,
                        bgcolor: 'action.selected',
                        color: 'text.secondary',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        textAlign: 'right',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        userSelect: 'none',
                      }}
                    >
                      {line.trim() ? index + 1 : ''}
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        px: 2,
                        py: 0.75,
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        minHeight: line.trim() ? 'auto' : '1.5em',
                      }}
                    >
                      {line || '\u00A0'}
                    </Box>
                  </Box>
                ))}
              </Paper>

              {/* Edit mode toggle */}
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  value={generatedScript}
                  onChange={(e) => setGeneratedScript(e.target.value)}
                  variant="outlined"
                  label="Edit Script"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                    },
                  }}
                  minRows={8}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => setMainTab('source')}
                  >
                    Edit Source
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={isGenerating ? <CircularProgress size={16} /> : <Refresh />}
                    onClick={handleGenerateScript}
                    disabled={isGenerating || !sourceText.trim()}
                  >
                    Regenerate
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                    onClick={handleSaveScript}
                    disabled={isSaving}
                  >
                    Save Script
                  </Button>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={handleProceedToAudio}
                  >
                    Proceed to Audio
                  </Button>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
