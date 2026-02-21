import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";

interface PointCloudProps {
  points: number[][];
  colors: number[][];
  pointSize: number;
}

/**
 * Inner Three.js scene component — builds a BufferGeometry with position and
 * colour attributes and renders it as a THREE.Points object.
 */
function PointCloud({ points, colors, pointSize }: PointCloudProps) {
  const ref = useRef<THREE.Points>(null);

  // Build typed arrays once whenever the data changes
  const { positions, colorArray } = useMemo(() => {
    const n = points.length;
    const positions = new Float32Array(n * 3);
    const colorArray = new Float32Array(n * 3);

    // Compute centroid for auto-centering
    let cx = 0,
      cy = 0,
      cz = 0;
    for (const [x, y, z] of points) {
      cx += x;
      cy += y;
      cz += z;
    }
    cx /= n;
    cy /= n;
    cz /= n;

    for (let i = 0; i < n; i++) {
      const [x, y, z] = points[i];
      positions[i * 3] = x - cx;
      positions[i * 3 + 1] = y - cy;
      positions[i * 3 + 2] = z - cz;

      const [r, g, b] = colors[i];
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    return { positions, colorArray };
  }, [points, colors]);

  // Gentle auto-rotation when idle
  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
}

interface PointCloudViewerProps {
  points: number[][];
  colors: number[][];
}

/**
 * Full-featured 3D point cloud viewer with orbit controls and a gizmo.
 * Drag to rotate, scroll to zoom, right-click to pan.
 */
export function PointCloudViewer({ points, colors }: PointCloudViewerProps) {
  const pointSize = Math.max(0.005, 0.5 / Math.cbrt(points.length));

  return (
    <div style={styles.container}>
      <div style={styles.badge}>
        {points.length.toLocaleString()} points · drag to rotate · scroll to zoom
      </div>
      <Canvas
        style={styles.canvas}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#0f1117"));
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={60} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />

        <PointCloud points={points} colors={colors} pointSize={pointSize} />

        {/* Axes helper in top-right corner */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#f87171", "#34d399", "#60a5fa"]}
            labelColor="white"
          />
        </GizmoHelper>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    width: "100%",
    flex: 1,
    minHeight: 480,
    borderRadius: 12,
    overflow: "hidden",
    background: "#0f1117",
    border: "1px solid #1e293b",
  },
  canvas: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    fontSize: 11,
    color: "#64748b",
    background: "rgba(15,17,23,0.8)",
    borderRadius: 6,
    padding: "4px 10px",
    pointerEvents: "none",
  },
};
