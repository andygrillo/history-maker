'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ZoneTabs } from '@/components/layout/ZoneTabs';
import { createClient } from '@/lib/supabase/client';

interface SeriesLayoutProps {
  children: React.ReactNode;
}

export default function SeriesLayout({ children }: SeriesLayoutProps) {
  const params = useParams();
  const seriesId = params.seriesId as string;
  const supabase = createClient();

  const [seriesTopic, setSeriesTopic] = useState<string>('');

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container sx={{ pt: 2, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {seriesTopic || 'Loading...'}
        </Typography>
      </Container>
      <ZoneTabs seriesId={seriesId} />
      <Box component="main">
        {children}
      </Box>
    </Box>
  );
}
