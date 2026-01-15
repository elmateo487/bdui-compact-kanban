import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function HelpOverlay() {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={theme.colors.primary}
        padding={2}
        backgroundColor="black"
      >
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>BD TUI - Keyboard Shortcuts</Text>
        </Box>

        <Box flexDirection="column" gap={0}>
          <Text bold color={theme.colors.warning}>Navigation:</Text>
          <Text>  <Text color={theme.colors.primary}>↑↓</Text>              Move up/down in column</Text>
          <Text>  <Text color={theme.colors.primary}>←→</Text>              Move between columns</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Detail Panel:</Text>
          <Text>  <Text color={theme.colors.primary}>Space</Text>           Toggle detail panel</Text>
          <Text>  <Text color={theme.colors.primary}>Enter</Text>           Open full detail view</Text>
          <Text>  <Text color={theme.colors.primary}>ESC</Text>             Close full detail / go back</Text>
          <Text>  <Text color={theme.colors.primary}>Tab</Text>             Switch description / subtasks</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Actions:</Text>
          <Text>  <Text color={theme.colors.primary}>i</Text>               Copy issue ID to clipboard</Text>
          <Text>  <Text color={theme.colors.primary}>N</Text>               Create new issue (Shift+N)</Text>
          <Text>  <Text color={theme.colors.primary}>e</Text>               Edit selected issue</Text>
          <Text>  <Text color={theme.colors.primary}>x</Text>               Export/copy selected issue</Text>
          <Text>  <Text color={theme.colors.primary}>⌥r</Text>              Refresh data (Option+R)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>View Options:</Text>
          <Text>  <Text color={theme.colors.primary}>r</Text>               Toggle Recent column</Text>
          <Text>  <Text color={theme.colors.primary}>b</Text>               Toggle Blocked column</Text>
          <Text>  <Text color={theme.colors.primary}>p</Text>               Toggle Parents only</Text>
          <Text>  <Text color={theme.colors.primary}>Tab</Text>             Cycle columns</Text>
          <Text>  <Text color={theme.colors.primary}>T</Text>               Dashboard view (Shift+T)</Text>
          <Text>  <Text color={theme.colors.primary}>t</Text>               Change theme</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Other:</Text>
          <Text>  <Text color={theme.colors.primary}>n</Text>               Toggle notifications</Text>
          <Text>  <Text color={theme.colors.primary}>h</Text>               Toggle this help</Text>
          <Text>  <Text color={theme.colors.primary}>q</Text>               Quit</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor={theme.colors.border} paddingTop={1}>
          <Text bold color={theme.colors.warning}>Command Bar (:)</Text>
          <Text>  <Text color={theme.colors.primary}>:5</Text>              Jump to page 5</Text>
          <Text>  <Text color={theme.colors.primary}>:bd-xxx</Text>         Jump to issue by ID</Text>
          <Text>  <Text color={theme.colors.primary}>:s o/i/b/c</Text>      Set status (open/in_progress/blocked/closed)</Text>
          <Text>  <Text color={theme.colors.primary}>:p 0-4</Text>          Set priority</Text>
          <Text>  <Text color={theme.colors.primary}>:theme name</Text>     Change theme</Text>
          <Text>  <Text color={theme.colors.primary}>:new :edit :q</Text>   Create, edit, quit</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor={theme.colors.border} paddingTop={1}>
          <Text bold color={theme.colors.warning}>Forms:</Text>
          <Text color={theme.colors.textDim}>  Tab / Shift+Tab   Navigate fields</Text>
          <Text color={theme.colors.textDim}>  ↑↓                Change priority/status/type</Text>
          <Text color={theme.colors.textDim}>  Enter             Submit</Text>
          <Text color={theme.colors.textDim}>  ESC               Cancel</Text>
        </Box>

        <Box marginTop={2} justifyContent="center">
          <Text color={theme.colors.textDim}>Press ? to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
