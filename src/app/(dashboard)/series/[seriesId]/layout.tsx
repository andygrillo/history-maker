'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ZoneTabs } from '@/components/layout/ZoneTabs';
import { createClient } from '@/lib/supabase/client';

interface SeriesLayoutProps {
  children: React.ReactNode;
}

export default function SeriesLayout({ children }: SeriesLayoutProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.seriesId as string;
  const videoId = searchParams.get('videoId');
  const supabase = createClient();

  const [seriesTopic, setSeriesTopic] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');

  useEffect(() => {
    async function loadSeries() {
      const { data: series } = await supabase
        .from('series')
        .select('topic')
        .eq('id', seriesId)
        .single();

      if (series) {
        setSeriesTopic(series.topic);
      }
    }
    loadSeries();
  }, [seriesId, supabase]);

  useEffect(() => {
    async function loadVideo() {
      if (!videoId) {
        setVideoTitle('');
        return;
      }

      const { data: video } = await supabase
        .from('videos')
        .select('title')
        .eq('id', videoId)
        .single();

      if (video) {
        setVideoTitle(video.title);
      }
    }
    loadVideo();
  }, [videoId, supabase]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header seriesTitle={seriesTopic} videoTitle={videoTitle} />
      <ZoneTabs seriesId={seriesId} />
      <Box component="main">
        {children}
      </Box>
    </Box>
  );
}
