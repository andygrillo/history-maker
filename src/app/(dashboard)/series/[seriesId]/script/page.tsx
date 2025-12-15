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
  Slider,
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
import { ScriptDuration, NarrativeTone, WikipediaArticle } from '@/types';

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

type InputMode = 'write' | 'import' | 'wikipedia';

export default function ScriptPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');

  const [inputMode, setInputMode] = useState<InputMode>('write');
  const [sourceText, setSourceText] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [duration, setDuration] = useState<ScriptDuration>('5min');
  const [episodes, setEpisodes] = useState(1);
  const [tone, setTone] = useState<NarrativeTone>('mike_duncan');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wikipedia search state
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiResults, setWikiResults] = useState<WikipediaArticle[]>([]);
  const [searchingWiki, setSearchingWiki] = useState(false);

  const handleWikipediaSearch = async () => {
    if (!wikiSearch.trim()) return;

    setSearchingWiki(true);
    setError(null);

    try {
      const response = await fetch('/api/wikipedia/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: wikiSearch }),
      });

      if (!response.ok) throw new Error('Failed to search Wikipedia');

      const data = await response.json();
      setWikiResults(data.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search Wikipedia');
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
          episodes,
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
      <Tabs
        value={inputMode}
        onChange={(_, v) => setInputMode(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="write" label="Write" icon={<Description />} iconPosition="start" />
        <Tab value="import" label="Import" icon={<Upload />} iconPosition="start" />
        <Tab value="wikipedia" label="Wikipedia" icon={<Language />} iconPosition="start" />
      </Tabs>

      {inputMode === 'write' && (
        <TextField
          fullWidth
          multiline
          rows={8}
          placeholder="Paste or type your source material here..."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          variant="outlined"
        />
      )}

      {inputMode === 'import' && (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderStyle: 'dashed',
            cursor: 'pointer',
          }}
        >
          <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            Drag & drop a document or click to browse
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supports .txt, .md, .doc, .docx
          </Typography>
        </Paper>
      )}

      {inputMode === 'wikipedia' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search Wikipedia (e.g., 'Haitian Revolution')"
              value={wikiSearch}
              onChange={(e) => setWikiSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleWikipediaSearch()}
            />
            <Button
              variant="contained"
              onClick={handleWikipediaSearch}
              disabled={searchingWiki}
            >
              {searchingWiki ? <CircularProgress size={20} /> : 'Search'}
            </Button>
          </Box>

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
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

        <Box sx={{ width: 150 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Episodes: {episodes}
          </Typography>
          <Slider
            value={episodes}
            onChange={(_, v) => setEpisodes(v as number)}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
          />
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Narrative Tone</InputLabel>
          <Select
            value={tone}
            label="Narrative Tone"
            onChange={(e) => setTone(e.target.value as NarrativeTone)}
          >
            {tones.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                <Box>
                  <Typography>{t.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TextField
        fullWidth
        placeholder="Additional instructions (optional)..."
        value={additionalPrompt}
        onChange={(e) => setAdditionalPrompt(e.target.value)}
        size="small"
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
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
