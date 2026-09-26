/* =========================================================
   AI Hub — shared logic
   Loaded before the page-specific JS (chat.js / dashboard.js)
   on every page. The <head> of each page already sets
   data-theme before paint (see the inline script there) —
   this file just wires up whichever .theme-toggle buttons
   exist on the page (a page may have more than one, e.g. the
   dashboard sidebar and the Settings view).
   ========================================================= */

const THEME_KEY = 'aihub_theme';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  renderThemeToggleLabels();
}

function themeToggleLabel() {
  const isDark = currentTheme() === 'dark';
  return isDark
    ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 9.3A6 6 0 016.7 2 6 6 0 1014 9.3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg> Dark mode'
    : '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.4" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> Light mode';
}

function renderThemeToggleLabels() {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.innerHTML = themeToggleLabel();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderThemeToggleLabels();
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
});