import React, { useMemo } from 'react';
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

interface DetailPanelProps {
  issue: Issue | null;
  maxHeight?: number;
  width?: number;
}

// Default width if not provided
const DEFAULT_PANEL_WIDTH = 50;

// Description with markdown rendering
function DescriptionBox({ description, theme, maxLines, contentWidth }: { description: string, theme: any, maxLines?: number, contentWidth: number }) {
  // Render markdown with width-aware wrapping
  const renderedLines = useMemo(() => renderMarkdownLines(description, contentWidth), [description, contentWidth]);

  // Check if we need to show "more lines" indicator
  const hasMore = maxLines && renderedLines.length > maxLines;
  // If hasMore, reserve 1 line for the indicator
  const contentLines = hasMore && maxLines ? maxLines - 1 : maxLines;
  const visibleLines = contentLines ? renderedLines.slice(0, contentLines) : renderedLines;

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={theme.colors.border}>
      {visibleLines.map((line, i) => (
        <Text key={i}> {line || ''}</Text>
      ))}
      {hasMore && contentLines && (
        <Text color={theme.colors.textDim}> ... ({renderedLines.length - contentLines} more lines)</Text>
      )}
    </Box>
  );
}

// Subtasks summary component
function SubtasksSummary({ childIds, theme }: { childIds: string[], theme: any }) {
  const data = useBeadsStore(state => state.data);

  let completed = 0;
  for (const id of childIds) {
    const child = data.byId.get(id);
    if (child && child.status === 'closed') {
      completed++;
    }
  }

  const total = childIds.length;
  const color = completed === total ? theme.colors.success : theme.colors.textDim;

  return (
    <Text color={color}>
      Subtasks: {completed}/{total} complete
    </Text>
  );
}

export function DetailPanel({ issue, maxHeight, width }: DetailPanelProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  // Calculate panel and content widths
  const panelWidth = width || DEFAULT_PANEL_WIDTH;
  // Content width: panel width - outer border(2) - desc box border(2) - leading space(1) - right margin(1)
  const contentWidth = panelWidth - 6;

  // Calculate available lines for description
  // Fixed overhead: main border(2) + header(2) + metadata(1) + desc marginTop(1) + desc border(2) + timestamp(1) + actions(1)
  const fixedOverhead = 10;
  const labelsLines = issue?.labels?.length ? 1 : 0;
  const subtasksLines = issue?.children?.length ? 1 : 0;
  const blockedByLines = issue?.blockedBy?.length ? 1 + issue.blockedBy.length : 0;
  const blocksLines = issue?.blocks?.length ? 1 + issue.blocks.length : 0;
  const parentLine = issue?.parent ? 1 : 0;
  const dynamicOverhead = labelsLines + subtasksLines + blockedByLines + blocksLines + parentLine;
  const descriptionMaxLines = maxHeight ? Math.max(3, maxHeight - fixedOverhead - dynamicOverhead) : 10;

  if (!issue) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.border}
        width={panelWidth}
      >
        <Text color={theme.colors.textDim} italic> No issue selected</Text>
        <Box marginTop={1}>
          <Text color={theme.colors.textDim}>
            {' '}Select an issue with arrow keys
          </Text>
        </Box>
      </Box>
    );
  }

  const priorityLabel = PRIORITY_LABELS[issue.priority] || 'Unknown';
  const priorityColor = getPriorityColor(issue.priority, theme);
  const typeColor = getTypeColor(issue.issue_type, theme);
  const statusColor = getStatusColor(issue.status, theme);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.colors.primary}
      width={panelWidth}
      height={maxHeight}
    >
      {/* Header - title truncates, ID on separate line */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.primary}> {issue.title}</Text>
        <Text color={theme.colors.textDim} dimColor> {issue.id}</Text>
      </Box>

      {/* Compact metadata line */}
      <Text>
        <Text> </Text>
        <Text color={typeColor}>{issue.issue_type}</Text>
        <Text color={theme.colors.textDim}> | </Text>
        <Text color={priorityColor}>P{issue.priority}</Text>
        <Text color={theme.colors.textDim}> | </Text>
        <Text color={statusColor}>{issue.status.replace('_', ' ')}</Text>
        {issue.assignee && (
          <>
            <Text color={theme.colors.textDim}> | </Text>
            <Text color={theme.colors.success}>@{issue.assignee}</Text>
          </>
        )}
      </Text>

      {/* Labels - compact, no gaps */}
      {issue.labels && issue.labels.length > 0 && (
        <Text>
          <Text> </Text>
          {issue.labels.map((label, i) => (
            <Text key={label}>
              <Text color={theme.colors.secondary}>#{label}</Text>
              {i < issue.labels!.length - 1 && <Text color={theme.colors.textDim}> </Text>}
            </Text>
          ))}
        </Text>
      )}

      {/* Subtasks summary */}
      {issue.children && issue.children.length > 0 && (
        <Text> <SubtasksSummary childIds={issue.children} theme={theme} /></Text>
      )}

      {/* Dependencies - only if present */}
      {issue.blockedBy && issue.blockedBy.length > 0 && (
        <Box flexDirection="column">
          <Text color={theme.colors.statusBlocked} bold> [!] Blocked by:</Text>
          {issue.blockedBy.map(id => (
            <Text key={id} color={theme.colors.textDim}>   - {id}</Text>
          ))}
        </Box>
      )}

      {issue.blocks && issue.blocks.length > 0 && (
        <Box flexDirection="column">
          <Text color={theme.colors.textDim}> Blocks:</Text>
          {issue.blocks.map(id => (
            <Text key={id} color={theme.colors.textDim}>   - {id}</Text>
          ))}
        </Box>
      )}

      {issue.parent && (
        <Text color={theme.colors.textDim}> Parent: {issue.parent}</Text>
      )}

      {/* Description - fills remaining space with markdown */}
      {issue.description && (
        <DescriptionBox description={issue.description} theme={theme} maxLines={descriptionMaxLines} contentWidth={contentWidth} />
      )}

      {/* Compact timestamp */}
      <Text color={theme.colors.textDim} dimColor>
        {' '}Updated: {new Date(issue.updated_at).toLocaleString()}
      </Text>

      {/* Actions hint */}
      <Text color={theme.colors.textDim} dimColor> Enter: full | e: edit | x: export</Text>
    </Box>
  );
}
