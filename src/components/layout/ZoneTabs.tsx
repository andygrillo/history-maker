'use client';

import { Tabs, Tab, Box } from '@mui/material';
import {
  CalendarMonth,
  Description,
  Mic,
  Image,
  Videocam,
  MusicNote,
  FileDownload,
} from '@mui/icons-material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ZoneType } from '@/types';

interface ZoneTabsProps {
  seriesId: string;
}

const zones: { id: ZoneType; label: string; icon: React.ReactElement }[] = [
  { id: 'planner', label: 'Planner', icon: <CalendarMonth /> },
  { id: 'script', label: 'Script', icon: <Description /> },
  { id: 'audio', label: 'Audio', icon: <Mic /> },
  { id: 'image', label: 'Image', icon: <Image /> },
  { id: 'video', label: 'Video', icon: <Videocam /> },
  { id: 'music', label: 'Music', icon: <MusicNote /> },
  { id: 'export', label: 'Export', icon: <FileDownload /> },
];

export function ZoneTabs({ seriesId }: ZoneTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');

  const currentZone = zones.find((zone) => pathname.includes(`/${zone.id}`))?.id || 'planner';

  const handleChange = (_: React.SyntheticEvent, newValue: ZoneType) => {
    // Preserve videoId when switching tabs (except for planner which shows all videos)
    const url = newValue === 'planner' || !videoId
      ? `/series/${seriesId}/${newValue}`
      : `/series/${seriesId}/${newValue}?videoId=${videoId}`;
    router.push(url);
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Tabs
        value={currentZone}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 56,
          '& .MuiTab-root': {
            minHeight: 56,
            px: 3,
          },
        }}
      >
        {zones.map((zone) => (
          <Tab
            key={zone.id}
            value={zone.id}
            label={zone.label}
            icon={zone.icon}
            iconPosition="start"
            sx={{
              '& .MuiSvgIcon-root': {
                mr: 1,
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
