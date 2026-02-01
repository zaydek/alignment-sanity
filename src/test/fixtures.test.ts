/**
 * Fixture-based declarative tests v2 - Uses real parser.
 *
 * Each fixture folder contains:
 * - input.txt: Source code
 * - expected.txt: Expected alignment output (visual format with · for spaces)
 * - config.txt: Language configuration (languageId: typescript)
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { groupTokens } from "../logic/Grouper";
import { ParserService } from "../parsing/ParserService";

// Path to fixtures (src/test/fixtures from project root)
const FIXTURES_DIR = path.join(__dirname, "..", "..", "src", "test", "fixtures");

// Shared parser instance (initialized once)
let parserService: ParserService | null = null;

/**
 * Parse config.txt to get languageId.
 */
function parseConfig(content: string): { languageId: string } {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^languageId:\s*(\S+)/);
    if (match) {
      return { languageId: match[1] };
    }
  }
  return { languageId: "typescript" }; // default
}

/**
 * Apply alignment groups to source lines to produce visual output.
 * Uses · to represent virtual padding spaces.
 */
function applyAlignment(
  sourceLines: string[],
  groups: ReturnType<typeof groupTokens>
): string[] {
  // Track padding to add at each (line, column) position
  const paddingMap = new Map<string, number>();

  for (const group of groups) {
    for (const token of group.tokens) {
      let spacesNeeded: number;
      let insertColumn: number;

      if (group.padAfter) {
        // Pad after the token
        const endColumn = token.column + token.text.length;
        spacesNeeded = group.targetColumn - endColumn;
        insertColumn = endColumn;
      } else {
        // Pad before the token
        spacesNeeded = group.targetColumn - token.column;
        insertColumn = token.column;
      }

      if (spacesNeeded > 0) {
        const key = `${token.line}:${insertColumn}`;
        const existing = paddingMap.get(key) ?? 0;
        paddingMap.set(key, Math.max(existing, spacesNeeded));
      }
    }
  }

  // Apply padding to each line
  const result: string[] = [];
  for (let lineIdx = 0; lineIdx < sourceLines.length; lineIdx++) {
    let line = sourceLines[lineIdx];

    // Collect all padding for this line, sorted by column (descending)
    const linePaddings: Array<{ column: number; spaces: number }> = [];
    for (const [key, spaces] of paddingMap) {
      const [l, c] = key.split(":").map(Number);
      if (l === lineIdx) {
        linePaddings.push({ column: c, spaces });
      }
    }
    linePaddings.sort((a, b) => b.column - a.column);

    // Insert padding (from right to left)
    for (const { column, spaces } of linePaddings) {
      const before = line.slice(0, column);
      const after = line.slice(column);
      line = before + "·".repeat(spaces) + after;
    }

    result.push(line);
  }

  return result;
}

/**
 * Collect all fixture directories.
 */
function collectFixtures(): string[] {
  const fixtures: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdir = path.join(dir, entry.name);
        // Check if this is a fixture (has input.txt and expected.txt)
        if (
          fs.existsSync(path.join(subdir, "input.txt")) &&
          fs.existsSync(path.join(subdir, "expected.txt"))
        ) {
          fixtures.push(subdir);
        } else {
          walk(subdir);
        }
      }
    }
  }

  walk(FIXTURES_DIR);
  return fixtures;
}

suite("Fixture Tests", () => {
  // Initialize parser before all tests
  suiteSetup(async () => {
    // Create a mock extension context
    const mockContext = {
      extensionPath: path.join(__dirname, "..", ".."),
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        setKeysForSync: () => {},
      },
      extensionUri: vscode.Uri.file(path.join(__dirname, "..", "..")),
      storageUri: undefined,
      globalStorageUri: vscode.Uri.file("/tmp"),
      logUri: vscode.Uri.file("/tmp"),
      extensionMode: vscode.ExtensionMode.Test,
      storagePath: undefined,
      globalStoragePath: "/tmp",
      logPath: "/tmp",
      asAbsolutePath: (p: string) => path.join(__dirname, "..", "..", p),
      environmentVariableCollection: {} as vscode.GlobalEnvironmentVariableCollection,
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
      },
      extension: {} as vscode.Extension<unknown>,
    } as unknown as vscode.ExtensionContext;

    parserService = new ParserService(mockContext);
    await parserService.initialize();
  });

  // Dispose parser after all tests
  suiteTeardown(() => {
    if (parserService) {
      parserService.dispose();
      parserService = null;
    }
  });

  const fixtures = collectFixtures();

  for (const fixtureDir of fixtures) {
    const fixtureName = path.relative(FIXTURES_DIR, fixtureDir);

    test(fixtureName, async () => {
      // Read fixture files
      const inputPath = path.join(fixtureDir, "input.txt");
      const expectedPath = path.join(fixtureDir, "expected.txt");
      const configPath = path.join(fixtureDir, "config.txt");

      const inputContent = fs.readFileSync(inputPath, "utf-8");
      const expectedContent = fs.readFileSync(expectedPath, "utf-8");
      const config = fs.existsSync(configPath)
        ? parseConfig(fs.readFileSync(configPath, "utf-8"))
        : { languageId: "typescript" };

      // Create a virtual document
      const doc = await vscode.workspace.openTextDocument({
        content: inputContent,
        language: config.languageId,
      });

      // Parse document
      const tokens = await parserService!.parse(doc, 0, doc.lineCount - 1);

      // Group tokens
      const groups = groupTokens(tokens);

      // Apply alignment to source
      const sourceLines = inputContent.split("\n");
      const actualLines = applyAlignment(sourceLines, groups);
      const actual = actualLines.join("\n");

      // Compare to expected
      assert.strictEqual(
        actual,
        expectedContent,
        `Fixture ${fixtureName} failed.\n\nActual:\n${actual}\n\nExpected:\n${expectedContent}`
      );
    });
  }
});
