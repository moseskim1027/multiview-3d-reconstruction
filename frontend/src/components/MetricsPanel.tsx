import type { ReconstructionMetrics } from "../types";

interface MetricRowProps {
  label: string;
  value: string | number;
  description: string;
  highlight?: boolean;
}

function MetricRow({ label, value, description, highlight = false }: MetricRowProps) {
  return (
    <div style={styles.row} title={description}>
      <span style={styles.label}>{label}</span>
      <span style={highlight ? styles.valueHighlight : styles.value}>{value}</span>
    </div>
  );
}

interface MetricsPanelProps {
  metrics: ReconstructionMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const inlierPct = (metrics.inlier_ratio * 100).toFixed(1);

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>Reconstruction Metrics</h3>

      <div style={styles.section}>
        <p style={styles.sectionLabel}>Quality</p>
        <MetricRow
          label="Reprojection RMSE"
          value={`${metrics.reprojection_rmse.toFixed(3)} px`}
          description="Root-mean-square reprojection error in pixels onto camera-2 image plane. Lower is better."
          highlight
        />
        <MetricRow
          label="Inlier ratio"
          value={`${inlierPct}%`}
          description="Fraction of SIFT matches that survived RANSAC. Higher is better."
        />
      </div>

      <div style={styles.section}>
        <p style={styles.sectionLabel}>Feature Matching</p>
        <MetricRow
          label="SIFT matches"
          value={metrics.num_keypoints_matched}
          description="Number of good SIFT matches after Lowe's ratio test."
        />
        <MetricRow
          label="RANSAC inliers"
          value={metrics.num_inliers}
          description="Number of correspondences that are consistent with the estimated fundamental matrix."
        />
      </div>

      <div style={styles.section}>
        <p style={styles.sectionLabel}>Point Cloud</p>
        <MetricRow
          label="3D points"
          value={metrics.num_3d_points}
          description="Total number of triangulated 3D points."
        />
        <MetricRow
          label="Mean depth"
          value={metrics.mean_depth.toFixed(4)}
          description="Average depth (Z coordinate) of the reconstructed scene."
        />
        <MetricRow
          label="Depth range"
          value={metrics.depth_range.toFixed(4)}
          description="Depth extent of the reconstructed point cloud (max Z − min Z)."
        />
        <MetricRow
          label="Baseline length"
          value={metrics.baseline_length.toFixed(4)}
          description="Estimated camera baseline magnitude (translation vector norm)."
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "#1a1f2e",
    borderRadius: 12,
    padding: "16px",
    minWidth: 0,
  },
  heading: {
    fontSize: 16,
    fontWeight: 600,
    color: "#e2e8f0",
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#475569",
    marginBottom: 8,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #1e293b",
    cursor: "help",
  },
  label: {
    fontSize: 13,
    color: "#94a3b8",
  },
  value: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
    fontVariantNumeric: "tabular-nums",
  },
  valueHighlight: {
    fontSize: 13,
    fontWeight: 700,
    color: "#34d399",
    fontVariantNumeric: "tabular-nums",
  },
};
