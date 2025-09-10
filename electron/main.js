// main.js (Updated Electron main process)
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const AIBackendGenerator = require("../backend/ai-agent");
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

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

ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Directory'
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    return {
      success: true,
      path: result.filePaths[0],
      canceled: false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const fileItems = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      let stats = null;
      
      try {
        stats = await fs.stat(fullPath);
      } catch (error) {
        // Skip files we can't read
        continue;
      }
      
      const fileItem = {
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
        size: stats.size,
        lastModified: stats.mtime,
        extension: item.isFile() ? path.extname(item.name).toLowerCase() : null,
        type: getFileType(item.name, item.isDirectory())
      };
      
      fileItems.push(fileItem);
    }
    
    // Sort: directories first, then files alphabetically
    fileItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    return {
      success: true,
      items: fileItems,
      path: dirPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('read-file', async (event, filePath, encoding = 'utf8') => {
  try {
    const content = await fs.readFile(filePath, encoding);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      content,
      size: stats.size,
      lastModified: stats.mtime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('write-file', async (event, filePath, content, encoding = 'utf8') => {
  try {
    await fs.writeFile(filePath, content, encoding);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      success: true,
      stats: {
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-home-directory', () => {
  return {
    success: true,
    path: os.homedir()
  };
});

ipcMain.handle('path-exists', async (event, targetPath) => {
  try {
    await fs.access(targetPath);
    return { success: true, exists: true };
  } catch (error) {
    return { success: true, exists: false };
  }
});

// Helper function to determine file type
function getFileType(fileName, isDirectory) {
  if (isDirectory) {
    return 'folder';
  }
  
  const extension = path.extname(fileName).toLowerCase();
  
  // Define file type categories
  const fileTypes = {
    // Code files
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    
    // Config files
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'config',
    '.env': 'config',
    '.config': 'config',
    
    // Documentation
    '.md': 'markdown',
    '.txt': 'text',
    '.rtf': 'text',
    '.pdf': 'pdf',
    '.doc': 'document',
    '.docx': 'document',
    
    // Images
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.webp': 'image',
    '.ico': 'image',
    
    // Archive
    '.zip': 'archive',
    '.tar': 'archive',
    '.gz': 'archive',
    '.rar': 'archive',
    '.7z': 'archive',
  };
  
  return fileTypes[extension] || 'file';
}