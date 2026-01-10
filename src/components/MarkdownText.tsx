import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import wrapAnsi from 'wrap-ansi';

// Configure marked-terminal without reflowText - we'll wrap with wrap-ansi
marked.use(markedTerminal({
  reflowText: false,
  showSectionPrefix: false,
  tab: 2,
}));

// Export function to render markdown to string
export function renderMarkdown(text: string): string {
  const rendered = marked.parse(text, { async: false }) as string;
  // Clean up extra newlines
  return rendered.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}

// Export function to render markdown and split into lines
// If width is provided, wrap lines to that width (ANSI-aware)
export function renderMarkdownLines(text: string, width?: number): string[] {
  const rendered = renderMarkdown(text);
  if (width && width > 0) {
    // Use wrap-ansi with trim: false to preserve indentation
    // This handles ANSI codes correctly
    const wrapped = wrapAnsi(rendered, width, { hard: true, trim: false });
    return wrapped.split('\n');
  }
  return rendered.split('\n');
}

interface MarkdownTextProps {
  children: string;
}

export function MarkdownText({ children }: MarkdownTextProps) {
  const rendered = renderMarkdown(children);
  return <Text>{rendered}</Text>;
}
