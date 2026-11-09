import React from "react";
import ReactDOM from "react-dom/client";
import { lazy, Suspense } from "react";
const App = window.location.pathname.startsWith("/original")
  ? lazy(() => import("./rebirth/App"))
  : lazy(() => import("./experiments/App"));


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<p>Loading…</p>}><App /></Suspense>
  </React.StrictMode>,
);
