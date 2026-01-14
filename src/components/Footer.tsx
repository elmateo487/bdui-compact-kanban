import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

interface FooterProps {
  currentView: 'kanban';
}

export function Footer({ currentView }: FooterProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const notificationsEnabled = useBeadsStore(state => state.notificationsEnabled);
  const showBlockedColumn = useBeadsStore(state => state.showBlockedColumn);
  const theme = getTheme(currentTheme);

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text color={theme.colors.textDim}>
        (:) cmd | (b)locked:{showBlockedColumn ? 'ON' : 'off'} | (h)elp | (q)uit
      </Text>
      <Text color={notificationsEnabled ? theme.colors.success : theme.colors.textDim}>
        (n)otif:{notificationsEnabled ? 'ON' : 'off'}
      </Text>
    </Box>
  );
}
