import { watch, watchFile, unwatchFile, type FSWatcher } from 'fs';
import { join } from 'path';
import type { BeadsData } from '../types';
import { loadBeads } from './parser';

export type UpdateCallback = (data: BeadsData) => void;

/**
 * Watch beads.db for changes and trigger callbacks
 */
export class BeadsWatcher {
  private watcher: FSWatcher | null = null;
  private callbacks: Set<UpdateCallback> = new Set();
  private beadsPath: string;
  private debounceTimeout: Timer | null = null;
  private lastTouchedPath: string;

  constructor(beadsPath: string) {
    this.beadsPath = beadsPath;
    this.lastTouchedPath = join(beadsPath, 'last-touched');
  }

  /**
   * Start watching for beads changes using polling on last-touched file
   */
  start() {
    if (this.watcher) return;

    // Use watchFile (polling) on the last-touched file - more reliable on macOS
    // Beads updates this file on every database change
    watchFile(
      this.lastTouchedPath,
      { interval: 500 }, // Poll every 500ms
      (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.handleChange();
        }
      }
    );
  }

  /**
   * Stop watching
   */
  stop() {
    unwatchFile(this.lastTouchedPath);

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Subscribe to bead updates
   */
  subscribe(callback: UpdateCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleChange() {
    // Debounce rapid file changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      const data = await loadBeads(this.beadsPath);
      this.notifySubscribers(data);
    }, 100);
  }

  /**
   * Notify all subscribers of updates
   */
  private notifySubscribers(data: BeadsData) {
    for (const callback of this.callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in watcher callback:', error);
      }
    }
  }

  /**
   * Manually trigger a reload
   */
  async reload() {
    const data = await loadBeads(this.beadsPath);
    this.notifySubscribers(data);
  }
}
