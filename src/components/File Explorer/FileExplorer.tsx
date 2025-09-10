import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Home,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  ArrowLeft,
  ArrowUp
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  lastModified: string;
  extension: string | null;
  type: string;
}

interface FileExplorerProps {
  onFileSelect?: (file: FileItem) => void;
  onDirectoryChange?: (path: string) => void;
  className?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect,
  onDirectoryChange,
  className = ''
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; item: FileItem | null }>({
    x: 0,
    y: 0,
    item: null
  });

  // Initialize with home directory
  useEffect(() => {
    initializeExplorer();
  }, []);

  const initializeExplorer = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getHomeDirectory();
        if (result.success) {
          setCurrentPath(result.path);
          addToHistory(result.path);
          loadDirectory(result.path);
        }
      }
    } catch (error) {
      console.error('Failed to initialize file explorer:', error);
      setError('Failed to initialize file explorer');
    }
  };

  const addToHistory = (path: string) => {
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      // Remove any entries after current index (when going back and then navigating to new path)
      if (historyIndex < prev.length - 1) {
        newHistory.splice(historyIndex + 1);
      }
      // Add new path if it's different from the last one
      if (newHistory[newHistory.length - 1] !== path) {
        newHistory.push(path);
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newHistory = [...navigationHistory];
      if (historyIndex < navigationHistory.length - 1) {
        newHistory.splice(historyIndex + 1);
      }
      if (newHistory[newHistory.length - 1] !== path) {
        return newHistory.length; // Will be the index of the newly added item
      }
      return prev;
    });
  };

  const loadDirectory = async (path: string, addHistory: boolean = false) => {
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
        onDirectoryChange?.(result.path || path);
        
        if (addHistory) {
          addToHistory(result.path || path);
        }
      } else {
        setError(result.error || 'Failed to load directory');
      }
    } catch (error) {
      setError('Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectorySelect = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.selectDirectory();
      if (result.success && !result.canceled) {
        setCurrentPath(result.path!);
        addToHistory(result.path!);
        loadDirectory(result.path!);
      }
    } catch (error) {
      setError('Failed to select directory');
    }
  };

  const handleItemClick = (item: FileItem) => {
    setSelectedItem(item.path);
    
    if (item.isDirectory) {
      if (expandedFolders.has(item.path)) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.path);
          return newSet;
        });
      } else {
        setExpandedFolders(prev => new Set(prev).add(item.path));
        // Don't change current directory, just expand the folder
      }
    } else {
      onFileSelect?.(item);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      // Navigate into the directory
      addToHistory(item.path);
      loadDirectory(item.path);
    } else {
      // Handle file opening
      onFileSelect?.(item);
    }
  };

  const handleRefresh = () => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  };

  const handleGoHome = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getHomeDirectory();
        if (result.success) {
          addToHistory(result.path);
          loadDirectory(result.path);
        }
      }
    } catch (error) {
      setError('Failed to navigate home');
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetPath = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      setCurrentPath(targetPath);
      loadDirectory(targetPath);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const targetPath = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      setCurrentPath(targetPath);
      loadDirectory(targetPath);
    }
  };

  const handleGoUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split(/[/\\]/).slice(0, -1).join('/');
      if (parentPath && parentPath !== currentPath) {
        addToHistory(parentPath);
        loadDirectory(parentPath);
      }
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;
  const canGoUp = currentPath && currentPath.split(/[/\\]/).length > 1;

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setShowContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const closeContextMenu = () => {
    setShowContextMenu({ x: 0, y: 0, item: null });
  };

  const handleContextAction = async (action: string, item: FileItem) => {
    closeContextMenu();
    
    switch (action) {
      case 'open':
        handleItemDoubleClick(item);
        break;
      case 'copy':
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(item.path);
          } catch (error) {
            console.error('Failed to copy path to clipboard:', error);
          }
        }
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          try {
            if (window.electronAPI) {
              const result = await window.electronAPI.deleteFile(item.path);
              if (result.success) {
                handleRefresh();
              } else {
                setError(result.error || 'Failed to delete item');
              }
            }
          } catch (error) {
            setError('Failed to delete item');
          }
        }
        break;
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return expandedFolders.has(item.path) ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />;
    }
    
    // Return different icons based on file type
    switch (item.type) {
      case 'javascript':
      case 'typescript':
        return <File className="w-4 h-4 text-yellow-600" />;
      case 'json':
        return <File className="w-4 h-4 text-green-600" />;
      case 'html':
        return <File className="w-4 h-4 text-orange-600" />;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return <File className="w-4 h-4 text-blue-600" />;
      case 'image':
        return <File className="w-4 h-4 text-purple-600" />;
      case 'markdown':
        return <File className="w-4 h-4 text-gray-600" />;
      case 'python':
        return <File className="w-4 h-4 text-green-500" />;
      case 'java':
        return <File className="w-4 h-4 text-red-600" />;
      case 'cpp':
      case 'c':
        return <File className="w-4 h-4 text-blue-700" />;
      case 'xml':
        return <File className="w-4 h-4 text-orange-500" />;
      case 'yaml':
        return <File className="w-4 h-4 text-purple-500" />;
      case 'config':
        return <File className="w-4 h-4 text-gray-700" />;
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      case 'document':
        return <File className="w-4 h-4 text-blue-500" />;
      case 'archive':
        return <File className="w-4 h-4 text-yellow-700" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredItems = items.filter(item =>
    searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu.item) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showContextMenu.item]);

  return (
    <>
      <div className={`bg-white border-l border-gray-200 flex flex-col h-full ${className}`} onClick={closeContextMenu}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">File Explorer</h3>
            <div className="flex items-center space-x-1">
              {/* Navigation buttons */}
              <button
                onClick={handleGoBack}
                disabled={!canGoBack}
                className={`p-1.5 rounded transition-colors ${
                  canGoBack 
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoForward}
                disabled={!canGoForward}
                className={`p-1.5 rounded transition-colors ${
                  canGoForward 
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Go Forward"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={handleGoUp}
                disabled={!canGoUp}
                className={`p-1.5 rounded transition-colors ${
                  canGoUp 
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Go Up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              
              {/* Separator */}
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              
              <button
                onClick={handleGoHome}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Go Home"
              >
                <Home className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Refresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDirectorySelect}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Current Path */}
        {currentPath && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 truncate" title={currentPath}>
            {currentPath}
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <div className="text-red-600 text-sm mb-2">{error}</div>
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchTerm ? 'No files match your search' : 'This directory is empty'}
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div
                  key={item.path}
                  className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedItem === item.path ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {item.isDirectory && (
                      <div className="text-gray-400 flex-shrink-0">
                        {expandedFolders.has(item.path) ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </div>
                    )}
                    <div className="text-gray-600 flex-shrink-0">
                      {getFileIcon(item)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                        {item.name}
                      </div>
                      {!item.isDirectory && (
                        <div className="text-xs text-gray-500 flex items-center space-x-2">
                          <span>{formatFileSize(item.size)}</span>
                          <span>•</span>
                          <span>{formatDate(item.lastModified)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation History Debug Info (Optional - remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-gray-100 border-t text-xs text-gray-600">
            History: {historyIndex + 1} / {navigationHistory.length}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu.item && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px]"
          style={{
            left: showContextMenu.x,
            top: showContextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextAction('open', showContextMenu.item!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showContextMenu.item.isDirectory ? 'Open' : 'View'}</span>
          </button>
          
          {!showContextMenu.item.isDirectory && (
            <button
              onClick={() => handleContextAction('edit', showContextMenu.item!)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          
          <div className="border-t border-gray-100 my-1"></div>
          
          <button
            onClick={() => handleContextAction('copy', showContextMenu.item!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Path</span>
          </button>
          
          <div className="border-t border-gray-100 my-1"></div>
          
          <button
            onClick={() => handleContextAction('delete', showContextMenu.item!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </>
  );
};

export default FileExplorer;