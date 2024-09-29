import { Layout, Model, TabNode, IJsonModel } from "flexlayout-react";
import "flexlayout-react/style/light.css";
import { MonacoEditor } from "./MonacoEditor";

const layoutDescription: IJsonModel = {
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
          },
        ],
      },
      {
        type: "tabset",
        weight: 50,
        children: [
          {
            type: "tab",
            name: "Two",
            component: "editor",
          },
        ],
      },
    ],
  },
};

const layoutModel = Model.fromJson(layoutDescription);

function App() {
  const componentFactory = (node: TabNode) => {
    const component = node.getComponent();

    if (component === "editor") {
      return <MonacoEditor />;
    }
    return null;
  };

  return <Layout model={layoutModel} factory={componentFactory} />;
}

export default App;
