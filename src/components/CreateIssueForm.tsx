import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { createIssue, type CreateIssueParams } from '../bd/commands';
import { useBeadsStore } from '../state/store';

interface CreateIssueFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'description' | 'priority' | 'type' | 'assignee' | 'labels';

const ISSUE_TYPES: Array<'task' | 'epic' | 'bug' | 'feature' | 'chore'> = ['task', 'epic', 'bug', 'feature', 'chore'];

export function CreateIssueForm({ onClose, onSuccess }: CreateIssueFormProps) {
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);

  const [currentField, setCurrentField] = useState<FormField>('title');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 2,
    issueType: 'task' as 'task' | 'epic' | 'bug' | 'feature' | 'chore',
    assignee: '',
    labels: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: FormField[] = ['title', 'description', 'priority', 'type', 'assignee', 'labels'];
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

    // Navigation for type field
    if (currentField === 'type') {
      const currentIndex = ISSUE_TYPES.indexOf(formData.issueType);
      if (key.upArrow && currentIndex > 0) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex - 1] });
      } else if (key.downArrow && currentIndex < ISSUE_TYPES.length - 1) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex + 1] });
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

      await createIssue({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        issueType: formData.issueType,
        assignee: formData.assignee.trim() || undefined,
        labels: labels.length > 0 ? labels : undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
      setIsSubmitting(false);
    }
  };

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            Create New Issue
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
      <Box flexDirection="column" padding={2} borderStyle="single" borderColor="cyan">
        {/* Title */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'title' ? 'cyan' : 'white'} bold>
            Title {currentField === 'title' && <Text color="cyan">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'title' ? 'cyan' : 'gray'} paddingX={1}>
            <Text>{formData.title || <Text dimColor>(enter issue title)</Text>}</Text>
            {currentField === 'title' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Description */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'description' ? 'cyan' : 'white'} bold>
            Description {currentField === 'description' && <Text color="cyan">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'description' ? 'cyan' : 'gray'} paddingX={1}>
            <Text>{formData.description || <Text dimColor>(optional - enter issue description)</Text>}</Text>
            {currentField === 'description' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Priority and Type in a row */}
        <Box gap={4} marginBottom={2}>
          {/* Priority */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'priority' ? 'cyan' : 'white'} bold>
              Priority {currentField === 'priority' && <Text color="cyan">(use ↑/↓)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'priority' ? 'cyan' : 'gray'} paddingX={1}>
              <Text>
                P{formData.priority} - {getPriorityLabel(formData.priority)}
              </Text>
            </Box>
          </Box>

          {/* Issue Type */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'type' ? 'cyan' : 'white'} bold>
              Type {currentField === 'type' && <Text color="cyan">(use ↑/↓)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'type' ? 'cyan' : 'gray'} paddingX={1}>
              <Text>{formData.issueType}</Text>
            </Box>
          </Box>
        </Box>

        {/* Assignee */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'assignee' ? 'cyan' : 'white'} bold>
            Assignee {currentField === 'assignee' && <Text color="cyan">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'assignee' ? 'cyan' : 'gray'} paddingX={1}>
            <Text>{formData.assignee || <Text dimColor>(optional - assign to someone)</Text>}</Text>
            {currentField === 'assignee' && <Text dimColor>█</Text>}
          </Box>
        </Box>

        {/* Labels */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={currentField === 'labels' ? 'cyan' : 'white'} bold>
            Labels {currentField === 'labels' && <Text color="cyan">(editing)</Text>}
          </Text>
          <Box borderStyle="single" borderColor={currentField === 'labels' ? 'cyan' : 'gray'} paddingX={1}>
            <Text>{formData.labels || <Text dimColor>(optional - comma-separated labels)</Text>}</Text>
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
            <Text color="yellow">Creating issue...</Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box justifyContent="space-between">
          <Text dimColor>
            Tab/Shift+Tab: Navigate | ↑/↓: Change values | Enter: Submit | ESC: Cancel
          </Text>
          <Text color="cyan">
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
