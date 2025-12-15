'use client';

import { useEffect } from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function initializeProject() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user already has a project
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      let projectId: string;

      if (existingProjects && existingProjects.length > 0) {
        // Use existing project
        projectId = existingProjects[0].id;
      } else {
        // Create new project for user (one project per user)
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({ user_id: user.id, topic: 'My Videos' })
          .select('id')
          .single();

        if (error || !newProject) {
          console.error('Failed to create project:', error);
          return;
        }
        projectId = newProject.id;
      }

      // Redirect to planner zone
      router.replace(`/project/${projectId}/planner`);
    }

    initializeProject();
  }, [supabase, router]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">
          Loading your workspace...
        </Typography>
      </Container>
    </Box>
  );
}
