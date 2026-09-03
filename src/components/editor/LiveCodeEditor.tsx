import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

interface LiveCodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
}

const extensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
];

export function LiveCodeEditor({ value, onChange }: LiveCodeEditorProps) {
  return (
    <div className="flex h-full w-full flex-col relative bg-transparent overflow-hidden">
      <div className="flex-1 overflow-auto relative group">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={onChange}
          className="h-full w-full text-sm font-mono [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:p-4"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
        
        {/* Editor Badge */}
        <div className="absolute top-4 right-4 bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-1 border-2 border-primary opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10">
          Editing
        </div>
      </div>
    </div>
  );
}
