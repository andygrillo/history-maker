'use client';

import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem, Button } from '@mui/material';
import { Settings, AccountCircle, Dashboard } from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  seriesTitle?: string;
  videoTitle?: string;
}

export function Header({ seriesTitle, videoTitle }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    handleClose();
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            History Maker
          </Typography>
        </Link>

        <Button
          component={Link}
          href="/dashboard"
          startIcon={<Dashboard />}
          sx={{ ml: 2, color: 'text.secondary' }}
          size="small"
        >
          All Series
        </Button>

        {seriesTitle && (
          <>
            <Typography sx={{ mx: 1, color: 'text.disabled' }}>/</Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {seriesTitle}
            </Typography>
          </>
        )}

        {videoTitle && (
          <>
            <Typography sx={{ mx: 1, color: 'text.disabled' }}>/</Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                color: 'text.secondary',
                maxWidth: 250,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {videoTitle}
            </Typography>
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <IconButton
          component={Link}
          href="/settings"
          color="inherit"
          sx={{ mr: 1 }}
        >
          <Settings />
        </IconButton>

        <IconButton
          onClick={handleMenu}
          color="inherit"
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            <AccountCircle />
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
