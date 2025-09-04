import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Settings, 
  Play, 
  TestTube, 
  FolderOpen, 
  Download,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Eye,
  Key
} from 'lucide-react';

interface WorkflowNode {
  type: string;
  id: string;
}

interface WorkflowData {
  nodes: WorkflowNode[];
  connections: any[];
}

interface TestResult {
  status: 'success' | 'error';
  details?: string;
  httpStatus?: number;
  endpoint?: string;
}

interface TestResults {
  server?: {
    status: 'success' | 'error';
    details?: string;
  };
  endpoints?: TestResult[];
  coverage?: {
    status: 'success' | 'error';
    details: string;
  };
}

interface GenerationProgress {
  stage: 'starting' | 'analyzing' | 'generating' | 'testing' | 'completed' | 'error';
  message: string;
  result?: GenerationResult;
}

interface GenerationResult {
  projectPath: string;
  analysis?: {
    endpoints?: any[];
    database?: {
      type: string;
    };
    authentication?: {
      required: boolean;
    };
  };
  testResults?: {
    server?: {
      status: 'success' | 'error';
    };
    endpoints?: Array<{
      status: 'success' | 'error';
      endpoint: string;
    }>;
  };
}

interface AIBackendGeneratorProps {
  workflowData: WorkflowData;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      getGroqApiKey: () => Promise<string>;
      setGroqApiKey: (key: string) => Promise<void>;
      generateBackend: (workflowData: WorkflowData, projectName: string) => Promise<void>;
      startGeneratedServer: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
      testGeneratedAPI: (projectPath: string, analysis: any) => Promise<{ success: boolean; testResults: TestResults; error?: string }>;
      selectProjectDirectory: () => void;
      onGenerationProgress: (callback: (data: GenerationProgress) => void) => void;
      removeAllListeners: (event: string) => void;
    };
  }
}

