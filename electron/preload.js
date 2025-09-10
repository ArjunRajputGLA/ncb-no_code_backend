// preload.js (Updated version with file system API)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend generation (existing)
  generateBackend: (workflowData, projectName) => 
    ipcRenderer.invoke('generate-backend', workflowData, projectName),
  
  // Server management (existing)
  startGeneratedServer: (projectPath) => 
    ipcRenderer.invoke('start-generated-server', projectPath),
  
  // API testing (existing)
  testGeneratedAPI: (projectPath, analysis) => 
    ipcRenderer.invoke('test-generated-api', projectPath, analysis),
  
  // File system operations (existing)
  selectProjectDirectory: () => 
    ipcRenderer.invoke('select-project-directory'),
  
  // API key management (existing)
  getGroqApiKey: () => 
    ipcRenderer.invoke('get-groq-api-key'),
  
  setGroqApiKey: (apiKey) => 
    ipcRenderer.invoke('set-groq-api-key', apiKey),
  
  // Listen to generation progress (existing)
  onGenerationProgress: (callback) => 
    ipcRenderer.on('generation-progress', (event, data) => callback(data)),
  
  // Remove listeners (existing)
  removeAllListeners: (channel) => 
    ipcRenderer.removeAllListeners(channel),

  // FILE SYSTEM API (NEW)
  
  // Directory operations
  selectDirectory: () => 
    ipcRenderer.invoke('select-directory'),
  
  readDirectory: (dirPath) => 
    ipcRenderer.invoke('read-directory', dirPath),
  
  createDirectory: (dirPath) => 
    ipcRenderer.invoke('create-directory', dirPath),
  
  getHomeDirectory: () => 
    ipcRenderer.invoke('get-home-directory'),
  
  // File operations
  readFile: (filePath, encoding = 'utf8') => 
    ipcRenderer.invoke('read-file', filePath, encoding),
  
  writeFile: (filePath, content, encoding = 'utf8') => 
    ipcRenderer.invoke('write-file', filePath, content, encoding),
  
  deleteFile: (filePath) => 
    ipcRenderer.invoke('delete-file', filePath),
  
  getFileStats: (filePath) => 
    ipcRenderer.invoke('get-file-stats', filePath),
  
  pathExists: (targetPath) => 
    ipcRenderer.invoke('path-exists', targetPath)
});