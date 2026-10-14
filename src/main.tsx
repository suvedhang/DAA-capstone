import * as React from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DatasetProvider } from "@/hooks/useDataset";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root container #root not found");

createRoot(container).render(
  <React.StrictMode>
    <DatasetProvider>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </DatasetProvider>
  </React.StrictMode>,
);
