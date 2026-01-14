import { writeFile } from 'fs/promises';
import { writeFileSync } from 'fs';
import type { Issue } from '../types';

/**
 * Format issue as markdown
 */
export function formatIssueMarkdown(issue: Issue): string {
  const lines: string[] = [];

  lines.push(`# ${issue.title}`);
  lines.push('');
  lines.push(`**ID:** ${issue.id}`);
  lines.push(`**Status:** ${issue.status}`);
  lines.push(`**Priority:** P${issue.priority}`);
  lines.push(`**Type:** ${issue.issue_type}`);

  if (issue.assignee) {
    lines.push(`**Assignee:** ${issue.assignee}`);
  }

  if (issue.labels && issue.labels.length > 0) {
    lines.push(`**Labels:** ${issue.labels.join(', ')}`);
  }

  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(issue.description || '(no description)');

  if (issue.parent) {
    lines.push('');
    lines.push('## Parent');
    lines.push('');
    lines.push(issue.parent);
  }

  if (issue.children && issue.children.length > 0) {
    lines.push('');
    lines.push('## Children');
    lines.push('');
    for (const child of issue.children) {
      lines.push(`- ${child}`);
    }
  }

  if (issue.blockedBy && issue.blockedBy.length > 0) {
    lines.push('');
    lines.push('## Blocked By');
    lines.push('');
    for (const blocker of issue.blockedBy) {
      lines.push(`- ${blocker}`);
    }
  }

  if (issue.blocks && issue.blocks.length > 0) {
    lines.push('');
    lines.push('## Blocks');
    lines.push('');
    for (const blocked of issue.blocks) {
      lines.push(`- ${blocked}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push(`Created: ${issue.created_at}`);
  lines.push(`Updated: ${issue.updated_at}`);
  if (issue.closed_at) {
    lines.push(`Closed: ${issue.closed_at}`);
  }

  return lines.join('\n');
}

/**
 * Format issue as JSON
 */
export function formatIssueJSON(issue: Issue): string {
  return JSON.stringify(issue, null, 2);
}

/**
 * Format issue as plain text
 */
export function formatIssuePlainText(issue: Issue): string {
  const lines: string[] = [];

  lines.push(issue.title);
  lines.push('='.repeat(issue.title.length));
  lines.push('');
  lines.push(`ID: ${issue.id}`);
  lines.push(`Status: ${issue.status}`);
  lines.push(`Priority: P${issue.priority}`);
  lines.push(`Type: ${issue.issue_type}`);

  if (issue.assignee) {
    lines.push(`Assignee: ${issue.assignee}`);
  }

  if (issue.labels && issue.labels.length > 0) {
    lines.push(`Labels: ${issue.labels.join(', ')}`);
  }

  lines.push('');
  lines.push('Description:');
  lines.push(issue.description || '(no description)');

  if (issue.parent) {
    lines.push('');
    lines.push(`Parent: ${issue.parent}`);
  }

  if (issue.children && issue.children.length > 0) {
    lines.push('');
    lines.push('Children:');
    for (const child of issue.children) {
      lines.push(`  - ${child}`);
    }
  }

  if (issue.blockedBy && issue.blockedBy.length > 0) {
    lines.push('');
    lines.push('Blocked By:');
    for (const blocker of issue.blockedBy) {
      lines.push(`  - ${blocker}`);
    }
  }

  if (issue.blocks && issue.blocks.length > 0) {
    lines.push('');
    lines.push('Blocks:');
    for (const blocked of issue.blocks) {
      lines.push(`  - ${blocked}`);
    }
  }

  lines.push('');
  lines.push(`Created: ${issue.created_at}`);
  lines.push(`Updated: ${issue.updated_at}`);
  if (issue.closed_at) {
    lines.push(`Closed: ${issue.closed_at}`);
  }

  return lines.join('\n');
}

/** Path where copied IDs are saved */
export const CLIPBOARD_FILE = '/tmp/bd-id';

/**
 * Copy text to clipboard using OSC 52 escape sequence.
 * Works over SSH and through tmux (with set-clipboard on).
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Also save to file as backup
  writeFileSync(CLIPBOARD_FILE, text, 'utf-8');

  // OSC 52 escape sequence
  const b64 = Buffer.from(text).toString('base64');
  const osc52 = `\x1b]52;c;${b64}\x07`;

  // Write to stdout
  process.stdout.write(osc52);
}

/**
 * Export issue to file
 */
export async function exportToFile(
  issue: Issue,
  format: 'markdown' | 'json' | 'text' = 'markdown'
): Promise<string> {
  let content: string;
  let extension: string;

  switch (format) {
    case 'markdown':
      content = formatIssueMarkdown(issue);
      extension = 'md';
      break;
    case 'json':
      content = formatIssueJSON(issue);
      extension = 'json';
      break;
    case 'text':
      content = formatIssuePlainText(issue);
      extension = 'txt';
      break;
  }

  const filename = `${issue.id}.${extension}`;
  await writeFile(filename, content, 'utf-8');

  return filename;
}
