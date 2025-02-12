'use client';

import { ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

export type BackgroundType = 'transparent' | 'light' | 'dark';

interface BackgroundToggleProps {
  className?: string;
  children: ReactNode;
  background: BackgroundType;
}

export function BackgroundToggle({ className = '', children, background }: BackgroundToggleProps) {
  return (
    <div className={className} style={{ lineHeight: 0 }}>
      <div className={`${background === 'transparent' ? 'transparent-bg' : background === 'light' ? 'light-bg' : 'dark-bg'} rounded-lg overflow-hidden`}>
        {children}
      </div>
    </div>
  );
}

// Export the toggle button separately for flexible positioning
export function BackgroundToggleButton({ onClick, background }: { onClick: () => void, background: BackgroundType }) {
  const getIcon = () => {
    switch (background) {
      case 'transparent':
        return <GridOnIcon />;
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
    }
  };

  const getTooltipText = () => {
    switch (background) {
      case 'transparent':
        return 'Checkered background';
      case 'light':
        return 'Light background';
      case 'dark':
        return 'Dark background';
    }
  };

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton 
        onClick={onClick}
        size="small"
        sx={{
          bgcolor: 'background.paper',
          padding: '4px',
          '&:hover': {
            bgcolor: 'background.paper',
            opacity: 0.8
          }
        }}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
} 