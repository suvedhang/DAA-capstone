import * as React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/states";

const OverviewPage = React.lazy(() => import("@/modules/overview/OverviewPage"));
const NetworkPage = React.lazy(() => import("@/modules/network/NetworkPage"));
const AllocationPage = React.lazy(() => import("@/modules/allocation/AllocationPage"));
const RecoveryPage = React.lazy(() => import("@/modules/recovery/RecoveryPage"));
const ConservationPage = React.lazy(() => import("@/modules/conservation/ConservationPage"));
const AlgorithmLabPage = React.lazy(() => import("@/modules/algorithm-lab/AlgorithmLabPage"));
const NotFoundPage = React.lazy(() => import("@/modules/NotFoundPage"));

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingState label="Loading module…" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <React.Suspense fallback={<PageFallback />}>
                <OverviewPage />
              </React.Suspense>
            }
          />
          <Route
            path="network"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <NetworkPage />
              </React.Suspense>
            }
          />
          <Route
            path="allocation"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <AllocationPage />
              </React.Suspense>
            }
          />
          <Route
            path="recovery"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <RecoveryPage />
              </React.Suspense>
            }
          />
          <Route
            path="conservation"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <ConservationPage />
              </React.Suspense>
            }
          />
          <Route
            path="lab"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <AlgorithmLabPage />
              </React.Suspense>
            }
          />
          <Route
            path="*"
            element={
              <React.Suspense fallback={<PageFallback />}>
                <NotFoundPage />
              </React.Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
