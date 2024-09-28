import {Layout, Model, TabNode, IJsonModel} from 'flexlayout-react';
import { Editor } from "@monaco-editor/react";
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

function App() {
  const componentFactory = (node: TabNode) => {
    var component = node.getComponent();
    if (component === "editor") {
      return <Editor height={600} />;
    }
  }

  return (
    <Layout model={layoutModel} factory={componentFactory} />
  );
}

export default App;
