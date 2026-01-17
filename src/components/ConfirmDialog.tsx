import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function ConfirmDialog() {
  const showConfirmDialog = useBeadsStore(state => state.showConfirmDialog);
  const confirmDialogData = useBeadsStore(state => state.confirmDialogData);
  const hideConfirm = useBeadsStore(state => state.hideConfirm);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const theme = getTheme(currentTheme);

  useInput((input, key) => {
    if (!showConfirmDialog) return;

    if (key.escape || input.toLowerCase() === 'n') {
      hideConfirm();
      return;
    }

    if (input.toLowerCase() === 'y' || key.return) {
      if (confirmDialogData?.onConfirm) {
        confirmDialogData.onConfirm();
      }
      hideConfirm();
    }
  });

  if (!showConfirmDialog || !confirmDialogData) return null;

  const dialogWidth = 50;
  const dialogHeight = 10; // Approximate height including border
  const bgColor = theme.colors.background;

  // Center the dialog
  const top = Math.max(0, Math.floor((terminalHeight - dialogHeight) / 2));
  const left = Math.max(0, Math.floor((terminalWidth - dialogWidth) / 2));

  // Helper to pad text to fill width with background
  const padLine = (content: string, width: number) => {
    const padding = Math.max(0, width - content.length);
    return content + ' '.repeat(padding);
  };

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.colors.warning}
      width={dialogWidth}
    >
      {/* Title row with background */}
      <Text backgroundColor={bgColor} color={theme.colors.warning} bold>
        {padLine(`  ${confirmDialogData.title}`, dialogWidth - 2)}
      </Text>

      {/* Empty row */}
      <Text backgroundColor={bgColor}>{padLine('', dialogWidth - 2)}</Text>

      {/* Message row */}
      <Text backgroundColor={bgColor}>
        {padLine(`  ${confirmDialogData.message}`, dialogWidth - 2)}
      </Text>

      {/* Empty row */}
      <Text backgroundColor={bgColor}>{padLine('', dialogWidth - 2)}</Text>

      {/* Buttons row */}
      <Text backgroundColor={bgColor}>
        {padLine('', 10)}
        <Text color={theme.colors.success} backgroundColor={bgColor} bold>[Y]</Text>
        <Text backgroundColor={bgColor}> Yes    </Text>
        <Text color={theme.colors.error} backgroundColor={bgColor} bold>[N]</Text>
        <Text backgroundColor={bgColor}> No</Text>
        {padLine('', 10)}
      </Text>

      {/* Empty row */}
      <Text backgroundColor={bgColor}>{padLine('', dialogWidth - 2)}</Text>

      {/* Help text row */}
      <Text backgroundColor={bgColor} dimColor>
        {padLine('  Press Y to confirm, N or ESC to cancel', dialogWidth - 2)}
      </Text>

      {/* Bottom padding */}
      <Text backgroundColor={bgColor}>{padLine('', dialogWidth - 2)}</Text>
    </Box>
  );
}
