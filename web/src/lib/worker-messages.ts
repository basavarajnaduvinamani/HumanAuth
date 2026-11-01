import { CheckResult, Modality } from "./types";
export type WorkerRequest = {
  id: number;
  name: Modality;
  bytes: ArrayBuffer;
  claimed?: string;
};
export type WorkerResponse =
  | {
      id: number;
      type: "progress";
      file: string;
      loaded: number;
      total: number;
      cached: boolean;
    }
  | { id: number; type: "result"; result: CheckResult }
  | { id: number; type: "error"; message: string };
