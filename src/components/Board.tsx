import React, { useMemo, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { StatusColumn } from './StatusColumn';
import { StackedStatusColumns } from './StackedStatusColumns';
import { DetailPanel } from './DetailPanel';
import { HelpOverlay } from './HelpOverlay';
import { SearchInput } from './SearchInput';
import { CreateIssueForm } from './CreateIssueForm';
import { EditIssueForm } from './EditIssueForm';
import { ExportDialog } from './ExportDialog';
import { ThemeSelector } from './ThemeSelector';
import { TotalListView } from './TotalListView';
import { Toast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { CommandBar } from './CommandBar';
import { LAYOUT } from '../utils/constants';
import type { Issue } from '../types';

function KanbanView() {
  const data = useBeadsStore(state => state.data);
  const stats = useBeadsStore(state => state.data.stats);
  const selectedColumn = useBeadsStore(state => state.selectedColumn);

  // Force re-render after mount to fix Ink initial render issue
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 50);
    return () => clearTimeout(timer);
  }, []);
  const columnStates = useBeadsStore(state => state.columnStates);
  const itemsPerPage = useBeadsStore(state => state.itemsPerPage);
  const showDetails = useBeadsStore(state => state.showDetails);
  const showSearch = useBeadsStore(state => state.showSearch);
  const showExportDialog = useBeadsStore(state => state.showExportDialog);
  const showThemeSelector = useBeadsStore(state => state.showThemeSelector);
  const showJumpToPage = useBeadsStore(state => state.showJumpToPage);
  const showBlockedColumn = useBeadsStore(state => state.showBlockedColumn);
  const setVisibleColumnCount = useBeadsStore(state => state.setVisibleColumnCount);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const viewMode = useBeadsStore(state => state.viewMode);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const notificationsEnabled = useBeadsStore(state => state.notificationsEnabled);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();

  // Apply filtering - rebuild byStatus from filtered issues when parentsOnly is active
  const needsFiltering = filter.parentsOnly;
  const filteredData = useMemo(() => {
    if (!needsFiltering) {
      return data;
    }

    const filteredIssues = getFilteredIssues();

    // Rebuild byStatus structure
    const byStatus: Record<string, Issue[]> = {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    };

    filteredIssues.forEach(issue => {
      if (byStatus[issue.status]) {
        byStatus[issue.status].push(issue);
      }
    });

    // Helper to count closed children for an issue
    const getClosedChildCount = (issue: Issue): number => {
      if (!issue.children || issue.children.length === 0) return 0;
      return issue.children.filter(childId => {
        const child = data.byId.get(childId);
        return child && child.status === 'closed';
      }).length;
    };

    // Sort each status column: priority ASC (P0 first), then closed task count DESC, then created time DESC
    const sortIssues = (a: Issue, b: Issue): number => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const aClosedCount = getClosedChildCount(a);
      const bClosedCount = getClosedChildCount(b);
      if (aClosedCount !== bClosedCount) {
        return bClosedCount - aClosedCount;
      }
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    };

    for (const status of Object.keys(byStatus)) {
      byStatus[status].sort(sortIssues);
    }

    return {
      ...data,
      byStatus,
      issues: filteredIssues,
      stats: {
        total: filteredIssues.length,
        open: byStatus.open.length,
        closed: byStatus.closed.length,
        blocked: byStatus.blocked.length,
      },
    };
  }, [data, searchQuery, filter, getFilteredIssues, needsFiltering]);

  // With stacked layout: Open is column 0, In Progress (+ optional Blocked) is column 1
  // Navigation uses 2 or 3 logical columns depending on showBlockedColumn
  const maxColumns = showBlockedColumn ? 3 : 2;
  const visualColumns = 2; // Open + InProgress (with optional Blocked stacked)

  // Responsive layout calculations
  const COLUMN_WIDTH = LAYOUT.columnWidth;
  const DETAIL_PANEL_WIDTH = LAYOUT.detailPanelWidth;
  const MIN_WIDTH_FOR_DETAIL = COLUMN_WIDTH * visualColumns + DETAIL_PANEL_WIDTH + 10;
  const MIN_WIDTH_FOR_ALL_COLUMNS = COLUMN_WIDTH * visualColumns + 10;

  // Auto-hide detail panel on narrow screens
  const shouldShowDetails = showDetails && terminalWidth >= MIN_WIDTH_FOR_DETAIL;

  // With stacked layout, we always show both visual columns if possible
  const showBothVisualColumns = terminalWidth >= MIN_WIDTH_FOR_ALL_COLUMNS;

  // Update store with visible column count for navigation
  // maxColumns is the logical count (for keyboard navigation)
  useEffect(() => {
    setVisibleColumnCount(maxColumns);
  }, [maxColumns, setVisibleColumnCount]);

  // Calculate available width for detail panel
  const detailPanelAvailableWidth = terminalWidth - (visualColumns * COLUMN_WIDTH) - 1;

  // Calculate height for stacked columns (total height minus status bar)
  const stackedColumnHeight = terminalHeight - 1;

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Status Bar */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Total: <Text color={theme.colors.text}>{stats.total}</Text></Text>
          <Text color={theme.colors.textDim}>Blocked: <Text color={theme.colors.statusBlocked}>{stats.blocked}</Text></Text>
          <Text color={theme.colors.textDim}>(b)locked:<Text color={showBlockedColumn ? theme.colors.success : theme.colors.textDim}>{showBlockedColumn ? 'ON' : 'off'}</Text></Text>
          <Text color={theme.colors.textDim}>(n)otif:<Text color={notificationsEnabled ? theme.colors.success : theme.colors.textDim}>{notificationsEnabled ? 'ON' : 'off'}</Text></Text>
          <Text color={theme.colors.textDim}>(h)elp (q)uit</Text>
          {!showBothVisualColumns && (
            <Text color={theme.colors.warning}>[narrow]</Text>
          )}
        </Box>
        <Text color={theme.colors.textDim}>{terminalWidth}x{terminalHeight}</Text>
      </Box>

      {/* Search Input */}
      {showSearch && <SearchInput />}

      {/* Main content */}
      <Box flexGrow={1} overflow="hidden">
        {/* Board columns: Open + Stacked(InProgress/Blocked) */}
        <Box flexShrink={0}>
          {/* Open column - full height */}
          <StatusColumn
            title="Open"
            issues={filteredData.byStatus['open'] || []}
            isActive={selectedColumn === 0}
            selectedIndex={columnStates['open'].selectedIndex}
            scrollOffset={columnStates['open'].scrollOffset}
            itemsPerPage={itemsPerPage}
            statusKey="open"
          />

          {/* In Progress column - full height when blocked hidden, stacked when shown */}
          {showBothVisualColumns && !showBlockedColumn && (
            <StatusColumn
              title="In Progress"
              issues={filteredData.byStatus['in_progress'] || []}
              isActive={selectedColumn === 1}
              selectedIndex={columnStates['in_progress'].selectedIndex}
              scrollOffset={columnStates['in_progress'].scrollOffset}
              itemsPerPage={itemsPerPage}
              statusKey="in_progress"
            />
          )}

          {/* Stacked In Progress / Blocked columns when blocked is shown */}
          {showBothVisualColumns && showBlockedColumn && (
            <StackedStatusColumns
              topTitle="In Progress"
              topIssues={filteredData.byStatus['in_progress'] || []}
              topIsActive={selectedColumn === 1}
              topSelectedIndex={columnStates['in_progress'].selectedIndex}
              topScrollOffset={columnStates['in_progress'].scrollOffset}
              topStatusKey="in_progress"
              bottomTitle="Blocked"
              bottomIssues={filteredData.byStatus['blocked'] || []}
              bottomIsActive={selectedColumn === 2}
              bottomSelectedIndex={columnStates['blocked'].selectedIndex}
              bottomScrollOffset={columnStates['blocked'].scrollOffset}
              bottomStatusKey="blocked"
              totalHeight={stackedColumnHeight}
              itemsPerPage={itemsPerPage}
            />
          )}
        </Box>

        {/* Detail panel - always show when terminal wide enough */}
        {terminalWidth >= MIN_WIDTH_FOR_DETAIL && (
          <Box marginLeft={1} flexGrow={1} overflow="hidden">
            <DetailPanel
              issue={selectedIssue}
              maxHeight={terminalHeight - 1}
              width={detailPanelAvailableWidth}
              collapsed={!showDetails}
            />
          </Box>
        )}
        {showDetails && terminalWidth < MIN_WIDTH_FOR_DETAIL && (
          <Box marginLeft={1} padding={1} borderStyle="single" borderColor={theme.colors.warning}>
            <Text color={theme.colors.warning}>
              Terminal too narrow for detail panel (need {MIN_WIDTH_FOR_DETAIL} cols)
            </Text>
          </Box>
        )}
      </Box>

      {/* Command Bar (vim-style) */}
      {showJumpToPage && <CommandBar />}

      {/* Export Dialog */}
      {showExportDialog && selectedIssue && (
        <Box
          position="absolute"
          top={Math.floor(terminalHeight / 2) - 10}
          left={Math.floor(terminalWidth / 2) - 35}
        >
          <ExportDialog
            issue={selectedIssue}
            onClose={toggleExportDialog}
          />
        </Box>
      )}

      {/* Theme Selector */}
      {showThemeSelector && (
        <Box
          position="absolute"
          top={Math.floor(terminalHeight / 2) - 10}
          left={Math.floor(terminalWidth / 2) - 30}
        >
          <ThemeSelector onClose={toggleThemeSelector} />
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </Box>
  );
}

