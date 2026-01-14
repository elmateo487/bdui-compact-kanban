import { stat } from 'fs';
import type { BeadsData } from '../types';
import { loadBeads } from './parser';

export type UpdateCallback = (data: BeadsData) => void;

/**
 * Watch beads.db for changes and trigger callbacks
 * Uses polling on WAL file size - most reliable approach for SQLite databases
 *
 * Why polling instead of fs.watch:
 * - macOS FSEvents is unreliable for SQLite WAL mode databases
 * - mtime has 1-second resolution, misses rapid changes
 * - WAL file SIZE changes with every write, even within same second
 * - 500ms polling is low CPU and provides good responsiveness for a TUI
 */
export class BeadsWatcher {
  private pollInterval: Timer | null = null;
  private callbacks: Set<UpdateCallback> = new Set();
  private beadsPath: string;
  private debounceTimeout: Timer | null = null;
  private lastWalSize: number = 0;
  private lastDbMtime: number = 0;

  constructor(beadsPath: string) {
    this.beadsPath = beadsPath;
  }

  /**
   * Start watching for beads changes
   * Polls WAL file size every 500ms
   */
  start() {
    if (this.pollInterval) return;

    // Initialize baseline
    this.updateBaseline();

    // Poll every 500ms - reliable and low CPU
    this.pollInterval = setInterval(() => {
      this.checkForChanges();
    }, 500);
  }

  /**
   * Check if database has changed by comparing WAL size and DB mtime
   */
  private checkForChanges() {
    const walPath = `${this.beadsPath}/beads.db-wal`;
    const dbPath = `${this.beadsPath}/beads.db`;

    // Check WAL file size (changes with every write)
    stat(walPath, (walErr, walStats) => {
      const walSize = walErr ? 0 : walStats.size;

      // Also check main DB mtime (changes on checkpoint)
      stat(dbPath, (dbErr, dbStats) => {
        const dbMtime = dbErr ? 0 : dbStats.mtimeMs;

        // Trigger if WAL size changed OR main DB was checkpointed
        if (walSize !== this.lastWalSize || dbMtime > this.lastDbMtime) {
          this.lastWalSize = walSize;
          this.lastDbMtime = dbMtime;
          this.handleChange();
        }
      });
    });
  }

  /**
   * Update baseline values
   */
  private updateBaseline() {
    const walPath = `${this.beadsPath}/beads.db-wal`;
    const dbPath = `${this.beadsPath}/beads.db`;

    stat(walPath, (err, stats) => {
      if (!err) this.lastWalSize = stats.size;
    });

    stat(dbPath, (err, stats) => {
      if (!err) this.lastDbMtime = stats.mtimeMs;
    });
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

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

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleChange() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      const data = await loadBeads(this.beadsPath);
      this.notifySubscribers(data);
    }, 50); // Short debounce since we're already polling at 500ms
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
    this.updateBaseline();
    const data = await loadBeads(this.beadsPath);
    this.notifySubscribers(data);
  }
}
