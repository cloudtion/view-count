export { createViewCounter, COLORS } from "./counter";
export type {
  ViewCounterOptions,
  ViewCounter,
  RequestLike,
  ResponseLike,
  CounterMode,
} from "./counter";
export { generateSvg, DEFAULT_STYLE } from "./svg";
export type { StyleOptions, ColorName } from "./svg";
export type { FirebaseConfig, PageStats } from "./firebase";

// Firebase Functions exports
export { views, visitors } from "./functions";
