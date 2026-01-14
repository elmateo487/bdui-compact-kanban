import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import {
  PRIORITY_LABELS,
  getPriorityColor,
  LAYOUT,
} from '../utils/constants';

interface IssueCardProps {
  issue: Issue;
  isSelected?: boolean;
  width?: number;
}

export function IssueCard({ issue, isSelected = false, width = LAYOUT.columnWidth }: IssueCardProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const priorityColor = getPriorityColor(issue.priority, theme);

  // Determine authority status from labels
  const getAuthorityColor = (): string => {
    if (issue.labels?.includes('authority:granted')) return theme.colors.success;
    if (issue.labels?.includes('authority:pending')) return 'yellow';
    if (issue.labels?.includes('authority:suspended')) return theme.colors.error;
    return theme.colors.textDim;
  };
  const authorityColor = getAuthorityColor();

  // Check if closed with non-completion reason (should be struck through)
  // Non-completion = explicitly marked as won't do, duplicate, or out of scope
  const isNonCompletionClose = (): boolean => {
    if (issue.status !== 'closed' || !issue.close_reason) return false;
    const reason = issue.close_reason.toLowerCase();
    // Only strikethrough for explicit non-completion reasons
    const nonCompletionPatterns = ["won't implement", "wont implement", "duplicate", "out of scope"];
    return nonCompletionPatterns.some(pattern => reason.includes(pattern));
  };
  const shouldStrikethrough = isNonCompletionClose();

  // Calculate subtask completion
  const data = useBeadsStore(state => state.data);
  let completedTasks = 0;
  const totalTasks = issue.children?.length || 0;
  if (issue.children) {
    for (const id of issue.children) {
      const child = data.byId.get(id);
      if (child && child.status === 'closed') completedTasks++;
    }
  }

  return (
    <Box
      borderStyle="round"
      borderColor={isSelected ? '#FFA500' : theme.colors.border}
      paddingX={0}
      flexDirection="column"
      width={width}
    >
      {/* Title - up to 2 lines */}
      <Text bold strikethrough={shouldStrikethrough} color={shouldStrikethrough ? theme.colors.textDim : (isSelected ? theme.colors.primary : theme.colors.text)} wrap="truncate">
        {issue.title.slice(0, width - 2)}
      </Text>
      {issue.title.length > width - 2 && (
        <Text bold strikethrough={shouldStrikethrough} color={shouldStrikethrough ? theme.colors.textDim : (isSelected ? theme.colors.primary : theme.colors.text)} wrap="truncate">
          {issue.title.slice(width - 2, (width - 2) * 2)}
        </Text>
      )}

      {/* Compact info line: id | priority | tasks */}
      <Text wrap="truncate">
        <Text color={authorityColor}>{issue.id}</Text>
        <Text color={theme.colors.textDim}> </Text>
        <Text color={priorityColor}>P{issue.priority}</Text>
        {totalTasks > 0 && (
          <>
            <Text color={theme.colors.textDim}> </Text>
            <Text color={completedTasks > 0 ? theme.colors.success : theme.colors.textDim}>
              {completedTasks}/{totalTasks}
            </Text>
          </>
        )}
        {issue.blockedBy && issue.blockedBy.length > 0 && (
          <>
            <Text color={theme.colors.textDim}> </Text>
            <Text color={theme.colors.statusBlocked}>[!]</Text>
          </>
        )}
        {/* Orphan indicator: AC without a parent */}
        {issue.labels?.includes('type:ac') && !issue.parent && (
          <>
            <Text color={theme.colors.textDim}> </Text>
            <Text color={theme.colors.warning}>[ORPHAN]</Text>
          </>
        )}
      </Text>
    </Box>
  );
}
