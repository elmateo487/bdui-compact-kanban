import { create } from 'zustand';
import type { BeadsData, Issue } from '../types';
import { detectStatusChanges, notifyStatusChange } from '../utils/notifications';
import { LAYOUT } from '../utils/constants';

type StatusKey = 'open' | 'closed' | 'in_progress' | 'blocked';

interface ColumnState {
  selectedIndex: number;
  scrollOffset: number;
}

// Toast message for user feedback
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

// Undo history entry
interface UndoEntry {
  action: string;
  issueId: string;
  previousData: Partial<Issue>;
  timestamp: number;
}

interface BeadsStore {
  data: BeadsData;
  previousIssues: Map<string, Issue>; // Track previous state for notifications
  reloadCallback: (() => void) | null; // Callback to reload data from database

  // Terminal dimensions
  terminalWidth: number;
  terminalHeight: number;

  // Navigation - per column
  selectedColumn: number; // 0-3 for open/in_progress/blocked/closed
  columnStates: Record<StatusKey, ColumnState>; // Independent pagination per column
  itemsPerPage: number;

  // UI state
  viewMode: 'kanban' | 'tree' | 'graph' | 'stats' | 'create-issue' | 'edit-issue';
  previousView: 'kanban' | 'tree' | 'graph' | 'stats';
  showHelp: boolean;
  showDetails: boolean;
  showSearch: boolean;
  showFilter: boolean;
  showExportDialog: boolean;
  showThemeSelector: boolean;
  showJumpToPage: boolean;
  showBlockedColumn: boolean;
  showFullDetail: boolean;
  fullDetailStack: string[]; // Stack of issue IDs for navigation
  fullDetailSelectedSubtask: number; // Selected subtask index (-1 means scrolling description)
  fullDetailDescriptionScroll: number; // Scroll offset for description
  fullDetailDescriptionMaxScroll: number; // Max scroll value (set by component)
  fullDetailDescriptionPageSize: number; // Visible lines per page (set by component)
  showConfirmDialog: boolean;
  confirmDialogData: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  currentTheme: string;
  searchQuery: string;
  notificationsEnabled: boolean;

  // Toast messages for user feedback
  toastMessage: ToastMessage | null;

  // Undo history
  undoHistory: UndoEntry[];
  maxUndoHistory: number;

  filter: {
    assignee?: string;
    tags?: string[];
    status?: string;
    priority?: number;
    type?: string;
  };

  // Actions
  setData: (data: BeadsData) => void;
  setReloadCallback: (callback: (() => void) | null) => void;
  setFilter: (filter: BeadsStore['filter']) => void;
  getFilteredIssues: () => Issue[];
  getFilteredByStatus: () => Record<StatusKey, Issue[]>;
  setTerminalSize: (width: number, height: number) => void;

  // Navigation actions
  moveUp: () => void;
  moveDown: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  jumpToPage: (page: number) => void;
  getTotalPages: () => number;
  getCurrentPage: () => number;
  toggleHelp: () => void;
  toggleDetails: () => void;
  toggleNotifications: () => void;
  toggleSearch: () => void;
  toggleFilter: () => void;
  toggleExportDialog: () => void;
  toggleThemeSelector: () => void;
  toggleJumpToPage: () => void;
  toggleBlockedColumn: () => void;
  toggleFullDetail: () => void;
  pushFullDetail: (issueId: string) => void;
  popFullDetail: () => void;
  moveFullDetailUp: () => void;
  moveFullDetailDown: () => void;
  setFullDetailDescriptionMaxScroll: (max: number) => void;
  setFullDetailDescriptionPageSize: (size: number) => void;
  resetFullDetailScroll: () => void;
  getFullDetailIssue: () => Issue | null;
  setTheme: (theme: string) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'kanban' | 'tree' | 'graph' | 'stats' | 'create-issue' | 'edit-issue') => void;
  navigateToCreateIssue: () => void;
  navigateToEditIssue: () => void;
  returnToPreviousView: () => void;
  setSearchQuery: (query: string) => void;
  getSelectedIssue: () => Issue | null;
  getStatusKey: () => StatusKey;
  selectIssueById: (id: string) => boolean;

  // Toast actions
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Confirmation dialog actions
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirm: () => void;

  // Undo actions
  addToUndoHistory: (entry: Omit<UndoEntry, 'timestamp'>) => void;
  undo: () => UndoEntry | null;
  clearUndoHistory: () => void;
}

