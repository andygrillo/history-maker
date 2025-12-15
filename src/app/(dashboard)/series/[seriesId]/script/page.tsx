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
} from '@mui/material';
import {
  AutoAwesome,
  Description,
  Upload,
  Language,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
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

const tones: { value: NarrativeTone; label: string; description: string }[] = [
  {
    value: 'mike_duncan',
    label: 'Mike Duncan',
    description: 'Conversational, builds tension, rhetorical questions',
  },
  {
    value: 'mark_felton',
    label: 'Mark Felton',
    description: 'Direct, fact-dense, military precision',
  },
];

type InputMode = 'write' | 'wikipedia';

export default function ScriptPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  const [video, setVideo] = useState<Video | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('wikipedia');
  const [sourceText, setSourceText] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [duration, setDuration] = useState<ScriptDuration>('5min');
  const [tone, setTone] = useState<NarrativeTone>('mike_duncan');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Auto-populate wiki search with video title
        setWikiSearch(data.title || '');
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
      // Step 1: Generate keywords using Haiku
      setSearchStatus('Generating search keywords...');
      const keywordsResponse = await fetch('/api/wikipedia/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: wikiSearch }),
      });

      if (!keywordsResponse.ok) throw new Error('Failed to generate keywords');

      const { keywords } = await keywordsResponse.json();

      // Step 2: Search Wikipedia with each keyword and combine results
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
      setInputMode('write');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceedToAudio = () => {
    if (generatedScript && videoId) {
      router.push(`/series/${seriesId}/audio?videoId=${videoId}`);
    }
  };

  const promptPanel = (
    <Box>
      {video && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {video.title}
          </Typography>
          {video.description && (
            <Typography variant="body2" color="text.secondary">
              {video.description}
            </Typography>
          )}
        </Box>
      )}

      <Tabs
        value={inputMode}
        onChange={(_, v) => setInputMode(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="wikipedia" label="Wikipedia" icon={<Language />} iconPosition="start" />
        <Tab value="write" label="Write" icon={<Description />} iconPosition="start" />
      </Tabs>

      {inputMode === 'write' && (
        <Box>
          <TextField
            fullWidth
            multiline
            rows={8}
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

      {inputMode === 'wikipedia' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Video title for Wikipedia search"
              value={wikiSearch}
              onChange={(e) => setWikiSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWikipediaSearch()}
              disabled={searchingWiki}
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
            <List dense>
              {wikiResults.map((article) => (
                <ListItem key={article.pageid} disablePadding>
                  <ListItemButton onClick={() => handleSelectWikiArticle(article)}>
                    <ListItemText
                      primary={article.title}
                      secondary={article.extract?.slice(0, 150) + '...'}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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

        <FormControl size="small" sx={{ minWidth: 160 }}>
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

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesome />}
          onClick={handleGenerateScript}
          disabled={isGenerating || !sourceText.trim()}
        >
          Generate Script
        </Button>
        {generatedScript && (
          <>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleGenerateScript}
              disabled={isGenerating}
            >
              Regenerate
            </Button>
            <Button
              variant="contained"
              color="secondary"
              endIcon={<ArrowForward />}
              onClick={handleProceedToAudio}
            >
              Proceed to Audio
            </Button>
          </>
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
      {!generatedScript ? (
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
            Generated script will appear here. Add source material and click Generate.
          </Typography>
        </Box>
      ) : (
        <TextField
          fullWidth
          multiline
          value={generatedScript}
          onChange={(e) => setGeneratedScript(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.8,
            },
          }}
          minRows={15}
        />
      )}
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Source Material"
      configTitle="Script Options"
      outputTitle="Generated Script"
    />
  );
}
