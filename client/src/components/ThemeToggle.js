import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '', size = 'default', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  };
  
  const iconSizes = {
    small: 16,
    default: 20,
    large: 24
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          relative flex items-center justify-center
          rounded-full transition-all duration-300 ease-in-out
          bg-twitter-light-200 dark:bg-twitter-dark-700
          hover:bg-twitter-light-300 dark:hover:bg-twitter-dark-600
          focus:outline-none focus:ring-2 focus:ring-twitter-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-twitter-dark-800
          transform hover:scale-110 active:scale-95
          ${className}
        `}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {/* Sun Icon */}
        <Sun
          size={iconSizes[size]}
          className={`
            absolute transition-all duration-300 ease-in-out
            text-twitter-orange-500
            ${isDark 
              ? 'opacity-0 rotate-90 scale-0' 
              : 'opacity-100 rotate-0 scale-100'
            }
          `}
        />
        
        {/* Moon Icon */}
        <Moon
          size={iconSizes[size]}
          className={`
            absolute transition-all duration-300 ease-in-out
            text-twitter-blue-400
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
            }
          `}
        />
      </button>
      
      {showLabel && (
        <span className="text-sm font-medium text-twitter-dark-600 dark:text-twitter-dark-300 transition-colors duration-200">
          {isDark ? 'Dark' : 'Light'} Mode
        </span>
      )}
    </div>
  );
};

// Alternative compact toggle switch style
export const ThemeSwitch = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-twitter-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-twitter-dark-800
        ${isDark 
          ? 'bg-twitter-blue-600' 
          : 'bg-twitter-light-300'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full
          bg-white shadow-lg transition-transform duration-300 ease-in-out
          flex items-center justify-center
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
        `}
      >
        {isDark ? (
          <Moon size={10} className="text-twitter-blue-600" />
        ) : (
          <Sun size={10} className="text-twitter-orange-500" />
        )}
      </span>
    </button>
  );
};

// Floating theme toggle for global access
export const FloatingThemeToggle = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <ThemeToggle 
        size="large" 
        className="shadow-lg shadow-twitter-dark-200/50 dark:shadow-black/50 hover:shadow-xl hover:shadow-twitter-blue-200/50 dark:hover:shadow-twitter-blue-500/25"
      />
    </div>
  );
};

export default ThemeToggle;