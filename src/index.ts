import { Octokit } from "octokit";

interface IssueConfig {
  owner: string;
  repo: string;
  token: string;
  labels?: string[];
  assignees?: Record<string, string[]>;
  templates?: Record<string, IssueTemplate>;
}

interface IssueTemplate {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export class GitHubIssueAutomator {
  private octokit: Octokit;
  private config: IssueConfig;
  private owner: string;
  private repo: string;

  constructor(config: IssueConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  async createIssue(options: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<number> {
    const response = await this.octokit.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: options.title,
      body: options.body,
      labels: options.labels,
      assignees: options.assignees,
    });
    return response.data.number;
  }

  async createFromTemplate(
    templateName: string,
    variables: Record<string, string>
  ): Promise<number> {
    const template = this.config.templates?.[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const title = this.interpolate(template.title, variables);
    const body = this.interpolate(template.body, variables);

    return this.createIssue({
      title,
      body,
      labels: template.labels,
      assignees: template.assignees,
    });
  }

  async listLabels(): Promise<string[]> {
    const response = await this.octokit.rest.issues.listLabels({
      owner: this.owner,
      repo: this.repo,
    });
    return response.data.map((label) => label.name);
  }

  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels,
    });
  }

  async assignIssue(issueNumber: number, assignees: string[]): Promise<void> {
    await this.octokit.rest.issues.addAssignees({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      assignees,
    });
  }

  async closeIssue(issueNumber: number): Promise<void> {
    await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      state: "closed",
    });
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || "");
  }
}

export function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1]?.startsWith("--") ? "" : args[i + 1];
      if (value) result[key] = value;
    }
  }
  return result;
}

export async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.command || args.c;

  const config: IssueConfig = {
    owner: args.owner || process.env.GITHUB_OWNER || "",
    repo: args.repo || process.env.GITHUB_REPO || "",
    token: args.token || process.env.GITHUB_TOKEN || "",
  };

  if (!config.owner || !config.repo || !config.token) {
    console.error("Error: Missing required arguments. Provide --owner, --repo, and --token");
    process.exit(1);
  }

  const automator = new GitHubIssueAutomator(config);

  switch (command) {
    case "create":
      if (!args.title) {
        console.error("Error: --title is required for create command");
        process.exit(1);
      }
      const issueNumber = await automator.createIssue({
        title: args.title,
        body: args.body || "",
        labels: args.labels?.split(","),
        assignees: args.assignees?.split(","),
      });
      console.log(`Created issue #${issueNumber}`);
      break;

    case "labels":
      const labels = await automator.listLabels();
      console.log("Available labels:", labels.join(", "));
      break;

    case "assign":
      if (!args.issue || !args.assignee) {
        console.error("Error: --issue and --assignee are required");
        process.exit(1);
      }
      await automator.assignIssue(parseInt(args.issue), args.assignee.split(","));
      console.log(`Assigned issue #${args.issue}`);
      break;

    case "close":
      if (!args.issue) {
        console.error("Error: --issue is required");
        process.exit(1);
      }
      await automator.closeIssue(parseInt(args.issue));
      console.log(`Closed issue #${args.issue}`);
      break;

    default:
      console.log(`
GitHub Issue Automator CLI

Usage:
  github-issue-automator --command create --title "Issue Title" --body "Description"
  github-issue-automator --command labels
  github-issue-automator --command assign --issue 123 --assignee username
  github-issue-automator --command close --issue 123

Options:
  --owner      GitHub repository owner
  --repo       GitHub repository name
  --token      GitHub personal access token
  --command    Command to execute (create, labels, assign, close)
  --title      Issue title
  --body       Issue body
  --labels     Comma-separated labels
  --assignees Comma-separated assignees
  --issue      Issue number
`);
  }
}
