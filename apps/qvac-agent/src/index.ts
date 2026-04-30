export type QvacAgentStarter = {
  status: "idle";
  message: string;
};

const starter: QvacAgentStarter = {
  status: "idle",
  message: "QVAC agent scaffold is ready."
};

console.log(starter);
