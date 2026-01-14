import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import {
  PRIORITY_LABELS,
  getPriorityColor,
  getStatusColor,
} from '../utils/constants';
import { renderMarkdownLines } from './MarkdownText';

interface DetailPanelProps {
  issue: Issue | null;
  maxHeight?: number;
  width?: number;
  collapsed?: boolean;
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
    <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.border}>
      {visibleLines.map((line, i) => (
        <Text key={i}> {line || ''}</Text>
      ))}
      {hasMore && contentLines && (
        <Text color={theme.colors.textDim}> ... ({renderedLines.length - contentLines} more lines)</Text>
      )}
    </Box>
  );
}

// Children summary component with hierarchy-aware labeling
function ChildrenSummary({ issue, theme }: { issue: Issue, theme: any }) {
  const data = useBeadsStore(state => state.data);

  let completed = 0;
  const childIds = issue.children || [];
  for (const id of childIds) {
    const child = data.byId.get(id);
    if (child && child.status === 'closed') {
      completed++;
    }
  }

  const total = childIds.length;
  const isEpic = issue.issue_type === 'epic';
  const label = isEpic ? 'Tickets' : 'Acceptance Criteria';
  const labelColor = isEpic ? '#FFA500' : 'yellow'; // orange for tickets, yellow for ACs
  const countColor = completed > 0 ? theme.colors.success : theme.colors.textDim;

  return (
    <Text>
      <Text color={labelColor} bold>{label}</Text>
      <Text color={countColor}>: {completed}/{total}</Text>
    </Text>
  );
}

// Get hierarchy-aware type info
function getHierarchyInfo(issue: Issue, data: any): { label: string; color: string } {
  if (issue.issue_type === 'epic') return { label: 'Epic', color: 'magenta' };
  if (issue.parent) {
    const parent = data.byId.get(issue.parent);
    if (parent?.issue_type === 'epic') return { label: 'Ticket', color: '#FFA500' };
    return { label: 'Acceptance Criteria', color: 'yellow' };
  }
  return { label: 'Ticket', color: '#FFA500' };
}

