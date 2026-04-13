/// <reference types="vite/client" />

import type { MilkySeaApi } from '../shared/types/ipc';

declare global {
  interface Window {
    milkySea: MilkySeaApi;
  }
}

export {};
