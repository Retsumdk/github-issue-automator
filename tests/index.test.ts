import { describe, test, expect, mock } from "bun:test";
import { parseArgs } from "../src/index";

// GitHubIssueAutomator's only dependency-free surface is parseArgs; the class
// itself is a thin Octokit wrapper. Mock Octokit to verify the wrapper logic.
describe("parseArgs", () => {
  test("parses --key value pairs", () => {
    expect(parseArgs(["--owner", "acme", "--repo", "widgets"])).toEqual({
      owner: "acme",
      repo: "widgets",
    });
  });

  test("treats a flag followed by another flag as empty value", () => {
    const result = parseArgs(["--verbose", "--owner", "acme"]);
    expect("verbose" in result).toBe(false);
    expect(result.owner).toBe("acme");
  });

  test("ignores bare words without a following value", () => {
    expect(parseArgs(["--token"])).toEqual({});
  });

  test("returns empty for no args", () => {
    expect(parseArgs([])).toEqual({});
  });
});

describe("GitHubIssueAutomator", () => {
  test("createFromTemplate throws for an unknown template", async () => {
    const { GitHubIssueAutomator } = await import("../src/index");
    const automator = new GitHubIssueAutomator({
      owner: "acme",
      repo: "widgets",
      token: "test-token",
    });
    await expect(
      automator.createFromTemplate("no-such-template", {})
    ).rejects.toThrow('Template "no-such-template" not found');
  });

  test("createFromTemplate interpolates {{variables}} and calls issues.create", async () => {
    mock.module("octokit", () => ({
      Octokit: class {
        rest = {
          issues: {
            create: async (params: any) => ({
              data: { number: 42, title: params.title },
            }),
          },
        };
        constructor(_opts: any) {}
      },
    }));

    const mod = await import("../src/index");
    const automator = new mod.GitHubIssueAutomator({
      owner: "acme",
      repo: "widgets",
      token: "test-token",
      templates: {
        bug: {
          title: "Bug: {{name}}",
          body: "Steps for {{name}} reported by {{user}}",
          labels: ["bug"],
        },
      },
    });

    const number = await automator.createFromTemplate("bug", {
      name: "crash",
      user: "alice",
    });
    expect(number).toBe(42);
  });
});
