import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_FILE = 'ui-settings.json';

export interface UISettings {
  showBlockedColumn: boolean;
  showRecentColumn: boolean;
  showDetails: boolean;
  currentTheme: string;
}

const DEFAULT_SETTINGS: UISettings = {
  showBlockedColumn: true,  // Default to visible
  showRecentColumn: true,   // Default to visible
  showDetails: false,
  currentTheme: 'dark',
};

let beadsDir: string | null = null;

export function setBeadsDir(path: string) {
  beadsDir = path;
}

function getSettingsPath(): string | null {
  if (!beadsDir) return null;
  return join(beadsDir, SETTINGS_FILE);
}

export function loadSettings(): UISettings {
  const path = getSettingsPath();
  if (!path || !existsSync(path)) {
    return DEFAULT_SETTINGS;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const saved = JSON.parse(content);
    // Merge with defaults to handle new settings
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<UISettings>) {
  const path = getSettingsPath();
  if (!path) return;

  try {
    // Load existing, merge, and save
    const current = loadSettings();
    const updated = { ...current, ...settings };
    writeFileSync(path, JSON.stringify(updated, null, 2));
  } catch {
    // Silently fail - settings are not critical
  }
}