export function Board() {
  const viewMode = useBeadsStore(state => state.viewMode);
  const showHelp = useBeadsStore(state => state.showHelp);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const reloadCallback = useBeadsStore(state => state.reloadCallback);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();

  // Check minimum terminal width
  if (terminalWidth < LAYOUT.minTerminalWidth) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.error} bold>Terminal Too Narrow</Text>
        <Text color={theme.colors.text}>
          BD TUI requires at least {LAYOUT.minTerminalWidth} columns.
        </Text>
        <Text color={theme.colors.textDim}>
          Current width: {terminalWidth} columns
        </Text>
        <Text color={theme.colors.textDim} marginTop={1}>
          Please resize your terminal window.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Render view based on mode */}
      {viewMode === 'kanban' && <KanbanView />}
      {viewMode === 'create-issue' && (
        <CreateIssueForm
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}
      {viewMode === 'edit-issue' && selectedIssue && (
        <EditIssueForm
          issue={selectedIssue}
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}
      {viewMode === 'total-list' && (
        <TotalListView
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
        />
      )}

      {/* Help overlay - shared across all views */}
      {showHelp && <HelpOverlay />}

      {/* Confirm dialog - shared across all views */}
      <ConfirmDialog />

      {/* Toast message - shared across all views, rendered last to appear on top */}
      <Toast />
    </Box>
  );
}
