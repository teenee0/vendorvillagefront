import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Переключить на ${theme === 'dark' ? 'светлую' : 'темную'} тему`}
      title={`Переключить на ${theme === 'dark' ? 'светлую' : 'темную'} тему`}
    >
      {theme === 'dark' ? (
        <i className="fas fa-sun" />
      ) : (
        <i className="fas fa-moon" />
      )}
    </button>
  );
};

export default ThemeToggle;

