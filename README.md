# Enterprise Knowledge Copilot MCP Server

The **Enterprise Knowledge Copilot** is a high-performance Model Context Protocol (MCP) server built with NitroStack. It assists enterprise teams with knowledge management, API version analysis, change impact tracking, and automated action item generation directly from documentation.

## Features

- **Dynamic File Resolution:** Access documents securely and search recursive subdirectories without needing to know exact internal paths.
- **Knowledge Catalog:** Retrieve list of approved files, categories, and automated lifecycle warnings (e.g., missing status, missing version, deprecation warnings).
- **Change Impact Analysis:** Auto-identify affected departments, risk priority, and recommended actions when comparing document versions. Includes an interactive Next.js widget dashboard.
- **Role-Specific Migration Briefs:** Generate migration summaries, milestones, checklists, and risk assessments tailored for Backend Engineers, QA Engineers, Security Engineers, Engineering Managers, or Customer Success.
- **Action Items Tracker:** Create, list, and modify task actions dynamically parsed and extracted from migration files.

## Project Structure

- `src/modules/knowledge-base/` - Tools, extractors, and resolvers for enterprise document retrieval, search, comparison, and migration brief generation.
- `src/modules/action-items/` - Trackers and storage for tasks generated from migration briefs.
- `src/widgets/` - Next.js interactive web widget dashboard for Change Impact.
- `knowledge-base/` - Structured directories containing markdown APIs, SOPs, and reports.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Locally (Development Mode)

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Community and Docs

- Docs: <https://docs.nitrostack.ai>
- Templates docs: <https://docs.nitrostack.ai/templates>
