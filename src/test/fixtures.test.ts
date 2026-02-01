/**
 * Fixture-based declarative tests - Uses real parser.
 *
 * Each fixture folder contains a pair of files:
 * - input.{lang}.txt: Source code (e.g., input.ts.txt, input.json.txt)
 * - expected.{lang}.txt: Expected alignment output with · for padding
 *
 * The language is extracted from the filename extension.
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

// Map file extensions to VSCode language IDs
const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  json: "json",
  jsonc: "jsonc",
  yaml: "yaml",
  yml: "yaml",
  py: "python",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
};

/**
 * Find input/expected file pair in a fixture directory.
 * Returns { inputPath, expectedPath, languageId } or null if not found.
 */
function findFixtureFiles(
  dir: string
): { inputPath: string; expectedPath: string; languageId: string } | null {
  const files = fs.readdirSync(dir);

  // Look for input.{lang}.txt pattern
  for (const file of files) {
    const match = file.match(/^input\.(\w+)\.txt$/);
    if (match) {
      const ext = match[1];
      const expectedFile = `expected.${ext}.txt`;
      const expectedPath = path.join(dir, expectedFile);

      if (fs.existsSync(expectedPath)) {
        const languageId = EXT_TO_LANG[ext] || ext;
        return {
          inputPath: path.join(dir, file),
          expectedPath,
          languageId,
        };
      }
    }
  }

  return null;
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
function collectFixtures(): Array<{
  dir: string;
  inputPath: string;
  expectedPath: string;
  languageId: string;
}> {
  const fixtures: Array<{
    dir: string;
    inputPath: string;
    expectedPath: string;
    languageId: string;
  }> = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdir = path.join(dir, entry.name);
        const fixtureFiles = findFixtureFiles(subdir);

        if (fixtureFiles) {
          fixtures.push({ dir: subdir, ...fixtureFiles });
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
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>()
          .event,
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

  for (const fixture of fixtures) {
    const fixtureName = path.relative(FIXTURES_DIR, fixture.dir);

    test(fixtureName, async () => {
      const inputContent = fs.readFileSync(fixture.inputPath, "utf-8");
      const expectedContent = fs.readFileSync(fixture.expectedPath, "utf-8");

      // Create a virtual document
      const doc = await vscode.workspace.openTextDocument({
        content: inputContent,
        language: fixture.languageId,
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
