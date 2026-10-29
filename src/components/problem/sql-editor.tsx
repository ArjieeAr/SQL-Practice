"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable, Position } from "monaco-editor";
import { useEffect, useRef } from "react";

import type { SampleTable } from "@/lib/problems/preview";

type Monaco = Parameters<BeforeMount>[0];

const THEME = "sql-practice-dark";
const MARKER_OWNER = "sql-practice";

const KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "DISTINCT",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "INNER JOIN",
  "CROSS JOIN",
  "ON",
  "USING",
  "AS",
  "UNION",
  "UNION ALL",
  "INTERSECT",
  "EXCEPT",
  "WITH",
  "WITH RECURSIVE",
  "LATERAL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "AND",
  "OR",
  "NOT",
  "IN",
  "EXISTS",
  "BETWEEN",
  "LIKE",
  "ILIKE",
  "IS NULL",
  "IS NOT NULL",
  "IS DISTINCT FROM",
  "NULLS FIRST",
  "NULLS LAST",
  "ASC",
  "DESC",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "ROUND",
  "COALESCE",
  "NULLIF",
  "CAST",
  "EXTRACT",
  "DATE_TRUNC",
  "INTERVAL",
  "GENERATE_SERIES",
  "FILTER",
  "OVER",
  "PARTITION BY",
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK",
  "NTILE",
  "LAG",
  "LEAD",
  "FIRST_VALUE",
  "LAST_VALUE",
  "ROWS",
  "RANGE",
  "UNBOUNDED PRECEDING",
  "CURRENT ROW",
  "FOLLOWING",
];

export interface EditorError {
  message: string;
  /** 1-based character offset into the query, from Postgres. */
  position?: number;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  tables: SampleTable[];
  error: EditorError | null;
}

export default function SqlEditor({ value, onChange, onRun, tables, error }: SqlEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  // Monaco callbacks are registered once; refs let them see the latest props.
  const onRunRef = useRef(onRun);
  const tablesRef = useRef(tables);
  const disposables = useRef<IDisposable[]>([]);

  useEffect(() => {
    onRunRef.current = onRun;
    tablesRef.current = tables;
  });

  useEffect(() => () => disposables.current.forEach((d) => d.dispose()), []);

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme(THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: { "editor.background": "#14181e", "editor.lineHighlightBackground": "#1b2027" },
    });
  };

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addAction({
      id: "run-query",
      label: "Run query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRunRef.current(),
    });

    // Suggest this problem's tables and columns alongside SQL keywords.
    disposables.current.push(
      monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems(model: MonacoEditor.ITextModel, position: Position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const kinds = monaco.languages.CompletionItemKind;
          const suggestions = [
            ...tablesRef.current.map((table) => ({
              label: table.name,
              kind: kinds.Class,
              detail: "table",
              insertText: table.name,
              range,
            })),
            ...tablesRef.current.flatMap((table) =>
              table.columns.map((column) => ({
                label: column.name,
                kind: kinds.Field,
                detail: `${table.name}.${column.name}: ${column.type}`,
                insertText: column.name,
                range,
              })),
            ),
            ...KEYWORDS.map((keyword) => ({
              label: keyword,
              kind: kinds.Keyword,
              insertText: keyword,
              range,
            })),
          ];
          return { suggestions };
        },
      }),
    );
    editor.focus();
  };

  // Underline the token Postgres complained about.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    if (!error?.position) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
      return;
    }
    const start = model.getPositionAt(error.position - 1);
    const word = model.getWordAtPosition(start);
    monaco.editor.setModelMarkers(model, MARKER_OWNER, [
      {
        severity: monaco.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: start.lineNumber,
        startColumn: word?.startColumn ?? start.column,
        endLineNumber: start.lineNumber,
        endColumn: word?.endColumn ?? start.column + 1,
      },
    ]);
  }, [error]);

  return (
    <Editor
      language="sql"
      theme={THEME}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      beforeMount={beforeMount}
      onMount={onMount}
      loading={<div className="text-muted p-4 text-sm">Loading editor…</div>}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 12 },
        renderLineHighlight: "line",
      }}
    />
  );
}
