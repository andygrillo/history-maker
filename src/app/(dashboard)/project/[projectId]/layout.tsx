'use client';

import { Box } from '@mui/material';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ZoneTabs } from '@/components/layout/ZoneTabs';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <ZoneTabs projectId={projectId} />
      <Box component="main">
        {children}
      </Box>
    </Box>
  );
}
