import { Editor, OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { editor } from "monaco-editor";

export function MonacoEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editorOnMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.layout();
  };

  useEffect(() => {
    const currentContainer = containerRef.current;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        editorRef.current?.layout();
      }, 0);
    });

    if (currentContainer) {
      resizeObserver.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Editor
        options={{
          minimap: { enabled: false },
          automaticLayout: false,
        }}
        onMount={editorOnMount}
      />
    </div>
  );
}
