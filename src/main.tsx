import React from "react";
import ReactDOM from "react-dom/client";
import { lazy, Suspense } from "react";
const App = lazy(() => import("./clicker/App"));


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<p>Loading…</p>}><App /></Suspense>
  </React.StrictMode>,
);
