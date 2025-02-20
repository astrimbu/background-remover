'use client';

import { ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

type BackgroundType = 'transparent' | 'light' | 'dark';

interface BackgroundToggleProps {
  background: BackgroundType;
  children: React.ReactNode;
  className?: string;
}

interface BackgroundToggleButtonProps {
  background: BackgroundType;
  onClick: () => void;
}

export function BackgroundToggle({ background, children, className = '' }: BackgroundToggleProps) {
  const getBgClass = () => {
    switch (background) {
      case 'light':
        return 'bg-white';
      case 'dark':
        return 'bg-gray-800';
      case 'transparent':
      default:
        return 'bg-transparent transparent-bg';
    }
  };

  return (
    <div className={`relative ${getBgClass()} ${className}`}>
      {children}
      <style jsx global>{`
        .transparent-bg {
          background-color: white;
          background-image: linear-gradient(45deg, #f5f5f5 25%, transparent 25%),
                          linear-gradient(-45deg, #f5f5f5 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, #f5f5f5 75%),
                          linear-gradient(-45deg, transparent 75%, #f5f5f5 75%);
          background-size: 64px 64px;
          background-position: 0 0, 0 32px, 32px -32px, -32px 0px;
        }
      `}</style>
    </div>
  );
}

export function BackgroundToggleButton({ background, onClick }: BackgroundToggleButtonProps) {
  const getIcon = () => {
    switch (background) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'transparent':
      default:
        return <GridOnIcon />;
    }
  };

  const getTooltipText = () => {
    switch (background) {
      case 'light':
        return 'Light background';
      case 'dark':
        return 'Dark background';
      case 'transparent':
      default:
        return 'Transparent background';
    }
  };

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton onClick={onClick} size="small">
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
} 