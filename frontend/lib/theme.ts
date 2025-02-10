import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Tailwind blue-600
    },
    secondary: {
      main: '#4f46e5', // Tailwind indigo-600
    },
    error: {
      main: '#dc2626', // Tailwind red-600
    },
    background: {
      default: '#f3f4f6', // Tailwind gray-100
      paper: '#ffffff',
    },
    text: {
      primary: '#111827', // Tailwind gray-900
      secondary: '#374151', // Tailwind gray-700
    }
  },
  typography: {
    fontFamily: 'inherit',
    body1: {
      color: '#111827', // Tailwind gray-900
    },
    body2: {
      color: '#111827', // Tailwind gray-900
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#374151', // Tailwind gray-700
          '&.Mui-focused': {
            color: '#2563eb', // Tailwind blue-600
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          color: '#111827', // Tailwind gray-900
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        valueLabel: {
          color: '#ffffff',
          backgroundColor: '#2563eb', // Tailwind blue-600
        },
      },
    },
  },
});

export default theme; 