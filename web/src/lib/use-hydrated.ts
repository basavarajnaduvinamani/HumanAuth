"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;
// Keep server-rendered controls inert until their React handlers are attached.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
