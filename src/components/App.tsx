import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { useBeadsStore } from '../state/store';
import { Board } from './Board';
import { FullDetailPanel } from './FullDetailPanel';
import { BeadsWatcher } from '../bd/watcher';
import { loadBeads, findBeadsDir } from '../bd/parser';
import { getTheme } from '../themes/themes';
import { copyToClipboard } from '../utils/export';
import { LAYOUT } from '../utils/constants';
import { naturalSortIds } from '../utils/sorting';

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const setData = useBeadsStore(state => state.setData);
  const setTerminalSize = useBeadsStore(state => state.setTerminalSize);
  const setReloadCallback = useBeadsStore(state => state.setReloadCallback);
  const initSettings = useBeadsStore(state => state.initSettings);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);
  const [beadsPath, setBeadsPath] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<BeadsWatcher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Update terminal dimensions
  useEffect(() => {
    if (stdout) {
      const updateSize = () => {
        setTerminalSize(stdout.columns, stdout.rows);
      };

      updateSize();

      // Listen for resize events
      stdout.on('resize', updateSize);

      return () => {
        stdout.off('resize', updateSize);
      };
    }
  }, [stdout, setTerminalSize]);

  // Find and load .beads/ directory on mount
  useEffect(() => {
    async function init() {
      try {
        const path = await findBeadsDir();

        if (!path) {
          setError('No .beads/ directory found in current or parent directories');
          setLoading(false);
          return;
        }

        setBeadsPath(path);

        // Load UI settings from .beads/ui-settings.json
        initSettings(path);

        // Load initial data
        const data = await loadBeads(path);
        setData(data);

        // Set up watcher
        const watcher = new BeadsWatcher(path);
        watcher.subscribe((data) => {
          setData(data);
        });
        watcher.start();
        setWatcher(watcher);

        // Set reload callback in store
        setReloadCallback(() => {
          watcher.reload();
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    init();

    // Cleanup
    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, []);

  // Keyboard navigation
  const moveUp = useBeadsStore(state => state.moveUp);
  const moveDown = useBeadsStore(state => state.moveDown);
  const moveLeft = useBeadsStore(state => state.moveLeft);
  const moveRight = useBeadsStore(state => state.moveRight);
  const jumpToFirst = useBeadsStore(state => state.jumpToFirst);
  const jumpToLast = useBeadsStore(state => state.jumpToLast);
  const toggleHelp = useBeadsStore(state => state.toggleHelp);
  const toggleDetails = useBeadsStore(state => state.toggleDetails);
  const toggleNotifications = useBeadsStore(state => state.toggleNotifications);
  const toggleSearch = useBeadsStore(state => state.toggleSearch);
  const toggleFilter = useBeadsStore(state => state.toggleFilter);
  const toggleJumpToPage = useBeadsStore(state => state.toggleJumpToPage);
  const navigateToCreateIssue = useBeadsStore(state => state.navigateToCreateIssue);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);
  const navigateToTotalList = useBeadsStore(state => state.navigateToTotalList);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const toggleBlockedColumn = useBeadsStore(state => state.toggleBlockedColumn);
  const toggleRecentColumn = useBeadsStore(state => state.toggleRecentColumn);
  const toggleParentsOnly = useBeadsStore(state => state.toggleParentsOnly);
  const toggleFullDetail = useBeadsStore(state => state.toggleFullDetail);
  const pushFullDetail = useBeadsStore(state => state.pushFullDetail);
  const popFullDetail = useBeadsStore(state => state.popFullDetail);
  const moveFullDetailUp = useBeadsStore(state => state.moveFullDetailUp);
  const moveFullDetailDown = useBeadsStore(state => state.moveFullDetailDown);
  const fullDetailStack = useBeadsStore(state => state.fullDetailStack);
  const fullDetailSelectedSubtask = useBeadsStore(state => state.fullDetailSelectedSubtask);
  const fullDetailSection = useBeadsStore(state => state.fullDetailSection);
  const fullDetailSectionIndex = useBeadsStore(state => state.fullDetailSectionIndex);
  const showFullDetail = useBeadsStore(state => state.showFullDetail);
  const showDetails = useBeadsStore(state => state.showDetails);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const data = useBeadsStore(state => state.data);
  const clearFilters = useBeadsStore(state => state.clearFilters);
  const viewMode = useBeadsStore(state => state.viewMode);
  const showSearch = useBeadsStore(state => state.showSearch);
  const showFilter = useBeadsStore(state => state.showFilter);
  const showExportDialog = useBeadsStore(state => state.showExportDialog);
  const showThemeSelector = useBeadsStore(state => state.showThemeSelector);
  const showJumpToPage = useBeadsStore(state => state.showJumpToPage);
  const showConfirmDialog = useBeadsStore(state => state.showConfirmDialog);
  const showToast = useBeadsStore(state => state.showToast);
  const undo = useBeadsStore(state => state.undo);
  const reloadCallback = useBeadsStore(state => state.reloadCallback);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);

  // Handle keyboard input
  useInput((input, key) => {
    const inFormView = viewMode === 'create-issue' || viewMode === 'edit-issue';

    // Don't handle input when confirm dialog is open
    if (showConfirmDialog) return;

    // Handle 'q' key - disabled in forms, quits directly otherwise
    if (input === 'q') {
      if (inFormView) {
        // 'q' does nothing in forms (allows typing 'q')
        return;
      }
      // Not in form view, quit directly
      exit();
    }

    // Help
    if (input === 'h' || input === '?') {
      toggleHelp();
      return;
    }

    // If in form view, allow ESC to return to previous view
    if (viewMode === 'create-issue' || viewMode === 'edit-issue') {
      if (key.escape) {
        returnToPreviousView();
      }
      // Let form components handle all other input
      return;
    }

    // Let total-list view handle its own input
    if (viewMode === 'total-list') {
      return;
    }

    // If modals are active, let those components handle input
    if (showSearch || showFilter || showExportDialog || showThemeSelector || showJumpToPage) {
      return;
    }

    // Full detail view mode - handle separately
    if (showFullDetail) {
      if (key.escape) {
        popFullDetail();
        return;
      }
      // Copy issue title and ID to clipboard
      if (input === 'i') {
        const currentId = fullDetailStack[fullDetailStack.length - 1];
        const currentIssue = data.byId.get(currentId);
        if (currentIssue) {
          const copyText = `${currentIssue.title} - ${currentIssue.id}`;
          copyToClipboard(copyText)
            .then(() => showToast(`Copied: ${currentIssue.id}`, 'success'))
            .catch((err) => showToast(`Copy failed: ${err.message}`, 'error'));
        }
        return;
      }
      if (key.return) {
        // Enter opens detail view for selected item in any section
        const currentId = fullDetailStack[fullDetailStack.length - 1];
        const currentIssue = data.byId.get(currentId);
        if (!currentIssue) return;

        let targetId: string | undefined;
        if (fullDetailSection === 'blockedBy' && currentIssue.blockedBy) {
          targetId = currentIssue.blockedBy[fullDetailSectionIndex];
        } else if (fullDetailSection === 'blocks' && currentIssue.blocks) {
          targetId = currentIssue.blocks[fullDetailSectionIndex];
        } else if (fullDetailSection === 'subtasks' && currentIssue.children) {
          // Use sorted children to match display order in FullDetailPanel
          const sortedChildren = [...currentIssue.children].sort(naturalSortIds);
          targetId = sortedChildren[fullDetailSectionIndex];
        }

        if (targetId) {
          pushFullDetail(targetId);
        }
        return;
      }
      if (key.upArrow) {
        moveFullDetailUp();
        return;
      }
      if (key.downArrow) {
        moveFullDetailDown();
        return;
      }
      // Tab cycles through available sections (visual order: blockedBy -> blocks -> description -> subtasks)
      if (key.tab) {
        const currentId = fullDetailStack[fullDetailStack.length - 1];
        const currentIssue = data.byId.get(currentId);
        if (!currentIssue) return;

        const hasBlockedBy = currentIssue.blockedBy && currentIssue.blockedBy.length > 0;
        const hasBlocks = currentIssue.blocks && currentIssue.blocks.length > 0;
        const hasSubtasks = currentIssue.children && currentIssue.children.length > 0;

        // Build section order matching visual layout
        const sections: Array<'description' | 'blockedBy' | 'blocks' | 'subtasks'> = [];
        if (hasBlockedBy) sections.push('blockedBy');
        if (hasBlocks) sections.push('blocks');
        sections.push('description');
        if (hasSubtasks) sections.push('subtasks');

        const currentIdx = sections.indexOf(fullDetailSection);
        const nextIdx = (currentIdx + 1) % sections.length;
        const nextSection = sections[nextIdx];

        useBeadsStore.setState({
          fullDetailSection: nextSection,
          fullDetailSectionIndex: nextSection === 'description' ? -1 : 0,
          fullDetailDescriptionScroll: 0,
        });
        return;
      }
      // Block other inputs in full detail mode
      return;
    }

    // Toggle recent column
    if (input === 'r' && viewMode === 'kanban') {
      toggleRecentColumn();
      return;
    }

    // Refresh (Option+R / Alt+R)
    if (key.meta && input === 'r') {
      if (watcher) {
        watcher.reload();
        showToast('Data refreshed', 'info');
      }
      return;
    }

    // Undo (Ctrl+Z or u)
    if ((key.ctrl && input === 'z') || input === 'u') {
      const entry = undo();
      if (entry) {
        showToast(`Undo available: ${entry.action} on ${entry.issueId}`, 'info');
        // Note: Actual undo would require calling bd CLI to revert
        // For now, just show the notification
      } else {
        showToast('Nothing to undo', 'info');
      }
    }

    // Toggle search
    if (input === '/') {
      toggleSearch();
      return;
    }

    // Toggle filter
    if (input === 'f') {
      toggleFilter();
      return;
    }

    // Copy issue title and ID to clipboard (kanban only - tree/graph handle their own)
    if (input === 'i' && viewMode === 'kanban') {
      const issue = getSelectedIssue();
      if (issue) {
        const copyText = `${issue.title} - ${issue.id}`;
        copyToClipboard(copyText)
          .then(() => showToast(`Copied: ${issue.id}`, 'success'))
          .catch((err) => showToast(`Copy failed: ${err.message}`, 'error'));
      } else {
        showToast('No issue selected', 'info');
      }
      return;
    }

    // Clear filters (Shift+C)
    if (input === 'C') {
      clearFilters();
      showToast('Filters cleared', 'info');
      return;
    }

    // Command bar
    if (input === ':') {
      toggleJumpToPage();
      return;
    }

    // Create new issue
    if (input === 'N') { // Shift+N
      navigateToCreateIssue();
      return;
    }

    // Edit issue
    if (input === 'e') {
      navigateToEditIssue();
      return;
    }

    // Export issue
    if (input === 'x') {
      toggleExportDialog();
      return;
    }

    // Theme selector
    if (input === 't') {
      toggleThemeSelector();
      return;
    }

    // Total list view (Shift+T)
    if (input === 'T') {
      navigateToTotalList();
      return;
    }

    // Toggle blocked column visibility (stacked with in_progress when shown)
    if (input === 'b' && viewMode === 'kanban') {
      toggleBlockedColumn();
      return;
    }

    // Toggle parents only filter (show only root-level issues)
    if (input === 'p' && viewMode === 'kanban') {
      const currentParentsOnly = useBeadsStore.getState().filter.parentsOnly;
      toggleParentsOnly();
      // Show toast with NEW state (opposite of current)
      showToast(!currentParentsOnly ? 'Showing root items only' : 'Showing all items', 'info');
      return;
    }

    // Detail panel - Enter opens full detail if panel is visible or terminal too narrow, otherwise toggles panel
    if (key.return) {
      const minWidthForDetail = LAYOUT.columnWidth * 2 + LAYOUT.detailPanelWidth + 10;
      const canShowDetailPanel = terminalWidth >= minWidthForDetail;

      if (showDetails || !canShowDetailPanel) {
        // Open full detail view if detail panel is showing OR if terminal is too narrow for side panel
        toggleFullDetail();
      } else {
        toggleDetails();
      }
    }
    // Space always toggles detail panel
    if (input === ' ') {
      toggleDetails();
    }

    // Toggle notifications
    if (input === 'n') {
      toggleNotifications();
    }

    // Navigation - Arrow keys only
    if (key.upArrow) {
      moveUp();
    }
    if (key.downArrow) {
      moveDown();
    }
    if (key.leftArrow) {
      moveLeft();
    }
    if (key.rightArrow) {
      moveRight();
    }

    // Tab cycles columns in kanban view
    if (key.tab && viewMode === 'kanban') {
      const visibleColumnCount = useBeadsStore.getState().visibleColumnCount;
      const currentColumn = useBeadsStore.getState().selectedColumn;
      const nextColumn = (currentColumn + 1) % visibleColumnCount;
      useBeadsStore.setState({ selectedColumn: nextColumn });
      return;
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color={theme.colors.primary}>Loading beads...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.error} bold>Error:</Text>
        <Text color={theme.colors.error}>{error}</Text>
        <Text color={theme.colors.textDim} marginTop={1}>
          Make sure you're in a directory with a .beads/ folder
        </Text>
      </Box>
    );
  }

  // Show full detail panel if active
  if (showFullDetail && fullDetailStack.length > 0) {
    const currentId = fullDetailStack[fullDetailStack.length - 1];
    const fullDetailIssue = data.byId.get(currentId);
    if (fullDetailIssue) {
      return <FullDetailPanel issue={fullDetailIssue} />;
    }
  }

  return <Board />;
}
