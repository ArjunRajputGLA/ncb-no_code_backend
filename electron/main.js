// main.js (Updated Electron main process)
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const AIBackendGenerator = require("../backend/ai-agent");

let mainWindow;
let aiAgent;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const startUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../out/index.html")}`;
  
  mainWindow.loadURL(startUrl);

  mainWindow.on("closed", () => (mainWindow = null));
};

// Initialize AI agent when app is ready
app.on("ready", () => {
  createWindow();
  
  // Initialize AI agent with Groq API key
  // You should store this securely or prompt user for it
  const groqApiKey = process.env.GROQ_API_KEY || 'your-groq-api-key';
  aiAgent = new AIBackendGenerator(groqApiKey);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// IPC handlers for AI backend generation
ipcMain.handle('generate-backend', async (event, workflowData, projectName) => {
  try {
    console.log('🤖 Starting backend generation for:', projectName);
    
    // Show progress to user
    mainWindow.webContents.send('generation-progress', {
      stage: 'analyzing',
      message: 'Analyzing workflow...'
    });

    const result = await aiAgent.generateBackend(workflowData, projectName);
    
    if (result.success) {
      mainWindow.webContents.send('generation-progress', {
        stage: 'completed',
        message: 'Backend generated successfully!',
        result
      });
    } else {
      mainWindow.webContents.send('generation-progress', {
        stage: 'error',
        message: `Generation failed: ${result.error}`,
        result
      });
    }

    return result;
  } catch (error) {
    console.error('Backend generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('start-generated-server', async (event, projectPath) => {
  try {
    const serverProcess = await aiAgent.startGeneratedServer(projectPath);
    return {
      success: true,
      pid: serverProcess.pid,
      message: 'Server started successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('test-generated-api', async (event, projectPath, analysis) => {
  try {
    const testResults = await aiAgent.testGeneratedAPI(projectPath, analysis);
    return {
      success: true,
      testResults
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('select-project-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select project directory'
  });
  
  return result;
});

ipcMain.handle('get-groq-api-key', async () => {
  // Return stored API key or prompt user
  return process.env.GROQ_API_KEY || null;
});

ipcMain.handle('set-groq-api-key', async (event, apiKey) => {
  // Store API key securely (you might want to use a proper secret storage)
  process.env.GROQ_API_KEY = apiKey;
  
  // Reinitialize AI agent with new key
  aiAgent = new AIBackendGenerator(apiKey);
  
  return { success: true };
});