// hooks/useFileSystem.ts
import { useState, useCallback } from 'react';

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

interface UseFileSystemReturn {
  // State
  currentPath: string;
  items: FileSystemItem[];
  loading: boolean;
  error: string;
  selectedFile: FileSystemItem | null;

  // Actions
  selectDirectory: () => Promise<void>;
  readDirectory: (path: string) => Promise<void>;
  readFile: (filePath: string, encoding?: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string, encoding?: string) => Promise<boolean>;
  createDirectory: (dirPath: string) => Promise<boolean>;
  deleteItem: (filePath: string) => Promise<boolean>;
  goHome: () => Promise<void>;
  setSelectedFile: (file: FileSystemItem | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export const useFileSystem = (): UseFileSystemReturn => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const selectDirectory = useCallback(async () => {
    if (!window.electronAPI) {
      setError('File system not available');
      return;
    }

    try {
      const result = await window.electronAPI.selectDirectory();
      if (result.success && !result.canceled) {
        setCurrentPath(result.path!);
        await readDirectory(result.path!);
      }
    } catch (err) {
      setError('Failed to select directory');
    }
  }, []);

  const readDirectory = useCallback(async (path: string) => {
    if (!window.electronAPI) {
      setError('File system not available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.readDirectory(path);
      
      if (result.success) {
        setItems(result.items || []);
        setCurrentPath(result.path || path);
      } else {
        setError(result.error || 'Failed to read directory');
        setItems([]);
      }
    } catch (err) {
      setError('Failed to read directory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(async (filePath: string, encoding = 'utf8'): Promise<string | null> => {
    if (!window.electronAPI) {
      setError('File system not available');
      return null;
    }

    try {
      const result = await window.electronAPI.readFile(filePath, encoding);
      
      if (result.success) {
        return result.content || null;
      } else {
        setError(result.error || 'Failed to read file');
        return null;
      }
    } catch (err) {
      setError('Failed to read file');
      return null;
    }
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string, encoding = 'utf8'): Promise<boolean> => {
    if (!window.electronAPI) {
      setError('File system not available');
      return false;
    }

    try {
      const result = await window.electronAPI.writeFile(filePath, content, encoding);
      
      if (result.success) {
        // Refresh directory if the file is in current directory
        const fileDir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'));
        if (fileDir === currentPath) {
          await readDirectory(currentPath);
        }
        return true;
      } else {
        setError(result.error || 'Failed to write file');
        return false;
      }
    } catch (err) {
      setError('Failed to write file');
      return false;
    }
  }, [currentPath, readDirectory]);

  const createDirectory = useCallback(async (dirPath: string): Promise<boolean> => {
    if (!window.electronAPI) {
      setError('File system not available');
      return false;
    }

    try {
      const result = await window.electronAPI.createDirectory(dirPath);
      
      if (result.success) {
        // Refresh current directory
        if (currentPath) {
          await readDirectory(currentPath);
        }
        return true;
      } else {
        setError(result.error || 'Failed to create directory');
        return false;
      }
    } catch (err) {
      setError('Failed to create directory');
      return false;
    }
  }, [currentPath, readDirectory]);

  const deleteItem = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.electronAPI) {
      setError('File system not available');
      return false;
    }

    try {
      const result = await window.electronAPI.deleteFile(filePath);
      
      if (result.success) {
        // Refresh current directory
        if (currentPath) {
          await readDirectory(currentPath);
        }
        // Clear selection if the deleted item was selected
        if (selectedFile && selectedFile.path === filePath) {
          setSelectedFile(null);
        }
        return true;
      } else {
        setError(result.error || 'Failed to delete item');
        return false;
      }
    } catch (err) {
      setError('Failed to delete item');
      return false;
    }
  }, [currentPath, readDirectory, selectedFile]);

  const goHome = useCallback(async () => {
    if (!window.electronAPI) {
      setError('File system not available');
      return;
    }

    try {
      const result = await window.electronAPI.getHomeDirectory();
      if (result.success) {
        await readDirectory(result.path);
      }
    } catch (err) {
      setError('Failed to navigate to home directory');
    }
  }, [readDirectory]);

  const refresh = useCallback(async () => {
    if (currentPath) {
      await readDirectory(currentPath);
    }
  }, [currentPath, readDirectory]);

  return {
    // State
    currentPath,
    items,
    loading,
    error,
    selectedFile,

    // Actions
    selectDirectory,
    readDirectory,
    readFile,
    writeFile,
    createDirectory,
    deleteItem: deleteItem,
    goHome,
    setSelectedFile,
    clearError,
    refresh,
  };
};