const AIBackendGenerator: React.FC<AIBackendGeneratorProps> = ({ workflowData, onClose }) => {
  const [step, setStep] = useState<'config' | 'generating' | 'results'>('config');
  const [projectName, setProjectName] = useState<string>('my-generated-backend');
  const [groqApiKey, setGroqApiKey] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GenerationResult | null>(null);
  const [serverRunning, setServerRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // Load existing API key
    api.getGroqApiKey().then(key => {
      if (key) setGroqApiKey(key);
    }).catch(error => {
      console.error('Failed to get API key:', error);
    });

    // Listen for generation progress
    api.onGenerationProgress((data: GenerationProgress) => {
      setGenerationProgress(data);
      
      if (data.stage === 'completed' && data.result) {
        setResults(data.result);
        setStep('results');
      } else if (data.stage === 'error') {
        setStep('results');
      }
    });

    return () => {
      api.removeAllListeners('generation-progress');
    };
  }, []);

  const handleSaveApiKey = async () => {
    if (!groqApiKey.trim() || !window.electronAPI) return;
    
    try {
      await window.electronAPI.setGroqApiKey(groqApiKey);
      alert('API key saved successfully!');
    } catch (error) {
      console.error('Failed to save API key:', error);
      alert('Failed to save API key');
    }
  };

  const handleGenerateBackend = async () => {
    if (!groqApiKey.trim()) {
      alert('Please enter your Groq API key first');
      return;
    }

    if (!workflowData || !workflowData.nodes || workflowData.nodes.length === 0) {
      alert('Please create a workflow first');
      return;
    }

    if (!window.electronAPI) {
      alert('Electron API not available');
      return;
    }

    setStep('generating');
    setGenerationProgress({ 
      stage: 'starting', 
      message: 'Initializing...' 
    } as GenerationProgress);

    try {
      await window.electronAPI.generateBackend(workflowData, projectName);
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationProgress({
        stage: 'error',
        message: `Failed to generate backend: ${errorMessage}`
      } as GenerationProgress);
    }
  };

  const handleStartServer = async () => {
    if (!results?.projectPath || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.startGeneratedServer(results.projectPath);
      if (result.success) {
        setServerRunning(true);
        alert('Server started successfully on http://localhost:3000');
      } else {
        alert(`Failed to start server: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error starting server: ${errorMessage}`);
    }
  };

  const handleTestAPI = async () => {
    if (!results?.projectPath || !results?.analysis || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.testGeneratedAPI(
        results.projectPath, 
        results.analysis
      );
      
      if (result.success) {
        setTestResults(result.testResults);
      } else {
        alert(`Testing failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error testing API: ${errorMessage}`);
    }
  };

  const getStageIcon = (stage: GenerationProgress['stage']) => {
    switch (stage) {
      case 'analyzing':
        return <Bot className="w-5 h-5 animate-pulse" />;
      case 'generating':
        return <Loader className="w-5 h-5 animate-spin" />;
      case 'testing':
        return <TestTube className="w-5 h-5 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const renderConfigStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">AI Backend Generator</h2>
        <p className="text-gray-600">Generate and test backend code from your workflow</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Key className="w-4 h-4 inline mr-2" />
            Groq API Key
          </label>
          <div className="flex space-x-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Enter your Groq API key..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get your free API key from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.groq.com</a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="my-backend-project"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Workflow Analysis</h3>
          <div className="text-sm text-gray-600">
            <p>Nodes: {workflowData?.nodes?.length || 0}</p>
            <p>Connections: {workflowData?.connections?.length || 0}</p>
            <p>API Endpoints: {workflowData?.nodes?.filter(n => n.type === 'api').length || 0}</p>
            <p>Database Nodes: {workflowData?.nodes?.filter(n => n.type === 'database').length || 0}</p>
          </div>
        </div>

        <button
          onClick={handleGenerateBackend}
          disabled={!groqApiKey.trim() || !workflowData?.nodes?.length}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Bot className="w-5 h-5" />
          <span>Generate Backend</span>
        </button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-3">
        {generationProgress ? getStageIcon(generationProgress.stage) : <AlertCircle className="w-5 h-5" />}
        <h2 className="text-xl font-bold text-gray-800">
          {generationProgress?.stage === 'analyzing' && 'Analyzing Workflow'}
          {generationProgress?.stage === 'generating' && 'Generating Code'}
          {generationProgress?.stage === 'testing' && 'Testing API'}
          {generationProgress?.stage === 'error' && 'Generation Failed'}
          {!generationProgress && 'Initializing...'}
        </h2>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-700">{generationProgress?.message}</p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: generationProgress?.stage === 'analyzing' ? '25%' :
                   generationProgress?.stage === 'generating' ? '75%' :
                   generationProgress?.stage === 'testing' ? '90%' :
                   generationProgress?.stage === 'completed' ? '100%' : '10%'
          }}
        ></div>
      </div>

      {generationProgress?.stage === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800">{generationProgress.message}</p>
          </div>
          <button
            onClick={() => setStep('config')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">Backend Generated Successfully!</h2>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Project Details</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Path:</strong> {results.projectPath}</p>
              <p><strong>Endpoints:</strong> {results.analysis?.endpoints?.length || 0}</p>
              <p><strong>Database:</strong> {results.analysis?.database?.type || 'None'}</p>
              <p><strong>Authentication:</strong> {results.analysis?.authentication?.required ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {results.testResults && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Test Results</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {results.testResults.server?.status === 'success' ? 
                    <CheckCircle className="w-4 h-4 text-green-500" /> : 
                    <XCircle className="w-4 h-4 text-red-500" />
                  }
                  <span className="text-sm">Server: {results.testResults.server?.status || 'pending'}</span>
                </div>

                {results.testResults.endpoints?.map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {endpoint.status === 'success' ? 
                      <CheckCircle className="w-4 h-4 text-green-500" /> : 
                      <XCircle className="w-4 h-4 text-red-500" />
                    }
                    <span className="text-sm">{endpoint.endpoint}: {endpoint.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleStartServer}
              disabled={serverRunning}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <Server className="w-5 h-5" />
              <span>{serverRunning ? 'Server Running' : 'Start Server'}</span>
            </button>

            <button
              onClick={handleTestAPI}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <TestTube className="w-5 h-5" />
              <span>Test API</span>
            </button>

            <button
              onClick={() => {
                if (window.electronAPI) {
                  window.electronAPI.selectProjectDirectory();
                }
              }}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              <span>Open Project</span>
            </button>
          </div>

          {testResults && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Detailed Test Results</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700">Server Status</h4>
                  <div className="flex items-center space-x-2">
                    {testResults.server?.status === 'success' ? 
                      <CheckCircle className="w-4 h-4 text-green-500" /> : 
                      <XCircle className="w-4 h-4 text-red-500" />
                    }
                    <span className="text-sm text-gray-600">{testResults.server?.details}</span>
                  </div>
                </div>

                {testResults.endpoints && testResults.endpoints.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Endpoint Tests</h4>
                    <div className="space-y-2">
                      {testResults.endpoints.map((endpoint, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            {endpoint.status === 'success' ? 
                              <CheckCircle className="w-4 h-4 text-green-500" /> : 
                              <XCircle className="w-4 h-4 text-red-500" />
                            }
                            <span className="text-sm font-mono">{endpoint.endpoint}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {endpoint.httpStatus && `HTTP ${endpoint.httpStatus}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {testResults.coverage && (
                  <div>
                    <h4 className="font-medium text-gray-700">Test Coverage</h4>
                    <div className="flex items-center space-x-2">
                      {testResults.coverage.status === 'success' ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className="text-sm text-gray-600">{testResults.coverage.details}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => {
            setStep('config');
            setResults(null);
            setTestResults(null);
            setServerRunning(false);
          }}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Generate Another
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {step === 'config' && renderConfigStep()}
          {step === 'generating' && renderGeneratingStep()}
          {step === 'results' && renderResultsStep()}
        </div>
      </div>
    </div>
  );
};

export default AIBackendGenerator;