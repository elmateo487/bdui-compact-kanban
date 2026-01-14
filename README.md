# BD TUI Compact

A streamlined, real-time Kanban visualizer for the [bd (beads)](https://github.com/steveyegge/beads) issue tracker. This is a **compact fork** of [bdui](https://github.com/assimelha/bdui) optimized for LLM-assisted development workflows.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)
![Bun](https://img.shields.io/badge/runtime-Bun-f472b6.svg)

![BD TUI Screenshot](assets/screenshot.png)

## Why This Fork?

This fork strips down bdui to focus on what matters for **LLM-driven development**:

- **Kanban-only view** - Removed tree, graph, and stats views for simplicity
- **Minimal interaction** - Designed for monitoring, not heavy terminal editing
- **Live updates** - Reliable WAL polling so LLMs can track issue state changes in real-time
- **Epic → Ticket → AC hierarchy** - Enforced via `type:epic`, `type:ticket`, `type:ac` labels

### Ideal For

- Running in a side terminal while an LLM works on your codebase
- Quick visual confirmation of issue status changes
- Monitoring epic/ticket/AC completion during development sessions
- Lightweight issue triage without leaving the terminal

### Pairs With AgenticSystem

This TUI is designed to work with [AgenticSystem](https://github.com/elmateo487/AgenticSystem) - a framework for coordinating AI agents using beads for task management. AgenticSystem uses specialized agents (Orchestrator, Historian, Engineer) that create and manage the Epic → Ticket → AC hierarchy. BD TUI Compact provides real-time visualization of agent progress as they work through issues.

## Issue Hierarchy

BD TUI Compact visualizes a **three-level parent-child hierarchy**:

| Level | Description |
|-------|-------------|
| **Epic** | Large initiative spanning multiple sessions |
| **Ticket** | Discrete work item, child of an Epic |
| **Acceptance Criteria** | Testable requirement, child of a Ticket |

Relationships are established using the `--parent` flag when creating issues. See [AgenticSystem v1.3](https://github.com/elmateo487/AgenticSystem) for full workflow details and label conventions.

### How BD TUI Displays the Hierarchy

- **Kanban View**: Shows completion badges (e.g., "2/5" children completed)
- **Detail Panel**: Lists children with status checkboxes
- **Full Detail View**: Navigate children with arrow keys, Enter to drill down
- **Parents Filter** (`p`): Toggle to show only Epics/Tickets (hide ACs)
- **Dashboard** (`Shift+T`): Flags orphaned ACs and missing parent references

## ✨ Features

### 📊 Focused Visualization
- **Kanban Board** - Stacked 2-column layout (Open + In Progress/Blocked)
- **Dashboard View** - Issue categorization with hierarchy validation

### 🔄 LLM-Friendly
- **Real-time Updates** - WAL file polling catches every database change
- **Minimal UI** - Less visual noise, easier to parse at a glance
- **Full Detail Pane** - Press Enter for full-screen view with children navigation
- **Parents-only Filter** - Toggle `p` to show only epics/tickets (hide ACs)

### 🎨 Lightweight Interaction
- **Vim-style Command Bar** - Quick status/priority changes (`:s o`, `:p 2`)
- **Copy Issue ID** - Press `i` to copy selected issue ID to clipboard
- **Themes** - 5 color schemes for terminal preference

## 🚀 Installation

### Prerequisites
- [Bun](https://bun.sh) runtime (required)
- [bd (beads)](https://github.com/steveyegge/beads) issue tracker
- A `.beads/` directory with `beads.db` in your project

### Build from Source

```bash
# Clone this fork
git clone https://github.com/elmateo487/bdui-compact-kanban.git
cd bdui-compact-kanban

# Install dependencies
bun install

# Run in development mode
bun run dev

# Or build single binary for your platform
bun run build
./bdui
```

### Building for All Platforms

```bash
bun run build:macos   # ARM64 and x64
bun run build:linux   # x64
bun run build:windows # x64
bun run build:all     # All platforms
```

Binaries are created in `dist/` (~50-60 MB each, includes Bun runtime).

## 📖 Usage

### Basic Usage

Navigate to a directory containing a `.beads/` folder and run:

```bash
bdui
```

Or from the source directory:

```bash
bun run dev
```

The app will automatically discover the `.beads/` directory by walking up the directory tree (like git).

### Keyboard Shortcuts

#### Navigation
- `↑/↓` or `k/j` - Move up/down (select issue)
- `←/→` or `h/l` - Move left/right (change column in Kanban view)
- `Enter` or `Space` - Toggle detail panel

#### Views & Options
- `T` (Shift+T) - Dashboard view (issue categorization)
- `b` - Toggle Blocked column visibility
- `p` - Toggle Parents only filter
- `t` - Change theme

#### Actions
- `i` - Copy issue ID to clipboard
- `N` (Shift+N) - Create new issue
- `e` - Edit selected issue
- `x` - Export/copy selected issue

#### Search & Filter
- `/` - Open search (searches title, description, ID)
- `f` - Open filter panel (filter by assignee, tags, priority, status)
- `c` - Clear all filters and search
- `ESC` - Close search/filter/form panels

#### Command Bar (`:`)
- `:5` - Jump to page 5
- `:bd-xxx` - Jump to issue by ID
- `:s o/i/b/c` - Set status (open/in_progress/blocked/closed)
- `:p 0-4` - Set priority
- `:theme name` - Change theme
- `:new` `:edit` `:q` - Create, edit, quit

#### Other
- `r` - Refresh data from database
- `n` - Toggle notifications
- `?` or `h` - Show help
- `q` or `Ctrl+C` - Quit

## 🎨 Views

### Kanban View (Default)
The main view uses a **stacked 2-column layout**:
- **Left column**: Open issues
- **Right column**: In Progress issues (with optional Blocked stacked below)

Features:
- Color-coded priorities (P0-P4)
- Type indicators (epic, ticket, ac) with hierarchy badges
- Subtask/AC completion counters (e.g., "2/5 ACs done")
- Per-column pagination and selection
- **Detail panel** (Space) - Sidebar with issue details
- **Full detail view** (Enter) - Full-screen with markdown rendering, children list, and navigation between subtasks (Tab to switch sections, ↑/↓ to navigate children, Enter to drill into blockers/children)
- Toggle Blocked column with `b`

### Markdown Support in Detail Views

Both the sidebar detail panel and full detail view render issue descriptions with **markdown formatting**:

- **Headers** (`#`, `##`, `###`) - Rendered with appropriate styling and indentation
- **Bold** (`**text**`) and *Italic* (`*text*`) - Full emphasis support
- **Code** (`` `inline` `` and ``` ```blocks``` ```) - Syntax highlighting with distinct background
- **Lists** (`-`, `*`, `1.`) - Bulleted and numbered lists with proper indentation
- **Blockquotes** (`>`) - Indented quote styling
- **Links** (`[text](url)`) - Displayed as clickable-style text

The description area in full detail view is **scrollable** - use ↑/↓ arrows to scroll through long descriptions. Scroll indicators show remaining content above/below.
- **Parents-only filter** (`p`) - Hide ACs, show only epics and tickets

### Dashboard View (Shift+T)
Issue categorization and diagnostics:
- **Active Section**: Epics and tickets currently in progress
- **Completed Section**: Closed issues
- **Problems Section**: Data quality diagnostics
  - Orphaned acceptance criteria (ACs without parent tickets)
  - Missing parent references
  - Issues without type labels
- Navigate sections with ←/→
- Copy issue IDs with `i`
- Press ESC to return to Kanban

## 🔔 Notifications

BD TUI supports native desktop notifications for important events:

### Notification Types
- **Task Completed** ✅ - When an issue status changes to "closed"
  - Green checkmark icon
  - System sound (macOS)
  - Shows issue ID and priority

- **Task Blocked** 🚫 - When an issue becomes blocked
  - Red prohibition icon
  - Silent notification
  - Shows number of blocking issues

### Notification Icons
Custom icons are located in `assets/icons/`:
- `completed.png` - Green circle with white checkmark (512x512)
- `blocked.png` - Red circle with prohibition symbol (512x512)

Platform support:
- **macOS** - Full support with custom icons in Notification Center
- **Linux** - Freedesktop.org notification spec
- **Windows** - Toast notifications

Toggle notifications with the `n` key. Current state is shown in the footer (🔔 ON / 🔕 OFF).

### Testing Notifications
```bash
bun run test:notifications
```

## ✏️ Creating and Editing Issues

### Create New Issue
Press `N` (Shift+N) to open the create issue form:
- Tab/Shift+Tab to navigate between fields
- Fill in: title, description, priority (P0-P4), type, assignee, labels
- Press Enter to submit
- ESC to cancel

### Edit Existing Issue
Select any issue and press `e` to open the edit form:
- All fields pre-populated with current values
- Tab/Shift+Tab to navigate
- Use ↑/↓ to change priority and status
- Press Enter to save changes
- ESC to cancel

Changes are immediately written to the bd database and reflected in the UI.

## 📤 Exporting Issues

Press `x` on any selected issue to open the export dialog:

### Format Options (←/→ to navigate)
- **Markdown** - Formatted markdown with headers and lists
- **JSON** - Complete issue data in JSON format
- **Plain Text** - Simple text format with clear structure

### Action Options (↑/↓ to navigate)
- **Copy to Clipboard** - Copy formatted issue to system clipboard
- **Export to File** - Save to `{issue-id}.{extension}` in current directory

Press Enter to execute. Works on macOS, Linux, and Windows.

## 🎨 Themes

BD TUI includes 5 built-in color schemes. Press `t` to open the theme selector:

### Available Themes
- **Default** - Classic blue/cyan theme with high contrast
- **Ocean** - Blue and cyan tones for a calm, aquatic feel
- **Forest** - Green-focused theme inspired by nature
- **Sunset** - Warm magenta and yellow tones
- **Monochrome** - Clean grayscale theme for distraction-free work

Use ↑/↓ or k/j to browse themes. Each theme shows a live color preview. Press Enter to apply.

## 🔍 Search & Filter

### Search (/)
- Full-text search across title, description, and issue ID
- Type to search incrementally
- ESC to close

### Filter (f)
- **Assignee** - Filter by assigned person
- **Tags** - Filter by labels (multi-select)
- **Priority** - Filter by P0-P4
- **Status** - Filter by open/in_progress/blocked/closed
- Tab to cycle between filter types
- Space/Enter to toggle selections
- ESC to close

### Clear Filters (c)
Removes all active search and filter criteria.

## 📊 Responsive Layout

### Terminal Size Adaptation
The stacked 2-column layout adapts to terminal size:
- **Wide terminals**: Both columns + detail panel visible
- **Medium terminals**: Both columns visible, detail panel hidden
- **Narrow terminals**: Single column mode

### Minimum Requirements
- Width: 80 columns (recommended: 120+)
- Height: 24 rows (recommended: 30+)
- True color support recommended but not required

## 🧪 Testing

### Test with Sample Data
A test project with sample issues is included:

```bash
cd /tmp/bdui-test
bun run /path/to/bdui/src/index.tsx
```

The test project includes:
- 11 diverse issues (varied priorities, types, statuses)
- Multiple assignees (alice, bob, charlie, diana)
- Parent-child relationships (epic with children)
- Blocking dependencies
- Various labels and metadata

See `/tmp/bdui-test/README.md` for a complete feature walkthrough.

### Manual Testing
```bash
# Test notifications
bun run test:notifications

# Run in development mode
bun run dev

# Test with your own bd project
cd /path/to/your/project
bun run /path/to/bdui/src/index.tsx
```

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Bun (native SQLite, faster than Node.js)
- **UI Framework**: Ink (React for CLIs)
- **State Management**: Zustand
- **Database**: SQLite (direct reads from bd's database via `bun:sqlite`)
- **Notifications**: node-notifier (cross-platform)

### Data Flow
1. **Database Reading** - Direct SQLite queries to `beads.db`
2. **File Watching** - WAL file size polling (500ms) for reliable change detection
3. **State Management** - Zustand store with normalized data structure
4. **Real-time Updates** - Pub/sub pattern for database changes
5. **Notifications** - Status change detection with OS notifications

### Project Structure
```
bdui/
├── src/
│   ├── components/       # React/Ink components
│   │   ├── App.tsx       # Main app with keyboard handling & command bar
│   │   ├── Board.tsx     # View router
│   │   ├── StackedStatusColumns.tsx  # Stacked column layout
│   │   ├── StatusColumn.tsx          # Individual status column
│   │   ├── TotalListView.tsx         # Dashboard view
│   │   ├── DetailPanel.tsx           # Sidebar detail panel
│   │   ├── FullDetailPanel.tsx       # Full-screen detail view
│   │   ├── CreateIssueForm.tsx
│   │   ├── EditIssueForm.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── ThemeSelector.tsx
│   │   └── ...
│   ├── bd/               # bd integration
│   │   ├── parser.ts     # SQLite database reading
│   │   ├── watcher.ts    # File watching (WAL polling)
│   │   └── commands.ts   # bd CLI integration
│   ├── state/            # State management
│   │   └── store.ts      # Zustand store
│   ├── themes/           # Theme definitions
│   │   └── themes.ts
│   ├── utils/            # Utilities
│   │   ├── notifications.ts
│   │   ├── export.ts
│   │   └── settings.ts   # Persistent settings
│   ├── types.ts          # TypeScript types
│   └── index.tsx         # Entry point
├── assets/
│   └── icons/            # Notification icons
│       ├── completed.png
│       ├── blocked.png
│       └── README.md
├── CLAUDE.md             # Development documentation
├── AGENTS.md             # bd workflow documentation
├── package.json
└── README.md             # This file
```

## 🤝 Contributing

Contributions welcome! See `CLAUDE.md` for architecture documentation.

```bash
git clone https://github.com/elmateo487/bdui-compact-kanban.git
cd bdui-compact-kanban
bun install
bun run dev
```

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [bdui](https://github.com/assimelha/bdui) - The original BD TUI this fork is based on
- [bd (beads)](https://github.com/steveyegge/beads) - The issue tracker that powers this TUI
- [AgenticSystem](https://github.com/elmateo487/AgenticSystem) - AI agent coordination framework using beads
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [Bun](https://bun.sh) - Fast JavaScript runtime

---

**A compact fork of bdui for LLM-assisted development workflows**
