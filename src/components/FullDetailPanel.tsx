import React, { useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import {
  PRIORITY_LABELS,
  getPriorityColor,
  getTypeColor,
  getStatusColor,
} from '../utils/constants';
import { renderMarkdownLines } from './MarkdownText';

interface FullDetailPanelProps {
  issue: Issue;
}

export function FullDetailPanel({ issue }: FullDetailPanelProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const data = useBeadsStore(state => state.data);
  const selectedSubtask = useBeadsStore(state => state.fullDetailSelectedSubtask);
  const fullDetailStack = useBeadsStore(state => state.fullDetailStack);
  const descriptionScroll = useBeadsStore(state => state.fullDetailDescriptionScroll);
  const setDescriptionMaxScroll = useBeadsStore(state => state.setFullDetailDescriptionMaxScroll);
  const setDescriptionPageSize = useBeadsStore(state => state.setFullDetailDescriptionPageSize);
  const theme = getTheme(currentTheme);

  const stackDepth = fullDetailStack.length;

  const priorityLabel = PRIORITY_LABELS[issue.priority] || 'Unknown';
  const priorityColor = getPriorityColor(issue.priority, theme);
  const typeColor = getTypeColor(issue.issue_type, theme);
  const statusColor = getStatusColor(issue.status, theme);

  // Calculate subtasks summary
  let completedSubtasks = 0;
  const totalSubtasks = issue.children?.length || 0;
  if (issue.children) {
    for (const id of issue.children) {
      const child = data.byId.get(id);
      if (child && child.status === 'closed') {
        completedSubtasks++;
      }
    }
  }

  // Render markdown and get lines for pagination
  const descriptionLines = useMemo(() => {
    if (!issue.description) return [];
    return renderMarkdownLines(issue.description);
  }, [issue.description]);

  // Calculate available height for description
  // Account for: border (4), padding (2), header (2), metadata (1), labels (1),
  // subtasks header (1), subtasks (totalSubtasks), timestamp (1), footer (2), margins (2)
  const fixedOverhead = 4 + 2 + 2 + 1 + (issue.labels?.length ? 1 : 0) +
    (totalSubtasks > 0 ? 1 + totalSubtasks : 0) + 1 + 2 + 2;
  const descriptionBoxOverhead = 2; // border top/bottom
  const maxDescriptionLines = Math.max(3, terminalHeight - fixedOverhead - descriptionBoxOverhead);

  // Calculate max scroll (how many lines are hidden)
  const maxScroll = Math.max(0, descriptionLines.length - maxDescriptionLines);

  // Update store with max scroll and page size when they change
  useEffect(() => {
    setDescriptionMaxScroll(maxScroll);
    setDescriptionPageSize(maxDescriptionLines);
  }, [maxScroll, maxDescriptionLines, setDescriptionMaxScroll, setDescriptionPageSize]);

  // Get visible description lines
  const visibleDescriptionLines = useMemo(() => {
    return descriptionLines.slice(descriptionScroll, descriptionScroll + maxDescriptionLines);
  }, [descriptionLines, descriptionScroll, maxDescriptionLines]);

  const canScrollUp = descriptionScroll > 0;
  const canScrollDown = descriptionScroll < maxScroll;
  const isInDescriptionMode = selectedSubtask === -1;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.colors.primary}
      width={terminalWidth}
      height={terminalHeight}
      padding={1}
    >
      {/* Header */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.primary}>{issue.title.length > terminalWidth - 6 ? issue.title.slice(0, terminalWidth - 9) + '...' : issue.title}</Text>
        <Text color={theme.colors.textDim}>{issue.id}</Text>
      </Box>

      {/* Metadata line */}
      <Text>
        <Text color={typeColor}>{issue.issue_type}</Text>
        <Text color={theme.colors.textDim}> | </Text>
        <Text color={priorityColor}>{priorityLabel} (P{issue.priority})</Text>
        <Text color={theme.colors.textDim}> | </Text>
        <Text color={statusColor}>{issue.status.replace('_', ' ')}</Text>
        {issue.assignee && (
          <>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={theme.colors.success}>@{issue.assignee}</Text>
          </>
        )}
        {totalSubtasks > 0 && (
          <>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={completedSubtasks === totalSubtasks ? theme.colors.success : theme.colors.textDim}>
              Subtasks: {completedSubtasks}/{totalSubtasks}
            </Text>
          </>
        )}
      </Text>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <Text>
          {issue.labels.map((label, i) => (
            <Text key={label}>
              <Text color={theme.colors.secondary}>#{label}</Text>
              {i < issue.labels!.length - 1 && <Text> </Text>}
            </Text>
          ))}
        </Text>
      )}

      {/* Description - scrollable with markdown */}
      {issue.description && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={isInDescriptionMode ? theme.colors.primary : theme.colors.border}>
          {canScrollUp && (
            <Text color={theme.colors.primary}> ▲ {descriptionScroll} more lines above</Text>
          )}
          {visibleDescriptionLines.map((line, i) => (
            <Text key={i + descriptionScroll}> {line || ''}</Text>
          ))}
          {canScrollDown && (
            <Text color={theme.colors.primary}> ▼ {descriptionLines.length - descriptionScroll - maxDescriptionLines} more lines below</Text>
          )}
        </Box>
      )}

      {/* Subtasks list - navigable */}
      {issue.children && issue.children.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.colors.textDim}>Subtasks ({completedSubtasks}/{totalSubtasks}) - Enter to view:</Text>
          {issue.children.map((id, index) => {
            const child = data.byId.get(id);
            if (!child) return <Text key={id} color={theme.colors.textDim}>  ? {id}</Text>;
            const isDone = child.status === 'closed';
            const isSelected = index === selectedSubtask;
            const statusIcon = isDone ? '[x]' : '[ ]';
            const baseColor = isDone ? theme.colors.success : theme.colors.text;
            const color = isSelected ? theme.colors.primary : baseColor;
            return (
              <Text key={id}>
                <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>{isSelected ? '>' : ' '} </Text>
                <Text color={color}>{statusIcon} </Text>
                <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>{child.id}: </Text>
                <Text color={color} bold={isSelected}>{child.title}</Text>
                {!isDone && <Text color={theme.colors.textDim}> ({child.status})</Text>}
              </Text>
            );
          })}
        </Box>
      )}

      {/* Timestamp */}
      <Text color={theme.colors.textDim} dimColor>
        Updated: {new Date(issue.updated_at).toLocaleString()}
      </Text>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={theme.colors.textDim}>
          ESC: {stackDepth > 1 ? 'back' : 'close'} | Up/Down: {isInDescriptionMode ? 'scroll desc' : 'select subtask'} | Enter: view subtask
          {stackDepth > 1 && <Text color={theme.colors.secondary}> | Depth: {stackDepth}</Text>}
        </Text>
      </Box>
    </Box>
  );
}
