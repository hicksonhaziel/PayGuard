import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("payguardDesktop", {
  starterMessage: "Electron TypeScript starter is running."
});
