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
import { Toast } from './Toast';

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

  // Calculate content width: terminalWidth - outer border(4) - padding(2) - desc box border(2) - leading space(1)
  const contentWidth = terminalWidth - 9;

  // Render markdown and get lines for pagination
  const descriptionLines = useMemo(() => {
    if (!issue.description) return [];
    return renderMarkdownLines(issue.description, contentWidth);
  }, [issue.description, contentWidth]);

  // Calculate available height for description and subtasks
  // Fixed overhead: border (4), padding (2), header (2-3), metadata (1), labels (0-1),
  // footer with timestamp+hints (2), margins (2 for description marginTop + subtasks marginTop)
  const headerLines = 2 + (issue.parent ? 1 : 0); // title + id + optional parent
  const labelLines = issue.labels?.length ? 1 : 0;
  const subtasksHeaderLines = totalSubtasks > 0 ? 1 : 0;
  const fixedOverhead = 4 + 2 + headerLines + 1 + labelLines + 2 + 2; // border + padding + header + metadata + labels + footer + margins
  const descriptionBoxOverhead = issue.description ? 2 : 0; // border top/bottom for description box

  // Available space for both description and subtasks content
  const availableContentHeight = terminalHeight - fixedOverhead - descriptionBoxOverhead - subtasksHeaderLines;

  // Description gets minimum of 1/3 screen or 10 lines, whichever is larger
  const minDescriptionLines = Math.max(10, Math.floor(terminalHeight / 3));

  // If we have subtasks, description gets its minimum, subtasks get the rest
  // If no subtasks, description gets all available space
  const maxDescriptionLines = totalSubtasks > 0
    ? minDescriptionLines
    : Math.max(3, availableContentHeight);

  // Subtasks get ALL remaining space after description
  const maxVisibleSubtasks = Math.max(3, availableContentHeight - maxDescriptionLines);

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

  // Determine hierarchy-aware type label: Epic, Ticket, or Acceptance Criteria
  const getHierarchyLabel = (): { label: string; color: string } => {
    if (issue.issue_type === 'epic') return { label: 'Epic', color: 'magenta' };
    if (issue.parent) {
      const parent = data.byId.get(issue.parent);
      if (parent?.issue_type === 'epic') return { label: 'Ticket', color: '#FFA500' }; // orange
      return { label: 'Acceptance Criteria', color: 'yellow' };
    }
    return { label: 'Ticket', color: '#FFA500' }; // Root-level non-epic is a ticket
  };
  const hierarchy = getHierarchyLabel();

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
        {issue.parent && (() => {
          const parent = data.byId.get(issue.parent);
          if (!parent) return null;
          const isParentEpic = parent.issue_type === 'epic';
          const parentLabel = isParentEpic ? 'Epic' : 'Ticket';
          const parentLabelColor = isParentEpic ? 'magenta' : '#FFA500'; // purple for epic, orange for ticket
          return (
            <Text>
              <Text color={parentLabelColor} bold>{parentLabel}</Text>
              <Text color={theme.colors.textDim}>: {parent.title}</Text>
            </Text>
          );
        })()}
      </Box>

      {/* Metadata line */}
      <Text>
        <Text color={hierarchy.color} bold>{hierarchy.label}</Text>
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
            <Text color={completedSubtasks > 0 ? theme.colors.success : theme.colors.textDim}>
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

      {/* Blocking info - show when status is blocked or has blockedBy */}
      {(issue.status === 'blocked' || (issue.blockedBy && issue.blockedBy.length > 0)) && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={theme.colors.statusBlocked}>
          <Text color={theme.colors.statusBlocked} bold> ⚠ BLOCKED</Text>
          {issue.blockedBy && issue.blockedBy.length > 0 && (
            <Box flexDirection="column">
              <Text color={theme.colors.textDim}> Waiting on:</Text>
              {issue.blockedBy.map(id => {
                const blocker = data.byId.get(id);
                return (
                  <Text key={id} color={theme.colors.statusBlocked}>
                    {' '} • {blocker ? blocker.title.slice(0, 50) : id}
                    {blocker && <Text color={theme.colors.textDim}> ({blocker.status})</Text>}
                  </Text>
                );
              })}
            </Box>
          )}
          {issue.status === 'blocked' && (!issue.blockedBy || issue.blockedBy.length === 0) && (
            <Text color={theme.colors.textDim}> Needs human decision (check comments)</Text>
          )}
        </Box>
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

      {/* Subtasks list - navigable with scrolling */}
      {issue.children && issue.children.length > 0 && (() => {
        // Calculate visible window of subtasks centered around selected item
        const effectiveMaxVisible = maxVisibleSubtasks - (totalSubtasks > maxVisibleSubtasks ? 2 : 0); // Account for scroll indicators
        let subtaskScrollOffset = 0;
        if (totalSubtasks > effectiveMaxVisible && selectedSubtask >= 0) {
          // Center the selected item in the visible window
          subtaskScrollOffset = Math.max(0, Math.min(
            selectedSubtask - Math.floor(effectiveMaxVisible / 2),
            totalSubtasks - effectiveMaxVisible
          ));
        }
        const visibleChildren = issue.children.slice(subtaskScrollOffset, subtaskScrollOffset + effectiveMaxVisible);
        const canScrollSubtasksUp = subtaskScrollOffset > 0;
        const canScrollSubtasksDown = subtaskScrollOffset + effectiveMaxVisible < totalSubtasks;

        // Label based on issue type: epics have Tickets, tickets have Acceptance Criteria
        const isEpic = issue.issue_type === 'epic';
        const childrenLabel = isEpic ? 'Tickets' : 'Acceptance Criteria';
        const childrenColor = isEpic ? '#FFA500' : 'yellow'; // orange for tickets, yellow for ACs

        return (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color={childrenColor}>{childrenLabel} ({completedSubtasks}/{totalSubtasks})</Text>
            {canScrollSubtasksUp && (
              <Text color={theme.colors.primary}> ▲ {subtaskScrollOffset} more above</Text>
            )}
            {visibleChildren.map((id) => {
              const index = issue.children!.indexOf(id);
              const child = data.byId.get(id);
              if (!child) return <Text key={id} color={theme.colors.textDim}>  ? {id}</Text>;
              const isDone = child.status === 'closed';
              const isSelected = index === selectedSubtask;
              const statusIcon = isDone ? '[x]' : '[ ]';
              const baseColor = isDone ? theme.colors.success : theme.colors.text;
              const color = isSelected ? theme.colors.primary : baseColor;

              // Count child's subtasks completion
              let childCompleted = 0;
              const childTotal = child.children?.length || 0;
              if (child.children) {
                for (const grandchildId of child.children) {
                  const grandchild = data.byId.get(grandchildId);
                  if (grandchild && grandchild.status === 'closed') {
                    childCompleted++;
                  }
                }
              }
              const hasSubtasks = childTotal > 0;
              const subtasksComplete = hasSubtasks && childCompleted === childTotal;

              return (
                <Text key={id}>
                  <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>{isSelected ? '>' : ' '} </Text>
                  <Text color={color}>{statusIcon} </Text>
                  <Text color={isSelected ? theme.colors.primary : theme.colors.textDim}>{child.id}: </Text>
                  <Text color={color} bold={isSelected}>{child.title}</Text>
                  {hasSubtasks && (
                    <Text color={childCompleted > 0 ? theme.colors.success : theme.colors.textDim}> {childCompleted}/{childTotal}</Text>
                  )}
                  {!isDone && !hasSubtasks && <Text color={theme.colors.textDim}> ({child.status})</Text>}
                </Text>
              );
            })}
            {canScrollSubtasksDown && (
              <Text color={theme.colors.primary}> ▼ {totalSubtasks - subtaskScrollOffset - effectiveMaxVisible} more below</Text>
            )}
          </Box>
        );
      })()}

      {/* Spacer to push footer to bottom */}
      <Box flexGrow={1} />

      {/* Footer - pinned to bottom */}
      <Box flexDirection="column">
        <Text color={theme.colors.textDim} dimColor>
          Created: {new Date(issue.created_at).toLocaleString()} | Updated: {new Date(issue.updated_at).toLocaleString()}
        </Text>
        <Text color={theme.colors.textDim}>
          ESC: {stackDepth > 1 ? 'back' : 'close'} | i: copy | Tab: {isInDescriptionMode ? (issue.issue_type === 'epic' ? 'tickets' : 'ACs') : 'description'} | Up/Down: {isInDescriptionMode ? 'scroll' : 'select'} | Enter: view
          {stackDepth > 1 && <Text color={theme.colors.secondary}> | Depth: {stackDepth}</Text>}
        </Text>
      </Box>

      {/* Toast message - rendered last to appear on top */}
      <Toast />
    </Box>
  );
}
