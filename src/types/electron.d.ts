// types/electron.d.ts
declare global {
  interface Window {
    electronAPI: {
      // Backend generation (existing)
      generateBackend: (workflowData: any, projectName: string) => Promise<any>;
      startGeneratedServer: (projectPath: string) => Promise<any>;
      testGeneratedAPI: (projectPath: string, analysis: any) => Promise<any>;
      selectProjectDirectory: () => Promise<any>;
      getGroqApiKey: () => Promise<string | null>;
      setGroqApiKey: (apiKey: string) => Promise<{ success: boolean }>;
      onGenerationProgress: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;

      // File system API (new)
      selectDirectory: () => Promise<{
        success: boolean;
        path?: string;
        canceled: boolean;
        error?: string;
      }>;

      readDirectory: (dirPath: string) => Promise<{
        success: boolean;
        items?: FileSystemItem[];
        path?: string;
        error?: string;
      }>;

      readFile: (filePath: string, encoding?: string) => Promise<{
        success: boolean;
        content?: string;
        size?: number;
        lastModified?: Date;
        error?: string;
      }>;

      writeFile: (filePath: string, content: string, encoding?: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      createDirectory: (dirPath: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      deleteFile: (filePath: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      getFileStats: (filePath: string) => Promise<{
        success: boolean;
        stats?: {
          size: number;
          lastModified: Date;
          created: Date;
          isDirectory: boolean;
          isFile: boolean;
        };
        error?: string;
      }>;

      getHomeDirectory: () => Promise<{
        success: boolean;
        path: string;
      }>;

      pathExists: (targetPath: string) => Promise<{
        success: boolean;
        exists: boolean;
      }>;
    };
  }
}

// File system types
interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  lastModified: string;
  extension: string | null;
  type: string;
}

export {};