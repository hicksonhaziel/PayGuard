import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("payguardDesktop", {
  starterMessage: "Electron React + Tailwind starter is running."
});
