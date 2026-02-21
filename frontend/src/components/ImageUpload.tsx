import { useEffect, useRef, useState } from "react";

interface FileInputProps {
  label: string;
  accept: string;
  required?: boolean;
  value?: File;
  onChange: (file: File | undefined) => void;
}

function FileInput({ label, accept, required = false, value, onChange }: FileInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>(value?.name ?? "No file selected");

  // Sync display name when a file is loaded externally (e.g. sample data)
  useEffect(() => {
    setName(value?.name ?? "No file selected");
  }, [value]);

  const handleChange = () => {
    const file = ref.current?.files?.[0];
    setName(file?.name ?? "No file selected");
    onChange(file);
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </label>
      <div
        style={styles.dropZone}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) {
            onChange(file);
            setName(file.name);
          }
        }}
      >
        <span style={styles.fileName}>{name}</span>
        <span style={styles.browse}>Browse / Drop</span>
      </div>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
    </div>
  );
}

interface ImageUploadProps {
  onSubmit: (im0: File, im1: File, calib?: File) => void;
  isLoading: boolean;
}

export function ImageUpload({ onSubmit, isLoading }: ImageUploadProps) {
  const [im0, setIm0] = useState<File | undefined>();
  const [im1, setIm1] = useState<File | undefined>();
  const [calib, setCalib] = useState<File | undefined>();
  const [loadingSample, setLoadingSample] = useState(false);

  const canSubmit = !!im0 && !!im1 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (im0 && im1) onSubmit(im0, im1, calib);
  };

  const loadSample = async () => {
    setLoadingSample(true);
    try {
      const [r0, r1, rc] = await Promise.all([
        fetch("/samples/im0.png"),
        fetch("/samples/im1.png"),
        fetch("/samples/calib.txt"),
      ]);
      const [b0, b1, bc] = await Promise.all([r0.blob(), r1.blob(), rc.blob()]);
      setIm0(new File([b0], "im0.png", { type: "image/png" }));
      setIm1(new File([b1], "im1.png", { type: "image/png" }));
      setCalib(new File([bc], "calib.txt", { type: "text/plain" }));
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>Upload Stereo Pair</h2>
        <button
          type="button"
          onClick={loadSample}
          disabled={loadingSample || isLoading}
          style={loadingSample || isLoading ? styles.sampleBtnDisabled : styles.sampleBtn}
        >
          {loadingSample ? "Loading…" : "Load sample data"}
        </button>
      </div>

      <FileInput label="Left image (im0)" accept="image/*" required value={im0} onChange={setIm0} />
      <FileInput label="Right image (im1)" accept="image/*" required value={im1} onChange={setIm1} />
      <FileInput
        label="Calibration file (calib.txt)"
        accept=".txt,text/plain"
        value={calib}
        onChange={setCalib}
      />
      <p style={styles.hint}>
        Calibration file is optional — intrinsics will be estimated from image size if omitted.
      </p>

      <button type="submit" disabled={!canSubmit} style={canSubmit ? styles.btn : styles.btnDisabled}>
        {isLoading ? "Reconstructing…" : "Run Reconstruction"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    background: "#1a1f2e",
    borderRadius: 12,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 320,
  },
  headingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: "#e2e8f0",
    margin: 0,
  },
  sampleBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#0f1117",
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  sampleBtnDisabled: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #1e293b",
    background: "#0f1117",
    color: "#475569",
    fontSize: 12,
    fontWeight: 500,
    cursor: "not-allowed",
    whiteSpace: "nowrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#94a3b8",
  },
  required: {
    color: "#f87171",
  },
  dropZone: {
    border: "1.5px dashed #334155",
    borderRadius: 8,
    padding: "12px 16px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0f1117",
    transition: "border-color 0.2s",
  },
  fileName: {
    fontSize: 13,
    color: "#cbd5e1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "65%",
  },
  browse: {
    fontSize: 12,
    color: "#60a5fa",
    whiteSpace: "nowrap",
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.4,
  },
  btn: {
    marginTop: 8,
    padding: "12px 0",
    borderRadius: 8,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  btnDisabled: {
    marginTop: 8,
    padding: "12px 0",
    borderRadius: 8,
    border: "none",
    background: "#1e293b",
    color: "#475569",
    fontWeight: 600,
    fontSize: 15,
    cursor: "not-allowed",
  },
};