const STATUS_KEYS: StatusKey[] = ['open', 'in_progress', 'blocked', 'closed'];

export const useBeadsStore = create<BeadsStore>((set, get) => ({
  data: {
    issues: [],
    byStatus: {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    },
    byId: new Map(),
    stats: {
      total: 0,
      open: 0,
      closed: 0,
      blocked: 0,
    },
  },

  previousIssues: new Map(),
  reloadCallback: null,

  // Terminal dimensions (defaults, will be updated)
  terminalWidth: 120,
  terminalHeight: 30,

  // Navigation state - per column
  selectedColumn: 0,
  columnStates: {
    'open': { selectedIndex: 0, scrollOffset: 0 },
    'in_progress': { selectedIndex: 0, scrollOffset: 0 },
    'blocked': { selectedIndex: 0, scrollOffset: 0 },
    'closed': { selectedIndex: 0, scrollOffset: 0 },
  },
  itemsPerPage: 10, // Will be recalculated based on terminal height

  // UI state
  viewMode: 'kanban',
  previousView: 'kanban',
  showHelp: false,
  showDetails: false,
  showSearch: false,
  showFilter: false,
  showExportDialog: false,
  showThemeSelector: false,
  showJumpToPage: false,
  showBlockedColumn: false,
  showFullDetail: false,
  fullDetailStack: [],
  fullDetailSelectedSubtask: -1, // -1 means description scrolling mode
  fullDetailDescriptionScroll: 0,
  fullDetailDescriptionMaxScroll: 0,
  fullDetailDescriptionPageSize: 10,
  showConfirmDialog: false,
  confirmDialogData: null,
  currentTheme: 'default',
  searchQuery: '',
  notificationsEnabled: true, // Enabled by default

  // Toast messages
  toastMessage: null,

  // Undo history
  undoHistory: [],
  maxUndoHistory: 10,

  filter: { type: 'epic' },

  setTerminalSize: (width, height) => {
    const uiOverhead = LAYOUT.uiOverhead;
    const issueCardHeight = LAYOUT.issueCardHeight;
    const availableHeight = Math.max(height - uiOverhead, issueCardHeight);
    const itemsPerPage = Math.max(Math.floor(availableHeight / issueCardHeight), 1);

    set({
      terminalWidth: width,
      terminalHeight: height,
      itemsPerPage,
    });
  },

  setData: (data) => {
    const state = get();

    // Detect status changes and notify (only if enabled)
    if (state.notificationsEnabled) {
      const changes = detectStatusChanges(state.previousIssues, data.byId);
      for (const change of changes) {
        notifyStatusChange(change);
      }
    }

    // First update data and reset full detail scroll state (forces UI redraw)
    set({
      data,
      previousIssues: new Map(data.byId), // Clone for next comparison
      fullDetailDescriptionScroll: 0,
      fullDetailSelectedSubtask: -1,
    });

    // Now validate column states against filtered data
    const filteredByStatus = get().getFilteredByStatus();
    const newColumnStates = { ...state.columnStates };
    for (const statusKey of STATUS_KEYS) {
      const issuesInColumn = filteredByStatus[statusKey]?.length || 0;
      const currentState = newColumnStates[statusKey];

      if (currentState.selectedIndex >= issuesInColumn) {
        newColumnStates[statusKey] = {
          selectedIndex: Math.max(0, issuesInColumn - 1),
          scrollOffset: 0,
        };
      }
    }

    set({ columnStates: newColumnStates });
  },

  setReloadCallback: (callback) => set({ reloadCallback: callback }),

  setFilter: (filter) => {
    const state = get();
    // First update filter
    set({ filter });

    // Then validate column states against new filtered data
    const filteredByStatus = get().getFilteredByStatus();
    const newColumnStates = { ...state.columnStates };
    for (const statusKey of STATUS_KEYS) {
      const issuesInColumn = filteredByStatus[statusKey]?.length || 0;
      const currentState = newColumnStates[statusKey];

      if (currentState.selectedIndex >= issuesInColumn) {
        newColumnStates[statusKey] = {
          selectedIndex: Math.max(0, issuesInColumn - 1),
          scrollOffset: 0,
        };
      }
    }

    set({ columnStates: newColumnStates });
  },

  getFilteredIssues: () => {
    const { data, filter, searchQuery } = get();
    let issues = data.issues;

    // Text search across title, description, and ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      issues = issues.filter(issue =>
        issue.title.toLowerCase().includes(query) ||
        issue.description?.toLowerCase().includes(query) ||
        issue.id.toLowerCase().includes(query)
      );
    }

    // Filter by assignee
    if (filter.assignee) {
      issues = issues.filter(issue => issue.assignee === filter.assignee);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      issues = issues.filter(issue =>
        issue.labels?.some(label => filter.tags?.includes(label))
      );
    }

    // Filter by status
    if (filter.status) {
      issues = issues.filter(issue => issue.status === filter.status);
    }

    // Filter by priority
    if (filter.priority !== undefined) {
      issues = issues.filter(issue => issue.priority === filter.priority);
    }

    // Filter by issue type
    if (filter.type) {
      issues = issues.filter(issue => issue.issue_type === filter.type);
    }

    return issues;
  },

  getFilteredByStatus: () => {
    const { data, filter, searchQuery } = get();
    const hasFilters = !!(
      searchQuery.trim() ||
      filter.assignee ||
      filter.status ||
      filter.priority !== undefined ||
      filter.type ||
      (filter.tags && filter.tags.length > 0)
    );

    if (!hasFilters) {
      return data.byStatus;
    }

    const filteredIssues = get().getFilteredIssues();
    const byStatus: Record<StatusKey, Issue[]> = {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    };

    filteredIssues.forEach(issue => {
      if (byStatus[issue.status as StatusKey]) {
        byStatus[issue.status as StatusKey].push(issue);
      }
    });

    // Helper to count closed children for an issue
    const getClosedChildCount = (issue: Issue): number => {
      if (!issue.children || issue.children.length === 0) return 0;
      return issue.children.filter(childId => {
        const child = data.byId.get(childId);
        return child && child.status === 'closed';
      }).length;
    };

    // Sort each status column: priority ASC (P0 first), then closed task count DESC, then created time DESC
    const sortIssues = (a: Issue, b: Issue): number => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const aClosedCount = getClosedChildCount(a);
      const bClosedCount = getClosedChildCount(b);
      if (aClosedCount !== bClosedCount) {
        return bClosedCount - aClosedCount;
      }
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    };

    for (const status of Object.keys(byStatus)) {
      byStatus[status as StatusKey].sort(sortIssues);
    }

    return byStatus;
  },

  getStatusKey: () => {
    const { selectedColumn } = get();
    return STATUS_KEYS[selectedColumn];
  },

  getSelectedIssue: () => {
    const { selectedColumn, columnStates } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const filteredByStatus = get().getFilteredByStatus();
    const issues = filteredByStatus[statusKey] || [];
    const selectedIndex = columnStates[statusKey].selectedIndex;
    return issues[selectedIndex] || null;
  },

  selectIssueById: (id: string) => {
    const { columnStates, itemsPerPage } = get();
    const searchId = id.toLowerCase();
    const filteredByStatus = get().getFilteredByStatus();

    // Search through all status columns (filtered data)
    for (let colIndex = 0; colIndex < STATUS_KEYS.length; colIndex++) {
      const statusKey = STATUS_KEYS[colIndex];
      const issues = filteredByStatus[statusKey] || [];

      const issueIndex = issues.findIndex(issue =>
        issue.id.toLowerCase() === searchId ||
        issue.id.toLowerCase().includes(searchId)
      );

      if (issueIndex !== -1) {
        // Found it - update selection
        const newOffset = Math.floor(issueIndex / itemsPerPage) * itemsPerPage;
        set({
          selectedColumn: colIndex,
          columnStates: {
            ...columnStates,
            [statusKey]: {
              selectedIndex: issueIndex,
              scrollOffset: newOffset,
            },
          },
        });
        return true;
      }
    }
    return false;
  },

  getTotalPages: () => {
    const { selectedColumn, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const filteredByStatus = get().getFilteredByStatus();
    const issues = filteredByStatus[statusKey] || [];
    return Math.ceil(issues.length / itemsPerPage) || 1;
  },

  getCurrentPage: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const scrollOffset = columnStates[statusKey].scrollOffset;
    return Math.floor(scrollOffset / itemsPerPage) + 1;
  },

  moveUp: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const currentState = columnStates[statusKey];

    if (currentState.selectedIndex > 0) {
      const newIndex = currentState.selectedIndex - 1;
      let newOffset = currentState.scrollOffset;

      // Scroll up if needed
      if (newIndex < currentState.scrollOffset) {
        newOffset = newIndex;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIndex: newIndex,
            scrollOffset: newOffset,
          },
        },
      });
    }
  },

  moveDown: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const filteredByStatus = get().getFilteredByStatus();
    const issues = filteredByStatus[statusKey] || [];
    const currentState = columnStates[statusKey];

    if (currentState.selectedIndex < issues.length - 1) {
      const newIndex = currentState.selectedIndex + 1;
      let newOffset = currentState.scrollOffset;

      // Scroll down if needed
      if (newIndex >= currentState.scrollOffset + itemsPerPage) {
        newOffset = newIndex - itemsPerPage + 1;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIndex: newIndex,
            scrollOffset: newOffset,
          },
        },
      });
    }
  },

  moveLeft: () => {
    const { selectedColumn } = get();
    if (selectedColumn > 0) {
      set({ selectedColumn: selectedColumn - 1 });
    }
  },

  moveRight: () => {
    const { selectedColumn } = get();
    if (selectedColumn < STATUS_KEYS.length - 1) {
      set({ selectedColumn: selectedColumn + 1 });
    }
  },

  jumpToFirst: () => {
    const { selectedColumn, columnStates } = get();
    const statusKey = STATUS_KEYS[selectedColumn];

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIndex: 0,
          scrollOffset: 0,
        },
      },
    });
  },

  jumpToLast: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const filteredByStatus = get().getFilteredByStatus();
    const issues = filteredByStatus[statusKey] || [];
    const lastIndex = Math.max(0, issues.length - 1);
    const newOffset = Math.max(0, lastIndex - itemsPerPage + 1);

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIndex: lastIndex,
          scrollOffset: newOffset,
        },
      },
    });
  },

  jumpToPage: (page: number) => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const filteredByStatus = get().getFilteredByStatus();
    const issues = filteredByStatus[statusKey] || [];
    const totalPages = Math.ceil(issues.length / itemsPerPage) || 1;

    // Clamp page to valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    const newOffset = (validPage - 1) * itemsPerPage;
    const newIndex = Math.min(newOffset, issues.length - 1);

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIndex: Math.max(0, newIndex),
          scrollOffset: newOffset,
        },
      },
      showJumpToPage: false,
    });
  },

  toggleHelp: () => {
    set(state => ({ showHelp: !state.showHelp }));
  },

  toggleDetails: () => {
    set(state => ({ showDetails: !state.showDetails }));
  },

  toggleNotifications: () => {
    set(state => ({ notificationsEnabled: !state.notificationsEnabled }));
  },

  toggleSearch: () => {
    set(state => ({
      showSearch: !state.showSearch,
      // Close filter when opening search
      showFilter: state.showSearch ? state.showFilter : false,
    }));
  },

  toggleFilter: () => {
    set(state => ({
      showFilter: !state.showFilter,
      // Close search when opening filter
      showSearch: state.showFilter ? state.showSearch : false,
    }));
  },

  toggleExportDialog: () => {
    set(state => ({
      showExportDialog: !state.showExportDialog,
      // Close other modals when opening export dialog
      showSearch: state.showExportDialog ? state.showSearch : false,
      showFilter: state.showExportDialog ? state.showFilter : false,
      showThemeSelector: state.showExportDialog ? state.showThemeSelector : false,
    }));
  },

  toggleThemeSelector: () => {
    set(state => ({
      showThemeSelector: !state.showThemeSelector,
      // Close other modals when opening theme selector
      showSearch: state.showThemeSelector ? state.showSearch : false,
      showFilter: state.showThemeSelector ? state.showFilter : false,
      showExportDialog: state.showThemeSelector ? state.showExportDialog : false,
    }));
  },

  toggleJumpToPage: () => {
    set(state => ({
      showJumpToPage: !state.showJumpToPage,
      // Close other modals
      showSearch: false,
      showFilter: false,
      showExportDialog: false,
      showThemeSelector: false,
    }));
  },

  toggleBlockedColumn: () => {
    set(state => ({ showBlockedColumn: !state.showBlockedColumn }));
  },

  toggleFullDetail: () => {
    const state = get();
    if (state.showFullDetail) {
      // Close full detail
      set({ showFullDetail: false, fullDetailStack: [], fullDetailSelectedSubtask: -1, fullDetailDescriptionScroll: 0 });
    } else {
      // Open full detail with current selected issue
      const selectedIssue = state.getSelectedIssue();
      if (selectedIssue) {
        set({
          showFullDetail: true,
          fullDetailStack: [selectedIssue.id],
          fullDetailSelectedSubtask: -1,
          fullDetailDescriptionScroll: 0,
        });
      }
    }
  },

  pushFullDetail: (issueId: string) => {
    set(state => ({
      fullDetailStack: [...state.fullDetailStack, issueId],
      fullDetailSelectedSubtask: -1,
      fullDetailDescriptionScroll: 0,
    }));
  },

  popFullDetail: () => {
    const state = get();
    if (state.fullDetailStack.length > 1) {
      // Pop one level
      set({
        fullDetailStack: state.fullDetailStack.slice(0, -1),
        fullDetailSelectedSubtask: -1,
        fullDetailDescriptionScroll: 0,
      });
    } else {
      // Close full detail entirely
      set({ showFullDetail: false, fullDetailStack: [], fullDetailSelectedSubtask: -1, fullDetailDescriptionScroll: 0 });
    }
  },

  moveFullDetailUp: () => {
    const state = get();
    const pageSize = Math.max(1, state.fullDetailDescriptionPageSize - 1); // Overlap by 1 line for context

    if (state.fullDetailSelectedSubtask >= 0) {
      // In subtask selection mode - move up or switch to description scroll
      if (state.fullDetailSelectedSubtask > 0) {
        set({ fullDetailSelectedSubtask: state.fullDetailSelectedSubtask - 1 });
      } else {
        // At first subtask, switch back to description scrolling (jump to end)
        set({ fullDetailSelectedSubtask: -1, fullDetailDescriptionScroll: state.fullDetailDescriptionMaxScroll });
      }
    } else {
      // In description scroll mode - scroll up by page
      if (state.fullDetailDescriptionScroll > 0) {
        const newScroll = Math.max(0, state.fullDetailDescriptionScroll - pageSize);
        set({ fullDetailDescriptionScroll: newScroll });
      }
    }
  },

  moveFullDetailDown: () => {
    const state = get();
    const issue = state.getFullDetailIssue();
    const hasSubtasks = issue?.children && issue.children.length > 0;
    const maxSubtaskIndex = hasSubtasks ? issue.children.length - 1 : -1;
    const pageSize = Math.max(1, state.fullDetailDescriptionPageSize - 1); // Overlap by 1 line for context

    if (state.fullDetailSelectedSubtask === -1) {
      // In description scroll mode
      if (state.fullDetailDescriptionScroll < state.fullDetailDescriptionMaxScroll) {
        // Scroll down by page, capped at max
        const newScroll = Math.min(state.fullDetailDescriptionMaxScroll, state.fullDetailDescriptionScroll + pageSize);
        set({ fullDetailDescriptionScroll: newScroll });
      } else if (hasSubtasks) {
        // Description fully scrolled, switch to subtask selection
        set({ fullDetailSelectedSubtask: 0 });
      }
    } else {
      // In subtask selection mode - move down if possible
      if (state.fullDetailSelectedSubtask < maxSubtaskIndex) {
        set({ fullDetailSelectedSubtask: state.fullDetailSelectedSubtask + 1 });
      }
    }
  },

  setFullDetailDescriptionMaxScroll: (max: number) => {
    set({ fullDetailDescriptionMaxScroll: max });
  },

  setFullDetailDescriptionPageSize: (size: number) => {
    set({ fullDetailDescriptionPageSize: size });
  },

  resetFullDetailScroll: () => {
    set({ fullDetailDescriptionScroll: 0, fullDetailSelectedSubtask: -1 });
  },

  getFullDetailIssue: () => {
    const { fullDetailStack, data } = get();
    if (fullDetailStack.length === 0) return null;
    const currentId = fullDetailStack[fullDetailStack.length - 1];
    return data.byId.get(currentId) || null;
  },

  setTheme: (theme) => set({ currentTheme: theme }),

  clearFilters: () => {
    set({
      searchQuery: '',
      filter: { type: 'epic' },  // Keep default type filter
      showSearch: false,
      showFilter: false,
    });
  },

  setViewMode: (mode) => {
    const state = get();
    // Save current view as previous if it's not a form view
    if (mode === 'create-issue' || mode === 'edit-issue') {
      if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
        set({ viewMode: mode, previousView: state.viewMode });
      } else {
        set({ viewMode: mode });
      }
    } else {
      set({ viewMode: mode, previousView: mode });
    }
  },

  navigateToCreateIssue: () => {
    const state = get();
    if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
      set({ viewMode: 'create-issue', previousView: state.viewMode });
    } else {
      set({ viewMode: 'create-issue' });
    }
  },

  navigateToEditIssue: () => {
    const state = get();
    if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
      set({ viewMode: 'edit-issue', previousView: state.viewMode });
    } else {
      set({ viewMode: 'edit-issue' });
    }
  },

  returnToPreviousView: () => {
    const state = get();
    set({ viewMode: state.previousView });
  },

  setSearchQuery: (query) => {
    const state = get();
    // First update search query
    set({ searchQuery: query });

    // Then validate column states against new filtered data
    const filteredByStatus = get().getFilteredByStatus();
    const newColumnStates = { ...state.columnStates };
    for (const statusKey of STATUS_KEYS) {
      const issuesInColumn = filteredByStatus[statusKey]?.length || 0;
      const currentState = newColumnStates[statusKey];

      if (currentState.selectedIndex >= issuesInColumn) {
        newColumnStates[statusKey] = {
          selectedIndex: Math.max(0, issuesInColumn - 1),
          scrollOffset: 0,
        };
      }
    }

    set({ columnStates: newColumnStates });
  },

  // Toast actions
  showToast: (message, type) => {
    const toast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
    };
    set({ toastMessage: toast });

    // Auto-clear toast after 3 seconds
    setTimeout(() => {
      const state = get();
      if (state.toastMessage?.id === toast.id) {
        set({ toastMessage: null });
      }
    }, 3000);
  },

  clearToast: () => set({ toastMessage: null }),

  // Confirmation dialog actions
  showConfirm: (title, message, onConfirm) => {
    set({
      showConfirmDialog: true,
      confirmDialogData: { title, message, onConfirm },
    });
  },

  hideConfirm: () => {
    set({
      showConfirmDialog: false,
      confirmDialogData: null,
    });
  },

  // Undo actions
  addToUndoHistory: (entry) => {
    const state = get();
    const newEntry: UndoEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    const newHistory = [newEntry, ...state.undoHistory].slice(0, state.maxUndoHistory);
    set({ undoHistory: newHistory });
  },

  undo: () => {
    const state = get();
    if (state.undoHistory.length === 0) return null;

    const [entry, ...rest] = state.undoHistory;
    set({ undoHistory: rest });
    return entry;
  },

  clearUndoHistory: () => set({ undoHistory: [] }),
}));

export { STATUS_KEYS };
export type { StatusKey, ToastMessage, UndoEntry };
