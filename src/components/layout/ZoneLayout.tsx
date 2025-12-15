'use client';

import { Box, Paper, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface ZoneLayoutProps {
  promptPanel: ReactNode;
  configPanel: ReactNode;
  outputPanel: ReactNode;
  promptTitle?: string;
  configTitle?: string;
  outputTitle?: string;
}

export function ZoneLayout({
  promptPanel,
  configPanel,
  outputPanel,
  promptTitle = 'Input',
  configTitle = 'Configuration',
  outputTitle = 'Output',
}: ZoneLayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        minHeight: 'calc(100vh - 120px)',
        overflow: 'auto',
      }}
    >
      {/* Prompt / Input Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          flex: '0 0 auto',
          maxHeight: '35%',
          overflow: 'auto',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {promptTitle}
        </Typography>
        {promptPanel}
      </Paper>

      {/* Configuration Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          flex: '0 0 auto',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {configTitle}
        </Typography>
        {configPanel}
      </Paper>

      {/* Output / Preview Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, flex: '0 0 auto' }}>
          {outputTitle}
        </Typography>
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {outputPanel}
        </Box>
      </Paper>
    </Box>
  );
}
