import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { IssueCard } from './IssueCard';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { LAYOUT, getStatusColor } from '../utils/constants';

// Calculate items per page based on available height
function calculateItemsPerPage(height: number, hasScrollUp: boolean, hasScrollDown: boolean): number {
  // Header with border = 3 lines
  const headerHeight = 3;
  // Each scroll indicator = 1 line
  const scrollUpHeight = hasScrollUp ? 1 : 0;
  const scrollDownHeight = hasScrollDown ? 1 : 0;

  const contentHeight = height - headerHeight - scrollUpHeight - scrollDownHeight;
  return Math.max(1, Math.floor(contentHeight / LAYOUT.issueCardHeight));
}

interface StackedColumnProps {
  title: string;
  issues: Issue[];
  isActive: boolean;
  selectedIndex: number;
  scrollOffset: number;
  statusKey: string;
  itemsPerPage: number;
  width: number;
}

function MiniStatusColumn({
  title,
  issues,
  isActive,
  selectedIndex,
  scrollOffset,
  statusKey,
  itemsPerPage,
  width,
}: StackedColumnProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const totalIssues = issues.length;
  const visibleIssues = issues.slice(scrollOffset, scrollOffset + itemsPerPage);
  const hasMore = totalIssues > scrollOffset + itemsPerPage;
  const hasLess = scrollOffset > 0;
  const itemsBelow = Math.max(0, totalIssues - (scrollOffset + itemsPerPage));
  const itemsAbove = scrollOffset;

  const statusColor = getStatusColor(statusKey, theme);

  return (
    <Box flexDirection="column" flexGrow={1} flexBasis={0}>
      {/* Header */}
      <Box
        borderStyle={isActive ? 'double' : 'single'}
        borderColor={isActive ? theme.colors.primary : statusColor}
        paddingX={1}
        justifyContent="center"
        flexShrink={0}
      >
        <Text bold color={isActive ? theme.colors.primary : statusColor}>
          {title} ({totalIssues})
        </Text>
      </Box>

      {/* Scroll up indicator */}
      {hasLess && (
        <Box justifyContent="center" flexShrink={0}>
          <Text color={theme.colors.warning} bold>
            [{itemsAbove}↑]
          </Text>
        </Box>
      )}

      {/* Issues list */}
      <Box flexDirection="column" gap={0} flexShrink={0}>
        {totalIssues === 0 ? (
          <Box paddingX={1} paddingY={1}>
            <Text color={theme.colors.textDim} italic>
              Empty
            </Text>
          </Box>
        ) : (
          visibleIssues.map((issue, idx) => {
            const absoluteIndex = scrollOffset + idx;
            const isSelected = isActive && absoluteIndex === selectedIndex;
            return (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={isSelected}
                width={width}
              />
            );
          })
        )}
      </Box>

      {/* Scroll down indicator */}
      {hasMore && (
        <Box justifyContent="center" flexShrink={0}>
          <Text color={theme.colors.warning} bold>
            [{itemsBelow}↓]
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface StackedStatusColumnsProps {
  topTitle: string;
  topIssues: Issue[];
  topIsActive: boolean;
  topSelectedIndex: number;
  topScrollOffset: number;
  topStatusKey: string;
  bottomTitle: string;
  bottomIssues: Issue[];
  bottomIsActive: boolean;
  bottomSelectedIndex: number;
  bottomScrollOffset: number;
  bottomStatusKey: string;
  totalHeight: number;
  width?: number;
}

export function StackedStatusColumns({
  topTitle,
  topIssues,
  topIsActive,
  topSelectedIndex,
  topScrollOffset,
  topStatusKey,
  bottomTitle,
  bottomIssues,
  bottomIsActive,
  bottomSelectedIndex,
  bottomScrollOffset,
  bottomStatusKey,
  totalHeight,
  width = LAYOUT.columnWidth,
}: StackedStatusColumnsProps) {
  // Calculate items per page based on half the available height
  const halfHeight = Math.floor(totalHeight / 2);
  const itemsPerPage = calculateItemsPerPage(halfHeight, false, true);

  return (
    <Box flexDirection="column" width={width} height={totalHeight}>
      <MiniStatusColumn
        title={topTitle}
        issues={topIssues}
        isActive={topIsActive}
        selectedIndex={topSelectedIndex}
        scrollOffset={topScrollOffset}
        statusKey={topStatusKey}
        itemsPerPage={itemsPerPage}
        width={width}
      />
      <MiniStatusColumn
        title={bottomTitle}
        issues={bottomIssues}
        isActive={bottomIsActive}
        selectedIndex={bottomSelectedIndex}
        scrollOffset={bottomScrollOffset}
        statusKey={bottomStatusKey}
        itemsPerPage={itemsPerPage}
        width={width}
      />
    </Box>
  );
}
