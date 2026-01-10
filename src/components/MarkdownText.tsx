import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked-terminal without reflowText - let Ink handle wrapping
marked.use(markedTerminal({
  reflowText: false,
  showSectionPrefix: false,
  tab: 2,
}));

// Export function to render markdown to string
export function renderMarkdown(text: string, width?: number): string {
  const rendered = marked.parse(text, { async: false }) as string;
  // Clean up extra newlines
  return rendered.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}

// Export function to render markdown and split into lines
export function renderMarkdownLines(text: string): string[] {
  const rendered = renderMarkdown(text);
  return rendered.split('\n');
}

interface MarkdownTextProps {
  children: string;
}

export function MarkdownText({ children }: MarkdownTextProps) {
  const rendered = renderMarkdown(children);
  return <Text>{rendered}</Text>;
}
