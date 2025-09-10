import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Edit3,
  Eye,
  FileText,
  Image,
  Code,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface FileViewerProps {
  file: any;
  onClose: () => void;
  onSave?: (content: string) => Promise<boolean>;
  className?: string;
}

const FileViewer: React.FC<FileViewerProps> = ({
  file,
  onClose,
  onSave,
  className = ''
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Determine if file is viewable
  const isTextFile = () => {
    if (!file) return false;
    
    const textTypes = [
      'javascript', 'typescript', 'json', 'html', 'css', 'scss', 'sass', 'less',
      'markdown', 'text', 'xml', 'yaml', 'config', 'python', 'java', 'cpp', 'c',
      'csharp', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'
    ];
    
    return textTypes.includes(file.type) || file.extension === '.txt';
  };

  const isImageFile = () => {
    return file && file.type === 'image';
  };

  const getFileIcon = () => {
    if (isImageFile()) {
      return <Image className="w-5 h-5" />;
    } else if (isTextFile()) {
      return <Code className="w-5 h-5" />;
    } else {
      return <FileText className="w-5 h-5" />;
    }
  };

  const loadFileContent = async () => {
    if (!file || !window.electronAPI) return;

    setLoading(true);
    setError('');

    try {
      if (isTextFile()) {
        const result = await window.electronAPI.readFile(file.path);
        if (result.success) {
          setContent(result.content || '');
          setEditedContent(result.content || '');
        } else {
          setError(result.error || 'Failed to read file');
        }
      } else if (isImageFile()) {
        // For images, we'll just show the path since we can't display them directly
        setContent(`Image file: ${file.name}\nPath: ${file.path}\nSize: ${Math.round(file.size / 1024)} KB`);
      } else {
        setContent(`Binary file: ${file.name}\nPath: ${file.path}\nSize: ${Math.round(file.size / 1024)} KB\n\nThis file type cannot be displayed.`);
      }
    } catch (err) {
      setError('Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || !editing || !window.electronAPI) return;

    setSaveStatus('saving');
    
    try {
      const result = await window.electronAPI.writeFile(file.path, editedContent);
      if (result.success) {
        setContent(editedContent);
        setEditing(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setError('Failed to save file');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
      setError('Failed to save file');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setEditing(false);
    setError('');
  };

  const getLanguageFromExtension = (extension: string) => {
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.json': 'json',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
    };
    
    return languageMap[extension] || 'text';
  };

  useEffect(() => {
    if (file) {
      loadFileContent();
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="text-gray-600">
            {getFileIcon()}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-sm text-gray-500 truncate" title={file.path}>
              {file.path}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Edit/View Toggle */}
          {isTextFile() && !loading && (
            <>
              {editing ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      saveStatus === 'saving' 
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                        : saveStatus === 'saved'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : saveStatus === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Saved</span>
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Error</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-600">Loading file...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        ) : editing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="File content..."
          />
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Type:</strong> {file.type}</div>
                <div><strong>Size:</strong> {Math.round(file.size / 1024)} KB</div>
                {file.extension && (
                  <div><strong>Extension:</strong> {file.extension}</div>
                )}
                <div><strong>Modified:</strong> {new Date(file.lastModified).toLocaleString()}</div>
              </div>
            </div>

            {/* Content Display */}
            {isTextFile() ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap max-h-96">
                <code>{content}</code>
              </pre>
            ) : isImageFile() ? (
              <div className="text-center py-8">
                <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Image preview not available</p>
                <p className="text-sm text-gray-500 mt-2">{file.name}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">File preview not available</p>
                <p className="text-sm text-gray-500 mt-2">{file.name}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;