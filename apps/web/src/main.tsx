import { createRoot } from "react-dom/client";
import App from "./App";
import { initDeviceAuth } from "./lib/deviceAuth";
import "./index.css";

initDeviceAuth();

createRoot(document.getElementById("root")!).render(<App />);
