import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { IssueCard } from './IssueCard';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { LAYOUT, getStatusColor } from '../utils/constants';

interface StackedColumnProps {
  title: string;
  issues: Issue[];
  isActive: boolean;
  selectedIndex: number;
  scrollOffset: number;
  itemsPerPage: number;
  statusKey: string;
  height: number;
}

function MiniStatusColumn({
  title,
  issues,
  isActive,
  selectedIndex,
  scrollOffset,
  itemsPerPage,
  statusKey,
  height,
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
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box
        borderStyle={isActive ? 'double' : 'single'}
        borderColor={isActive ? theme.colors.primary : statusColor}
        paddingX={1}
        justifyContent="center"
      >
        <Text bold color={isActive ? theme.colors.primary : statusColor}>
          {title} ({totalIssues})
        </Text>
      </Box>

      {/* Scroll up indicator */}
      {hasLess && (
        <Box justifyContent="center">
          <Text color={theme.colors.warning} bold>
            [{itemsAbove}↑]
          </Text>
        </Box>
      )}

      {/* Issues list */}
      <Box flexDirection="column" gap={0} flexGrow={1} overflow="hidden">
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
              />
            );
          })
        )}
      </Box>

      {/* Scroll down indicator */}
      {hasMore && (
        <Box justifyContent="center">
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
  itemsPerPage: number;
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
  itemsPerPage,
}: StackedStatusColumnsProps) {
  // Split height equally between top and bottom, accounting for headers
  const halfHeight = Math.floor(totalHeight / 2);
  // Reduce items per page for stacked columns since they have less space
  const stackedItemsPerPage = Math.max(1, Math.floor(itemsPerPage / 2) - 1);

  return (
    <Box flexDirection="column" width={LAYOUT.columnWidth} height={totalHeight}>
      <MiniStatusColumn
        title={topTitle}
        issues={topIssues}
        isActive={topIsActive}
        selectedIndex={topSelectedIndex}
        scrollOffset={topScrollOffset}
        itemsPerPage={stackedItemsPerPage}
        statusKey={topStatusKey}
        height={halfHeight}
      />
      <MiniStatusColumn
        title={bottomTitle}
        issues={bottomIssues}
        isActive={bottomIsActive}
        selectedIndex={bottomSelectedIndex}
        scrollOffset={bottomScrollOffset}
        itemsPerPage={stackedItemsPerPage}
        statusKey={bottomStatusKey}
        height={halfHeight}
      />
    </Box>
  );
}