export function DetailPanel({ issue, maxHeight, width, collapsed }: DetailPanelProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const data = useBeadsStore(state => state.data);
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

  // Show collapsed placeholder when panel is hidden
  if (collapsed) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.border}
        width={panelWidth}
        height={maxHeight}
      >
        <Text color={theme.colors.textDim} bold> Detail Panel</Text>
        <Text color={theme.colors.border}>{'─'.repeat(panelWidth - 2)}</Text>

        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Text color={theme.colors.textDim} italic>Panel hidden</Text>
        </Box>

        <Box flexGrow={1} />

        <Box flexDirection="column" paddingX={1}>
          <Text color={theme.colors.border}>{'─'.repeat(panelWidth - 4)}</Text>
          <Text color={theme.colors.textDim}> <Text color={theme.colors.secondary}>Space</Text> Show panel</Text>
        </Box>
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.border}
        width={panelWidth}
        height={maxHeight}
      >
        <Text color={theme.colors.textDim} bold> Detail Panel</Text>
        <Text color={theme.colors.border}>{'─'.repeat(panelWidth - 2)}</Text>

        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Text color={theme.colors.textDim} italic>No issue selected</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.textDim}>
              Select an issue from the board to view its details here.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const priorityLabel = PRIORITY_LABELS[issue.priority] || 'Unknown';
  const priorityColor = getPriorityColor(issue.priority, theme);
  const statusColor = getStatusColor(issue.status, theme);
  const hierarchy = getHierarchyInfo(issue, data);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.colors.primary}
      width={panelWidth}
      height={maxHeight}
    >
      {/* Header - title truncated to panel width */}
      <Text bold color={theme.colors.primary}> {issue.title.length > panelWidth - 4 ? issue.title.slice(0, panelWidth - 7) + '...' : issue.title}</Text>
      {/* ID on separate line */}
      <Text color={theme.colors.textDim} dimColor> {issue.id}</Text>

      {/* Compact metadata line */}
      <Text>
        <Text> </Text>
        <Text color={hierarchy.color} bold>{hierarchy.label}</Text>
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
          {issue.labels.map((label, i) => {
            const [name, value] = label.includes(':') ? label.split(':', 2) : [label, null];
            return (
              <Text key={label}>
                <Text color={theme.colors.secondary}>#{name}</Text>
                {value && <Text color={theme.colors.accent}>:{value}</Text>}
                {i < issue.labels!.length - 1 && <Text color={theme.colors.textDim}> </Text>}
              </Text>
            );
          })}
        </Text>
      )}

      {/* Children summary */}
      {issue.children && issue.children.length > 0 && (
        <Text> <ChildrenSummary issue={issue} theme={theme} /></Text>
      )}

      {/* Close reason - show when closed with a reason */}
      {issue.status === 'closed' && issue.close_reason && (
        <Box flexDirection="column" borderStyle="single" borderColor="yellow">
          <Text color="yellow" bold> Closed:</Text>
          <Text color="yellow"> {issue.close_reason.slice(0, 80)}{issue.close_reason.length > 80 ? '...' : ''}</Text>
        </Box>
      )}

      {/* Blocking info - show when status is blocked or has blockedBy */}
      {(issue.status === 'blocked' || (issue.blockedBy && issue.blockedBy.length > 0)) && (
        <Box flexDirection="column">
          <Text color={theme.colors.statusBlocked} bold> Blocked By:</Text>
          {issue.blockedBy && issue.blockedBy.length > 0 ? issue.blockedBy.map(id => {
            const blocker = data.byId.get(id);
            return (
              <Text key={id} color={theme.colors.statusBlocked}>
                {'  '}• {blocker ? blocker.title.slice(0, 30) : id}
                {blocker && <Text color={theme.colors.textDim}> ({blocker.status})</Text>}
              </Text>
            );
          }) : (
            <Text color={theme.colors.textDim}>{'  '}Needs human decision (check comments)</Text>
          )}
        </Box>
      )}

      {issue.blocks && issue.blocks.length > 0 && (
        <Box flexDirection="column">
          <Text color={theme.colors.statusBlocked} bold> Blocks:</Text>
          {issue.blocks.map(id => {
            const blocked = data.byId.get(id);
            return (
              <Text key={id} color={theme.colors.statusBlocked}>
                {'  '}• {blocked ? blocked.title.slice(0, 30) : id}
                {blocked && <Text color={theme.colors.textDim}> ({blocked.status})</Text>}
              </Text>
            );
          })}
        </Box>
      )}

      {issue.parent && (() => {
        const parent = data.byId.get(issue.parent);
        const isParentEpic = parent?.issue_type === 'epic';
        const parentLabel = isParentEpic ? 'Epic' : 'Ticket';
        const parentColor = isParentEpic ? 'magenta' : '#FFA500';
        return (
          <Text>
            <Text> </Text>
            <Text color={parentColor} bold>{parentLabel}</Text>
            <Text color={theme.colors.textDim}>: {parent?.title || issue.parent}</Text>
          </Text>
        );
      })()}

      {/* Description - fills remaining space with markdown */}
      {issue.description && (
        <DescriptionBox description={issue.description} theme={theme} maxLines={descriptionMaxLines} contentWidth={contentWidth} />
      )}

      {/* Spacer to push footer to bottom */}
      <Box flexGrow={1} />

      {/* Compact timestamp */}
      <Text color={theme.colors.textDim} dimColor>
        {' '}Updated: {new Date(issue.updated_at).toLocaleString()}
      </Text>

      {/* Actions hint */}
      <Text color={theme.colors.textDim} dimColor> Enter: full | i: copy | e: edit | x: export</Text>
    </Box>
  );
}
