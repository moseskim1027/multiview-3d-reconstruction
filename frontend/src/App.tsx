import { useEffect, useRef, useState } from "react";
import { ImageUpload } from "./components/ImageUpload";
import { MetricsPanel } from "./components/MetricsPanel";
import { PointCloudViewer } from "./components/PointCloudViewer";
import { runReconstruction } from "./api/reconstruction";
import type { AppState } from "./types";

export function App() {
  const [state, setState] = useState<AppState>({ phase: "idle" });
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | undefined>();

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSidebarHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSubmit = async (im0: File, im1: File, calib?: File) => {
    setState({ phase: "loading" });
    try {
      const result = await runReconstruction(im0, im1, calib);
      setState({ phase: "success", result });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const isLoading = state.phase === "loading";

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.title}>Multiview 3D Reconstruction</h1>
            <p style={styles.subtitle}>
              Stereo image pair → SIFT matching → DLT triangulation → interactive point cloud
            </p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Left sidebar — upload only */}
        <aside ref={sidebarRef} style={styles.sidebar}>
          <ImageUpload onSubmit={handleSubmit} isLoading={isLoading} />

          {state.phase === "error" && (
            <div style={styles.errorBox}>
              <strong>Error</strong>
              <p style={styles.errorText}>{state.message}</p>
            </div>
          )}
        </aside>

        {/* Centre — 3D viewer */}
        <section style={styles.viewer}>
          {state.phase === "idle" && (
            <div style={styles.placeholder}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <p style={styles.placeholderText}>
                Upload a stereo image pair to see the 3D reconstruction
              </p>
            </div>
          )}

          {state.phase === "loading" && (
            <div style={styles.placeholder}>
              <div style={styles.spinner} />
              <p style={styles.placeholderText}>Running reconstruction pipeline…</p>
            </div>
          )}

          {state.phase === "success" && (
            <PointCloudViewer points={state.result.points} colors={state.result.colors} />
          )}
        </section>

        {/* Right panel — metrics (only when results are available) */}
        {state.phase === "success" && (
          <aside style={{ ...styles.metricsPanel, height: sidebarHeight }}>
            <MetricsPanel metrics={state.result.metrics} />
          </aside>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#0f1117",
  },
  header: {
    borderBottom: "1px solid #1e293b",
    padding: "0 32px",
  },
  headerInner: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "20px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  main: {
    flex: 1,
    display: "flex",
    gap: 24,
    padding: "24px 32px",
    maxWidth: 1400,
    margin: "0 auto",
    width: "100%",
    alignItems: "flex-start",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: 320,
    flexShrink: 0,
  },
  metricsPanel: {
    width: 220,
    flexShrink: 0,
  },
  viewer: {
    flex: 1,
    display: "flex",
    alignItems: "stretch",
    minHeight: 480,
    borderRadius: 12,
    overflow: "hidden",
  },
  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    background: "#1a1f2e",
    borderRadius: 12,
    border: "1px dashed #1e293b",
    minHeight: 480,
    padding: 32,
  },
  placeholderText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 1.5,
  },
  errorBox: {
    background: "#1a1010",
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    padding: "14px 18px",
  },
  errorText: {
    fontSize: 13,
    color: "#fca5a5",
    marginTop: 6,
    wordBreak: "break-word",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid #1e293b",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
