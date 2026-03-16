# GitHub Issue Automator

## Description

This repository contains a CLI tool for automatically creating, labeling, and assigning GitHub issues based on templates and triggers. The tool supports custom issue templates, automatic labeling and assignment, and flexible configuration through JSON files.

## Features

- Manual issue creation from custom templates
- Automatic labeling with predefined labels
- Project assignment based on roles
- Flexible configuration through JSON files
- Support for trigger conditions (e.g., branch name, file paths, commit messages)

## Installation

```bash
npm install -g github-issue-automator
# Or use npx
npx github-issue-automator --help
```

## Configuration

Create a `issue-config.json` file in your project root:

```json
{
  "owner": "your-username",
  "repo": "your-repo",
  "token": "GITHUB_TOKEN",
  "labels": ["bug", "enhancement", "documentation"],
  "assignees": {
    "bug": ["developer1"],
    "enhancement": ["developer2"]
  },
  "templates": {
    "bug": {
      "title": "Bug: {{title}}",
      "body": "## Description\n\n{{description}}\n\n## Steps to Reproduce\n\n1. \n2. \n3. ",
      "labels": ["bug"]
    }
  }
}
```

## Usage

### Create an Issue

```bash
github-issue-automator create --template bug --title "Login fails" --description "Users cannot log in"
```

### List Labels

```bash
github-issue-automator labels
```

### Assign Issues

```bash
github-issue-automator assign --issue 123 --assignee username
```

## License

MIT License - see LICENSE file for details.
