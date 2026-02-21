import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Keyframe for the loading spinner
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
