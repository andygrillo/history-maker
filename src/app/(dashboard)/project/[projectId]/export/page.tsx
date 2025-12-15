'use client';

import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Download,
  CheckCircle,
  Schedule,
  Description,
  Mic,
  Image,
  Videocam,
  MusicNote,
  FolderZip,
  PlayArrow,
} from '@mui/icons-material';
import { useParams, useSearchParams } from 'next/navigation';
import { ZoneLayout } from '@/components/layout/ZoneLayout';
import { ExportAsset } from '@/types';

interface AssetInfo {
  type: string;
  icon: React.ReactNode;
  status: 'pending' | 'ready' | 'partial';
  count?: number;
  totalCount?: number;
  formats: string[];
  urls?: string[];
}

export default function ExportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const videoId = searchParams.get('videoId');

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState({
    totalDuration: 0,
    assetCount: 0,
    storageUsed: 0,
    estimatedCost: 0,
  });

  // Load all assets on mount
  useEffect(() => {
    async function loadAssets() {
      if (!videoId) return;

      try {
        const response = await fetch(`/api/export/assets?videoId=${videoId}`);
        if (response.ok) {
          const data = await response.json();
          setAssets([
            {
              type: 'Script',
              icon: <Description />,
              status: data.script ? 'ready' : 'pending',
              formats: ['.txt', '.md'],
              urls: data.script ? [data.script.url] : [],
            },
            {
              type: 'Audio',
              icon: <Mic />,
              status: data.audio?.length > 0 ? 'ready' : 'pending',
              count: data.audio?.length || 0,
              formats: ['.mp3', '.wav'],
              urls: data.audio?.map((a: { url: string }) => a.url) || [],
            },
            {
              type: 'Images',
              icon: <Image />,
              status: data.images?.ready === data.images?.total ? 'ready' : data.images?.ready > 0 ? 'partial' : 'pending',
              count: data.images?.ready || 0,
              totalCount: data.images?.total || 0,
              formats: ['.png', '.jpg', '.zip'],
              urls: data.images?.urls || [],
            },
            {
              type: 'Video Clips',
              icon: <Videocam />,
              status: data.videoClips?.ready === data.videoClips?.total ? 'ready' : data.videoClips?.ready > 0 ? 'partial' : 'pending',
              count: data.videoClips?.ready || 0,
              totalCount: data.videoClips?.total || 0,
              formats: ['.mp4', '.zip'],
              urls: data.videoClips?.urls || [],
            },
            {
              type: 'Music',
              icon: <MusicNote />,
              status: data.music?.length > 0 ? 'ready' : 'pending',
              count: data.music?.length || 0,
              formats: ['.mp3', '.wav'],
              urls: data.music?.map((m: { url: string }) => m.url) || [],
            },
          ]);

          setProjectStats({
            totalDuration: data.stats?.totalDuration || 0,
            assetCount: data.stats?.assetCount || 0,
            storageUsed: data.stats?.storageUsed || 0,
            estimatedCost: data.stats?.estimatedCost || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load assets:', err);
        setError('Failed to load assets');
      } finally {
        setIsLoading(false);
      }
    }

    loadAssets();
  }, [videoId]);

  const handleDownload = async (assetType: string, format: string) => {
    setIsDownloading(`${assetType}-${format}`);
    setError(null);

    try {
      const response = await fetch(`/api/export/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          assetType: assetType.toLowerCase().replace(' ', '_'),
          format,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate download');

      const data = await response.json();

      // Trigger browser download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading('all');
    setError(null);

    try {
      const response = await fetch(`/api/export/download-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) throw new Error('Failed to generate download');

      const data = await response.json();

      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle color="success" />;
      case 'partial':
        return <Schedule color="warning" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStatusLabel = (asset: AssetInfo) => {
    if (asset.status === 'ready') return 'Complete';
    if (asset.status === 'partial') {
      return `${asset.count}/${asset.totalCount} Ready`;
    }
    return 'Pending';
  };

  const readyAssets = assets.filter((a) => a.status !== 'pending').length;

  const promptPanel = (
    <Box>
      <Typography variant="h6" gutterBottom>
        Project Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">{projectStats.assetCount}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assets
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">
              {Math.floor(projectStats.totalDuration / 60)}:{String(projectStats.totalDuration % 60).padStart(2, '0')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Est. Duration
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">
              {(projectStats.storageUsed / 1024 / 1024).toFixed(1)} MB
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Storage Used
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">${projectStats.estimatedCost.toFixed(2)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Est. API Cost
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const configPanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={isDownloading === 'all' ? <CircularProgress size={20} /> : <FolderZip />}
          onClick={handleDownloadAll}
          disabled={isDownloading !== null || readyAssets === 0}
        >
          Download All Assets (.zip)
        </Button>

        <Typography variant="body2" color="text.secondary">
          {readyAssets} of {assets.length} asset types ready
        </Typography>
      </Box>

      <LinearProgress variant="determinate" value={(readyAssets / assets.length) * 100} />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const outputPanel = (
    <Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Formats</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.type}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {asset.icon}
                      <Typography>{asset.type}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(asset.status)}
                      <Typography variant="body2">{getStatusLabel(asset)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {asset.formats.map((format) => (
                        <Chip key={format} label={format} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {asset.urls && asset.urls.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (asset.urls?.[0]) {
                              window.open(asset.urls[0], '_blank');
                            }
                          }}
                        >
                          <PlayArrow />
                        </IconButton>
                      )}
                      {asset.formats.map((format) => (
                        <Button
                          key={format}
                          size="small"
                          variant="outlined"
                          startIcon={
                            isDownloading === `${asset.type}-${format}` ? (
                              <CircularProgress size={14} />
                            ) : (
                              <Download />
                            )
                          }
                          onClick={() => handleDownload(asset.type, format)}
                          disabled={asset.status === 'pending' || isDownloading !== null}
                        >
                          {format}
                        </Button>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Batch Downloads
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">Images Only</Typography>
              <Typography variant="body2" color="text.secondary">
                All visual assets as .zip
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={() => handleDownload('images', '.zip')}
                disabled={isDownloading !== null}
              >
                Download
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">Video Clips Only</Typography>
              <Typography variant="body2" color="text.secondary">
                All clips as .zip
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={() => handleDownload('video_clips', '.zip')}
                disabled={isDownloading !== null}
              >
                Download
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">Audio Bundle</Typography>
              <Typography variant="body2" color="text.secondary">
                Voiceover + music
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={() => handleDownload('audio_bundle', '.zip')}
                disabled={isDownloading !== null}
              >
                Download
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">Raw Assets</Typography>
              <Typography variant="body2" color="text.secondary">
                Everything unprocessed
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={() => handleDownload('raw', '.zip')}
                disabled={isDownloading !== null}
              >
                Download
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <ZoneLayout
      promptPanel={promptPanel}
      configPanel={configPanel}
      outputPanel={outputPanel}
      promptTitle="Project Overview"
      configTitle="Export Options"
      outputTitle="Assets & Downloads"
    />
  );
}
