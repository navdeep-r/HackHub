import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Twitter-inspired color palette
export const TWITTER_COLORS = {
  // Twitter Blue - Primary brand color
  blue: {
    50: '#e1f5fe',
    100: '#b3e5fc',
    200: '#81d4fa',
    300: '#4fc3f7',
    400: '#29b6f6',
    500: '#1da1f2', // Twitter Blue
    600: '#1976d2',
    700: '#1565c0',
    800: '#0d47a1',
    900: '#01579b',
  },
  
  // Dark theme colors (Twitter's night mode)
  dark: {
    50: '#f7f9fa',
    100: '#e1e8ed',
    200: '#aab8c2',
    300: '#657786',
    400: '#536471',
    500: '#3d4852',
    600: '#253341',
    700: '#192734',
    800: '#15202b', // Twitter dark background
    900: '#0f1419', // Twitter darker background
  },
  
  // Light theme colors
  light: {
    50: '#ffffff',
    100: '#f7f9fa',
    200: '#e1e8ed',
    300: '#aab8c2',
    400: '#657786',
    500: '#536471',
    600: '#3d4852',
    700: '#253341',
    800: '#192734',
    900: '#0f1419',
  },
  
  // Accent colors
  green: {
    50: '#e8f5e8',
    100: '#c3e6c3',
    200: '#9dd99d',
    300: '#77cc77',
    400: '#5cb85c',
    500: '#00ba7c', // Twitter green
    600: '#00a85a',
    700: '#008f4f',
    800: '#007743',
    900: '#005f37',
  },
  
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#f91880', // Twitter pink/red
    600: '#e11d48',
    700: '#be185d',
    800: '#9f1239',
    900: '#881337',
  },
  
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#ff6600', // Twitter orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  
  yellow: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#ffad1f', // Twitter yellow
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#794bc4', // Twitter purple
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  }
};

export const ThemeProvider = ({ children }) => {
  // Check for saved theme preference or default to 'light'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Update document class and localStorage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        theme === 'dark' ? TWITTER_COLORS.dark[900] : TWITTER_COLORS.light[50]
      );
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const saved = localStorage.getItem('theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

  // Dynamic color getters based on current theme
  const colors = {
    // Background colors
    bg: {
      primary: isDark ? TWITTER_COLORS.dark[900] : TWITTER_COLORS.light[50],
      secondary: isDark ? TWITTER_COLORS.dark[800] : TWITTER_COLORS.light[100],
      tertiary: isDark ? TWITTER_COLORS.dark[700] : TWITTER_COLORS.light[200],
      overlay: isDark ? 'rgba(21, 32, 43, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      card: isDark ? TWITTER_COLORS.dark[800] : TWITTER_COLORS.light[50],
      hover: isDark ? TWITTER_COLORS.dark[700] : TWITTER_COLORS.light[100],
    },
    
    // Text colors
    text: {
      primary: isDark ? TWITTER_COLORS.light[50] : TWITTER_COLORS.dark[900],
      secondary: isDark ? TWITTER_COLORS.dark[200] : TWITTER_COLORS.dark[600],
      tertiary: isDark ? TWITTER_COLORS.dark[300] : TWITTER_COLORS.dark[500],
      muted: isDark ? TWITTER_COLORS.dark[400] : TWITTER_COLORS.dark[400],
      inverse: isDark ? TWITTER_COLORS.dark[900] : TWITTER_COLORS.light[50],
    },
    
    // Border colors
    border: {
      light: isDark ? TWITTER_COLORS.dark[700] : TWITTER_COLORS.light[300],
      medium: isDark ? TWITTER_COLORS.dark[600] : TWITTER_COLORS.light[400],
      strong: isDark ? TWITTER_COLORS.dark[500] : TWITTER_COLORS.dark[500],
    },
    
    // Brand colors (always consistent)
    brand: {
      primary: TWITTER_COLORS.blue[500],
      secondary: TWITTER_COLORS.blue[600],
      success: TWITTER_COLORS.green[500],
      warning: TWITTER_COLORS.orange[500],
      error: TWITTER_COLORS.red[500],
      info: TWITTER_COLORS.blue[400],
    },
    
    // State colors with theme awareness
    state: {
      success: {
        bg: isDark ? TWITTER_COLORS.green[900] : TWITTER_COLORS.green[50],
        text: isDark ? TWITTER_COLORS.green[300] : TWITTER_COLORS.green[700],
        border: isDark ? TWITTER_COLORS.green[700] : TWITTER_COLORS.green[300],
      },
      warning: {
        bg: isDark ? TWITTER_COLORS.orange[900] : TWITTER_COLORS.orange[50],
        text: isDark ? TWITTER_COLORS.orange[300] : TWITTER_COLORS.orange[700],
        border: isDark ? TWITTER_COLORS.orange[700] : TWITTER_COLORS.orange[300],
      },
      error: {
        bg: isDark ? TWITTER_COLORS.red[900] : TWITTER_COLORS.red[50],
        text: isDark ? TWITTER_COLORS.red[300] : TWITTER_COLORS.red[700],
        border: isDark ? TWITTER_COLORS.red[700] : TWITTER_COLORS.red[300],
      },
      info: {
        bg: isDark ? TWITTER_COLORS.blue[900] : TWITTER_COLORS.blue[50],
        text: isDark ? TWITTER_COLORS.blue[300] : TWITTER_COLORS.blue[700],
        border: isDark ? TWITTER_COLORS.blue[700] : TWITTER_COLORS.blue[300],
      },
    }
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    colors,
    TWITTER_COLORS,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};