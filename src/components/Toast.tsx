import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function Toast() {
  const toastMessage = useBeadsStore(state => state.toastMessage);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const theme = getTheme(currentTheme);

  if (!toastMessage) return null;

  const colorMap = {
    success: theme.colors.success,
    error: theme.colors.error,
    info: theme.colors.primary,
  };

  const iconMap = {
    success: '[OK]',
    error: '[!]',
    info: '[i]',
  };

  const color = colorMap[toastMessage.type];
  const icon = iconMap[toastMessage.type];

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        borderStyle="double"
        borderColor={color}
        paddingX={4}
        paddingY={1}
        backgroundColor="black"
      >
        <Text color={color} bold>
          {icon} {toastMessage.message}
        </Text>
      </Box>
    </Box>
  );
}
