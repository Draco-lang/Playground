import {Layout, Model, TabNode, IJsonModel} from 'flexlayout-react';
import { Editor, OnMount } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import 'flexlayout-react/style/light.css';

var layoutDescription : IJsonModel= {
  global: {},
  borders: [],
  layout: {
      type: "row",
      weight: 100,
      children: [
          {
              type: "tabset",
              weight: 50,
              children: [
                  {
                      type: "tab",
                      name: "One",
                      component: "editor",
                  }
              ]
          },
          {
              type: "tabset",
              weight: 50,
              children: [
                  {
                      type: "tab",
                      name: "Two",
                      component: "editor",
                  }
              ]
          }
      ]
  }
};

const layoutModel = Model.fromJson(layoutDescription);

const editorOnMount: OnMount = (editor, monaco) => {
  editor.layout();
};

function App() {
  const componentFactory = (node: TabNode) => {
    var component = node.getComponent();
    if (component === "editor") {
      const options: editor.IStandaloneEditorConstructionOptions = {
        automaticLayout: false,
        minimap: {
          enabled: false,
        },
      };
      return <Editor options={options} onMount={editorOnMount} />;
    }
  }

  return (
    <Layout model={layoutModel} factory={componentFactory} />
  );
}

export default App;
