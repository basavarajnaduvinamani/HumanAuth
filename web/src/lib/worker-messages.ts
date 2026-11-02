import { CheckResult, Modality } from "./types";
import type { SampleSpeaker } from "./synthetic-speech";
export type WorkerRequest = {
  id: number;
  name: Modality;
  bytes: ArrayBuffer;
  claimed?: string;
  synthetic?: { speaker: SampleSpeaker; phrase: number };
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
