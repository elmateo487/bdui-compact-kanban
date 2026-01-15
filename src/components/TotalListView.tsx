import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { copyToClipboard } from '../utils/export';

interface TotalListViewProps {
  terminalWidth: number;
  terminalHeight: number;
}

type Section = 'active' | 'completed' | 'problems';

interface DiagnosticIssue {
  issue: Issue;
  problems: string[];
}

export function TotalListView({ terminalWidth, terminalHeight }: TotalListViewProps) {
  const data = useBeadsStore(state => state.data);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const showToast = useBeadsStore(state => state.showToast);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const [activeSection, setActiveSection] = useState<Section>('active');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Categorize all issues
  const categorized = useMemo(() => {
    const epics: Issue[] = [];
    const tickets: Issue[] = [];
    const orphanedACs: DiagnosticIssue[] = [];
    const missingParent: DiagnosticIssue[] = [];
    const noType: DiagnosticIssue[] = [];
    const blocked: Issue[] = [];

    const allIssues = data.issues;

    for (const issue of allIssues) {
      const typeLabel = issue.labels?.find(l => l.startsWith('type:'));
      const issueType = typeLabel?.replace('type:', '') || issue.issue_type || 'unknown';

      // Categorize by type
      if (issueType === 'epic') {
        epics.push(issue);
      } else if (issueType === 'ticket') {
        tickets.push(issue);
      }

      // Check for problems
      const problems: string[] = [];

      // Orphaned AC: has type:ac label but no parent
      if (issueType === 'ac' && !issue.parent) {
        problems.push('Orphaned AC - no parent');
      }

      // Has parent reference but parent doesn't exist
      if (issue.parent && !data.byId.has(issue.parent)) {
        problems.push(`Missing parent: ${issue.parent}`);
      }

      // AC or ticket without parent (should have one)
      if ((issueType === 'ac' || issueType === 'ticket') && !issue.parent) {
        if (issueType === 'ac') {
          orphanedACs.push({ issue, problems: ['AC without parent epic/ticket'] });
        }
      }

      // No type label and no issue_type
      if (!typeLabel && !issue.issue_type) {
        noType.push({ issue, problems: ['No type defined'] });
      }

      // Blocked issues
      if (issue.status === 'blocked') {
        blocked.push(issue);
      }

      // Missing parent reference
      if (issue.parent && !data.byId.has(issue.parent)) {
        missingParent.push({ issue, problems: [`Parent ${issue.parent} not found`] });
      }
    }

    // Sort epics and tickets by created date (newest first)
    const sortByCreated = (a: Issue, b: Issue) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    epics.sort(sortByCreated);
    tickets.sort(sortByCreated);

    return {
      activeEpics: epics.filter(e => e.status !== 'closed'),
      completedEpics: epics.filter(e => e.status === 'closed'),
      activeTickets: tickets.filter(t => t.status !== 'closed'),
      completedTickets: tickets.filter(t => t.status === 'closed'),
      orphanedACs,
      missingParent,
      noType,
      blocked,
    };
  }, [data]);

  // Build display items based on active section
  const displayItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'epic' | 'ticket' | 'child' | 'problem'; content: string; issue?: Issue; indent?: number; problems?: string[] }> = [];

    if (activeSection === 'active') {
      // Active Epics with their children
      if (categorized.activeEpics.length > 0) {
        items.push({ type: 'header', content: `ACTIVE EPICS (${categorized.activeEpics.length})` });
        for (const epic of categorized.activeEpics) {
          items.push({ type: 'epic', content: epic.title, issue: epic });
          // Show children (tickets/ACs)
          if (epic.children && epic.children.length > 0) {
            for (const childId of epic.children) {
              const child = data.byId.get(childId);
              if (child && child.status !== 'closed') {
                items.push({ type: 'child', content: child.title, issue: child, indent: 1 });
              }
            }
          }
        }
      }

      // Active Tickets (without parent - standalone)
      const standaloneTickets = categorized.activeTickets.filter(t => !t.parent);
      if (standaloneTickets.length > 0) {
        items.push({ type: 'header', content: `ACTIVE TICKETS (${standaloneTickets.length})` });
        for (const ticket of standaloneTickets) {
          items.push({ type: 'ticket', content: ticket.title, issue: ticket });
        }
      }

      // Blocked items
      if (categorized.blocked.length > 0) {
        items.push({ type: 'header', content: `⚠ BLOCKED (${categorized.blocked.length})` });
        for (const issue of categorized.blocked) {
          const blockers = issue.blockedBy?.map(id => {
            const blocker = data.byId.get(id);
            return blocker ? blocker.id : id;
          }).join(', ') || 'unknown';
          items.push({
            type: 'problem',
            content: issue.title,
            issue,
            problems: [`Blocked by: ${blockers}`]
          });
        }
      }
    } else if (activeSection === 'completed') {
      // Completed Epics
      if (categorized.completedEpics.length > 0) {
        items.push({ type: 'header', content: `COMPLETED EPICS (${categorized.completedEpics.length})` });
        for (const epic of categorized.completedEpics.slice(0, 50)) { // Limit to 50
          items.push({ type: 'epic', content: epic.title, issue: epic });
        }
        if (categorized.completedEpics.length > 50) {
          items.push({ type: 'header', content: `... and ${categorized.completedEpics.length - 50} more` });
        }
      }

      // Completed Tickets
      const standaloneCompleted = categorized.completedTickets.filter(t => !t.parent);
      if (standaloneCompleted.length > 0) {
        items.push({ type: 'header', content: `COMPLETED TICKETS (${standaloneCompleted.length})` });
        for (const ticket of standaloneCompleted.slice(0, 50)) {
          items.push({ type: 'ticket', content: ticket.title, issue: ticket });
        }
        if (standaloneCompleted.length > 50) {
          items.push({ type: 'header', content: `... and ${standaloneCompleted.length - 50} more` });
        }
      }
    } else if (activeSection === 'problems') {
      const totalProblems = categorized.orphanedACs.length + categorized.missingParent.length + categorized.noType.length;

      if (totalProblems === 0) {
        items.push({ type: 'header', content: '✓ NO PROBLEMS DETECTED' });
      } else {
        // Orphaned ACs
        if (categorized.orphanedACs.length > 0) {
          items.push({ type: 'header', content: `ORPHANED ACs (${categorized.orphanedACs.length})` });
          for (const { issue, problems } of categorized.orphanedACs) {
            items.push({ type: 'problem', content: issue.title, issue, problems });
          }
        }

        // Missing parent references
        if (categorized.missingParent.length > 0) {
          items.push({ type: 'header', content: `MISSING PARENT (${categorized.missingParent.length})` });
          for (const { issue, problems } of categorized.missingParent) {
            items.push({ type: 'problem', content: issue.title, issue, problems });
          }
        }

        // No type defined
        if (categorized.noType.length > 0) {
          items.push({ type: 'header', content: `NO TYPE DEFINED (${categorized.noType.length})` });
          for (const { issue, problems } of categorized.noType) {
            items.push({ type: 'problem', content: issue.title, issue, problems });
          }
        }
      }
    }

    return items;
  }, [activeSection, categorized, data]);

  // Calculate visible items
  const headerHeight = 5; // Header + tabs + divider
  const footerHeight = 2;
  const visibleHeight = terminalHeight - headerHeight - footerHeight;
  const visibleItems = displayItems.slice(scrollOffset, scrollOffset + visibleHeight);

  // Ensure selected index stays within bounds
  const maxIndex = displayItems.filter(i => i.issue).length - 1;
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, maxIndex));

  // Get selectable items (those with issues) - maps selection index to displayItems index
  const selectableIndices = displayItems.map((item, idx) => item.issue ? idx : -1).filter(i => i >= 0);

  // The currently selected displayItems index
  const selectedDisplayIdx = selectableIndices[clampedSelectedIndex];

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      returnToPreviousView();
      return;
    }

    // Tab/arrows between sections
    if (key.tab || key.leftArrow || key.rightArrow || input === 'h' || input === 'l') {
      const sections: Section[] = ['active', 'completed', 'problems'];
      const currentIdx = sections.indexOf(activeSection);
      const goBack = key.shift || key.leftArrow || input === 'h';
      const nextIdx = goBack
        ? (currentIdx - 1 + sections.length) % sections.length
        : (currentIdx + 1) % sections.length;
      setActiveSection(sections[nextIdx]);
      setScrollOffset(0);
      setSelectedIndex(0);
      return;
    }

    // Number keys for quick section switch
    if (input === '1') {
      setActiveSection('active');
      setScrollOffset(0);
      setSelectedIndex(0);
      return;
    }
    if (input === '2') {
      setActiveSection('completed');
      setScrollOffset(0);
      setSelectedIndex(0);
      return;
    }
    if (input === '3') {
      setActiveSection('problems');
      setScrollOffset(0);
      setSelectedIndex(0);
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      if (clampedSelectedIndex > 0) {
        setSelectedIndex(clampedSelectedIndex - 1);
        // Scroll if needed
        const targetIdx = selectableIndices[clampedSelectedIndex - 1];
        if (targetIdx < scrollOffset) {
          setScrollOffset(targetIdx);
        }
      }
      return;
    }
    if (key.downArrow || input === 'j') {
      if (clampedSelectedIndex < maxIndex) {
        setSelectedIndex(clampedSelectedIndex + 1);
        // Scroll if needed
        const targetIdx = selectableIndices[clampedSelectedIndex + 1];
        if (targetIdx >= scrollOffset + visibleHeight) {
          setScrollOffset(targetIdx - visibleHeight + 1);
        }
      }
      return;
    }

    // Copy issue ID
    if (input === 'i') {
      const selectedItem = selectedDisplayIdx !== undefined ? displayItems[selectedDisplayIdx] : undefined;
      if (selectedItem?.issue) {
        const copyText = `${selectedItem.issue.title} - ${selectedItem.issue.id}`;
        copyToClipboard(copyText)
          .then(() => showToast(`Copied: ${selectedItem.issue!.id}`, 'success'))
          .catch((err) => showToast(`Copy failed: ${err.message}`, 'error'));
      } else {
        showToast('No item selected', 'info');
      }
      return;
    }

    // Page up/down
    if (key.pageUp) {
      setScrollOffset(Math.max(0, scrollOffset - visibleHeight));
      return;
    }
    if (key.pageDown) {
      setScrollOffset(Math.min(Math.max(0, displayItems.length - visibleHeight), scrollOffset + visibleHeight));
      return;
    }
  });

  const getPriorityBadge = (priority: number) => {
    const colors: Record<number, string> = {
      0: theme.colors.priorityCritical,
      1: theme.colors.priorityHigh,
      2: theme.colors.priorityMedium,
      3: theme.colors.priorityLow,
      4: theme.colors.priorityLowest,
    };
    return <Text color={colors[priority] || theme.colors.textDim}>P{priority}</Text>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: theme.colors.statusOpen,
      in_progress: theme.colors.statusInProgress,
      blocked: theme.colors.statusBlocked,
      closed: theme.colors.statusClosed,
    };
    const labels: Record<string, string> = {
      open: 'OPEN',
      in_progress: 'WIP',
      blocked: 'BLKD',
      closed: 'DONE',
    };
    return <Text color={colors[status] || theme.colors.textDim}>{labels[status] || status}</Text>;
  };

  const renderItem = (item: typeof displayItems[0], globalIdx: number) => {
    const isSelected = item.issue && globalIdx === selectedDisplayIdx;
    const indent = item.indent ? '  '.repeat(item.indent) : '';

    if (item.type === 'header') {
      return (
        <Box key={`header-${globalIdx}`} marginTop={globalIdx > 0 ? 1 : 0}>
          <Text bold color={theme.colors.primary}>─── {item.content} </Text>
          <Text color={theme.colors.border}>{'─'.repeat(Math.max(0, terminalWidth - item.content.length - 6))}</Text>
        </Box>
      );
    }

    const issue = item.issue!;
    const prefix = item.type === 'child' ? '└─' : item.type === 'epic' ? '▸' : '•';
    const maxTitleLen = terminalWidth - 35 - (item.indent || 0) * 2;

    return (
      <Box key={issue.id}>
        <Text color={isSelected ? theme.colors.primary : theme.colors.text}>
          {isSelected ? '▶ ' : '  '}
        </Text>
        <Text color={theme.colors.textDim}>{indent}{prefix} </Text>
        <Box width={18}>
          <Text color={isSelected ? theme.colors.primary : theme.colors.text}>
            {issue.id.slice(0, 16)}
          </Text>
        </Box>
        <Box width={5}>
          {getPriorityBadge(issue.priority)}
        </Box>
        <Box width={5}>
          {getStatusBadge(issue.status)}
        </Box>
        <Text wrap="truncate-end" color={isSelected ? theme.colors.text : theme.colors.textDim}>
          {item.content.slice(0, maxTitleLen)}
        </Text>
        {item.problems && item.problems.length > 0 && (
          <Text color={theme.colors.warning}> [{item.problems[0]}]</Text>
        )}
      </Box>
    );
  };

  // Summary stats
  const problemCount = categorized.orphanedACs.length + categorized.missingParent.length + categorized.noType.length;

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header - count only standalone items (tickets with parents are shown under their epic) */}
      <Box justifyContent="space-between">
        <Text bold color={theme.colors.primary}>BD TUI - Dashboard</Text>
        <Text color={theme.colors.textDim}>
          {categorized.activeEpics.length + categorized.completedEpics.length} epics | {categorized.activeTickets.filter(t => !t.parent).length + categorized.completedTickets.filter(t => !t.parent).length} standalone tickets | ESC
        </Text>
      </Box>

      {/* Tab bar */}
      <Box marginTop={1} gap={2}>
        <Text
          bold={activeSection === 'active'}
          color={activeSection === 'active' ? theme.colors.primary : theme.colors.textDim}
          inverse={activeSection === 'active'}
        >
          {' '}1: Active ({categorized.activeEpics.length + categorized.activeTickets.filter(t => !t.parent).length}) {' '}
        </Text>
        <Text
          bold={activeSection === 'completed'}
          color={activeSection === 'completed' ? theme.colors.primary : theme.colors.textDim}
          inverse={activeSection === 'completed'}
        >
          {' '}2: Completed ({categorized.completedEpics.length + categorized.completedTickets.filter(t => !t.parent).length}) {' '}
        </Text>
        <Text
          bold={activeSection === 'problems'}
          color={activeSection === 'problems' ? (problemCount > 0 ? theme.colors.warning : theme.colors.success) : theme.colors.textDim}
          inverse={activeSection === 'problems'}
        >
          {' '}3: Problems ({problemCount}) {' '}
        </Text>
      </Box>

      <Text color={theme.colors.border}>{'─'.repeat(terminalWidth - 2)}</Text>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleItems.map((item, idx) => renderItem(item, scrollOffset + idx))}
      </Box>

      {/* Footer */}
      <Text color={theme.colors.border}>{'─'.repeat(terminalWidth - 2)}</Text>
      <Box justifyContent="space-between">
        <Text color={theme.colors.textDim}>
          j/k: navigate | h/l or ←/→: sections | i: copy | q: close
        </Text>
        <Text color={theme.colors.textDim}>
          {displayItems.length > 0 ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleHeight, displayItems.length)}/${displayItems.length}` : 'Empty'}
        </Text>
      </Box>
    </Box>
  );
}
