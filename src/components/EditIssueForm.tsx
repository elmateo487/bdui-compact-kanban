import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { updateIssue, type UpdateIssueParams } from '../bd/commands';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';

interface EditIssueFormProps {
  issue: Issue;
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'description' | 'priority' | 'status' | 'assignee' | 'labels';

const STATUSES: Array<'open' | 'closed' | 'in_progress' | 'blocked'> = ['open', 'in_progress', 'blocked', 'closed'];

export function EditIssueForm({ issue, onClose, onSuccess }: EditIssueFormProps) {
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);

  const [currentField, setCurrentField] = useState<FormField>('title');
  const [formData, setFormData] = useState({
    title: issue.title,
    description: issue.description || '',
    priority: issue.priority,
    status: issue.status,
    assignee: issue.assignee || '',
    labels: issue.labels?.join(', ') || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: FormField[] = ['title', 'description', 'priority', 'status', 'assignee', 'labels'];
  const currentFieldIndex = fields.indexOf(currentField);

  useInput((input, key) => {
    // ESC to close
    if (key.escape) {
      onClose();
      return;
    }

    // Tab to next field
    if (key.tab && !key.shift) {
      if (currentFieldIndex < fields.length - 1) {
        setCurrentField(fields[currentFieldIndex + 1]);
      }
      return;
    }

    // Shift+Tab to previous field
    if (key.tab && key.shift) {
      if (currentFieldIndex > 0) {
        setCurrentField(fields[currentFieldIndex - 1]);
      }
      return;
    }

    // Enter to submit
    if (key.return && !isSubmitting) {
      handleSubmit();
      return;
    }

    // Handle input for text fields
    if (currentField === 'title' || currentField === 'description' || currentField === 'assignee' || currentField === 'labels') {
      if (key.backspace || key.delete) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField].slice(0, -1),
        });
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField] + input,
        });
      }
      return;
    }

    // Navigation for priority field
    if (currentField === 'priority') {
      if (key.upArrow && formData.priority < 4) {
        setFormData({ ...formData, priority: formData.priority + 1 });
      } else if (key.downArrow && formData.priority > 0) {
        setFormData({ ...formData, priority: formData.priority - 1 });
      }
      return;
    }

    // Navigation for status field
    if (currentField === 'status') {
      const currentIndex = STATUSES.indexOf(formData.status);
      if (key.upArrow && currentIndex > 0) {
        setFormData({ ...formData, status: STATUSES[currentIndex - 1] });
      } else if (key.downArrow && currentIndex < STATUSES.length - 1) {
        setFormData({ ...formData, status: STATUSES[currentIndex + 1] });
      }
      return;
    }
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse labels from comma-separated input
      const labels = formData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const params: UpdateIssueParams = {
        id: issue.id,
      };

      // Only include changed fields
      if (formData.title !== issue.title) {
        params.title = formData.title;
      }
      if (formData.description !== (issue.description || '')) {
        params.description = formData.description;
      }
      if (formData.priority !== issue.priority) {
        params.priority = formData.priority;
      }
      if (formData.status !== issue.status) {
        params.status = formData.status;
      }
      if (formData.assignee !== (issue.assignee || '')) {
        params.assignee = formData.assignee || undefined;
      }

      const currentLabels = issue.labels?.join(', ') || '';
      if (formData.labels !== currentLabels) {
        params.labels = labels;
      }

      await updateIssue(params);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue');
      setIsSubmitting(false);
    }
  };

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="space-between">
          <Text bold color="yellow">
            Edit Issue: {issue.id}
          </Text>
          <Text dimColor>
            {terminalWidth}x{terminalHeight}
          </Text>
        </Box>
        <Text dimColor>
          ESC to cancel | Tab/Shift+Tab to navigate fields | Enter to submit
        </Text>
      </Box>

      {/* Form Content */}
      <Box flexDirection="column" padding={2} borderStyle="single" borderColor="yellow">
        {/* Title */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'title' ? 'yellow' : 'white'} bold>
            Title {currentField === 'title' && <Text color="yellow">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'title' ? 'yellow' : 'gray'} paddingX={1}>
            <Text>{formData.title}</Text>
            {currentField === 'title' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Description */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'description' ? 'yellow' : 'white'} bold>
            Description {currentField === 'description' && <Text color="yellow">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'description' ? 'yellow' : 'gray'} paddingX={1}>
            <Text>{formData.description || <Text dimColor>(no description)</Text>}</Text>
            {currentField === 'description' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Priority, Status, and Type in a row */}
        <Box gap={4} marginBottom={2}>
          {/* Priority */}
          <Box flexDirection="column" width="33%">
            <Text color={currentField === 'priority' ? 'yellow' : 'white'} bold>
              Priority {currentField === 'priority' && <Text color="yellow">(use ↑/↓)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'priority' ? 'yellow' : 'gray'} paddingX={1}>
              <Text>
                P{formData.priority} - {getPriorityLabel(formData.priority)}
              </Text>
            </Box>
          </Box>

          {/* Status */}
          <Box flexDirection="column" width="33%">
            <Text color={currentField === 'status' ? 'yellow' : 'white'} bold>
              Status {currentField === 'status' && <Text color="yellow">(use ↑/↓)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'status' ? 'yellow' : 'gray'} paddingX={1}>
              <Text>{formData.status}</Text>
            </Box>
          </Box>

          {/* Issue Type (read-only) */}
          <Box flexDirection="column" width="33%">
            <Text color="white" bold>
              Type <Text dimColor>(read-only)</Text>
            </Text>
            <Box borderStyle="single" borderColor="gray" paddingX={1}>
              <Text dimColor>{issue.issueType || 'task'}</Text>
            </Box>
          </Box>
        </Box>

        {/* Assignee */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'assignee' ? 'yellow' : 'white'} bold>
            Assignee {currentField === 'assignee' && <Text color="yellow">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'assignee' ? 'yellow' : 'gray'} paddingX={1}>
            <Text>{formData.assignee || <Text dimColor>(unassigned)</Text>}</Text>
            {currentField === 'assignee' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Labels */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'labels' ? 'yellow' : 'white'} bold>
            Labels {currentField === 'labels' && <Text color="yellow">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'labels' ? 'yellow' : 'gray'} paddingX={1}>
            <Text>{formData.labels || <Text dimColor>(no labels - comma-separated)</Text>}</Text>
            {currentField === 'labels' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Status messages */}
        {error && (
          <Box marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
            <Text color="red" bold>Error: </Text>
            <Text color="red">{error}</Text>
          </Box>
        )}

        {isSubmitting && (
          <Box marginTop={1}>
            <Text color="yellow">Updating issue...</Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box justifyContent="space-between">
          <Text dimColor>
            Tab/Shift+Tab: Navigate | ↑/↓: Change values | Enter: Submit | ESC: Cancel
          </Text>
          <Text color="yellow">
            Field {currentFieldIndex + 1}/{fields.length}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function getPriorityLabel(priority: number): string {
  const labels = ['Lowest', 'Low', 'Medium', 'High', 'Critical'];
  return labels[priority] || 'Unknown';
}
