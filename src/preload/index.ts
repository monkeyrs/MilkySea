import { contextBridge, ipcRenderer } from 'electron';

import type { MilkySeaApi } from '../shared/types/ipc';

const api: MilkySeaApi = {
  workspace: {
    openDirectory: (payload) => ipcRenderer.invoke('workspace:openDirectory', payload),
    openFile: (payload) => ipcRenderer.invoke('workspace:openFile', payload),
    resolvePath: (payload) => ipcRenderer.invoke('workspace:resolvePath', payload),
    listDocuments: (payload) => ipcRenderer.invoke('workspace:listDocuments', payload),
  },
  document: {
    create: (payload) => ipcRenderer.invoke('document:create', payload),
    load: (payload) => ipcRenderer.invoke('document:load', payload),
    save: (payload) => ipcRenderer.invoke('document:save', payload),
  },
  assets: {
    saveImage: (payload) => ipcRenderer.invoke('assets:saveImage', payload),
  },
  export: {
    documentAst: (payload) => ipcRenderer.invoke('export:documentAst', payload),
    diagramJson: (payload) => ipcRenderer.invoke('export:diagramJson', payload),
  },
  recovery: {
    loadDraft: (payload) => ipcRenderer.invoke('recovery:loadDraft', payload),
    clearDraft: (payload) => ipcRenderer.invoke('recovery:clearDraft', payload),
  },
};

contextBridge.exposeInMainWorld('milkySea', api);
