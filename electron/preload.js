// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend generation
  generateBackend: (workflowData, projectName) => 
    ipcRenderer.invoke('generate-backend', workflowData, projectName),
  
  // Server management
  startGeneratedServer: (projectPath) => 
    ipcRenderer.invoke('start-generated-server', projectPath),
  
  // API testing
  testGeneratedAPI: (projectPath, analysis) => 
    ipcRenderer.invoke('test-generated-api', projectPath, analysis),
  
  // File system operations
  selectProjectDirectory: () => 
    ipcRenderer.invoke('select-project-directory'),
  
  // API key management
  getGroqApiKey: () => 
    ipcRenderer.invoke('get-groq-api-key'),
  
  setGroqApiKey: (apiKey) => 
    ipcRenderer.invoke('set-groq-api-key', apiKey),
  
  // Listen to generation progress
  onGenerationProgress: (callback) => 
    ipcRenderer.on('generation-progress', (event, data) => callback(data)),
  
  // Remove listeners
  removeAllListeners: (channel) => 
    ipcRenderer.removeAllListeners(channel)
});