import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow, ArrowLeft, Trash2, Plus, Sparkles, Loader, Keyboard } from 'lucide-react';
import { WorkflowBuilderProps, NodeTemplate } from '../types';

// WorkflowNodeComponent as a child component
interface WorkflowNodeComponentProps {
  data: {
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    size: 'small' | 'medium' | 'large';
    category: string;
  };
  id: string;
}

const WorkflowNodeComponent: React.FC<WorkflowNodeComponentProps> = ({ data, id }) => {
  const [currentSize, setCurrentSize] = useState(data.size);
  const IconComponent = data.icon;

  const sizeConfig = {
    small: { width: 120, height: 80, iconSize: 16, fontSize: 'text-xs' },
    medium: { width: 160, height: 100, iconSize: 20, fontSize: 'text-sm' },
    large: { width: 200, height: 120, iconSize: 24, fontSize: 'text-base' }
  };

  const handleSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    setCurrentSize(newSize);
    // Update the node size in the flow
    window.dispatchEvent(new CustomEvent('updateNodeSize', {
      detail: { nodeId: id, size: newSize }
    }));
  };

  const handleDelete = () => {
    window.dispatchEvent(new CustomEvent('deleteNode', {
      detail: { nodeId: id }
    }));
  };

  const config = sizeConfig[currentSize];
  const categoryColors = {
    'API': 'from-blue-500 to-blue-600',
    'Database': 'from-green-500 to-green-600',
    'Processing': 'from-purple-500 to-purple-600',
    'Integration': 'from-orange-500 to-orange-600',
    'Security': 'from-red-500 to-red-600',
    'Deployment': 'from-indigo-500 to-indigo-600'
  };

  const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'w-[120px] h-[80px]';
      case 'medium': return 'w-[160px] h-[100px]';
      case 'large': return 'w-[200px] h-[120px]';
      default: return 'w-[160px] h-[100px]';
    }
  };

  return (
    <div 
      className={`group relative ${getSizeClasses(currentSize)}`}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        title="Delete component"
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Size controls */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
        {(['small', 'medium', 'large'] as const).map((size) => (
          <button
            key={size}
            onClick={() => handleSizeChange(size)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              currentSize === size 
                ? 'bg-blue-500 border-blue-500' 
                : 'bg-gray-700 border-gray-600 hover:border-blue-400'
            }`}
            title={`${size.charAt(0).toUpperCase() + size.slice(1)} size`}
          >
            <div className={`w-full h-full rounded-full ${
              size === 'small' ? 'scale-50' : 
              size === 'medium' ? 'scale-75' : 
              'scale-100'
            } bg-white transition-transform`}></div>
          </button>
        ))}
      </div>

      <div className={`w-full h-full bg-gradient-to-br ${categoryColors[data.category as keyof typeof categoryColors] || 'from-gray-500 to-gray-600'} rounded-xl shadow-lg border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white hover:shadow-xl transition-all duration-200 group-hover:scale-105`}>
        <IconComponent className={`w-${config.iconSize/4} h-${config.iconSize/4} mb-2`} style={{ width: config.iconSize, height: config.iconSize }} />
        <span className={`${config.fontSize} font-medium text-center leading-tight`}>{data.label}</span>
      </div>
    </div>
  );
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ 
  config, 
  onBack, 
  onGenerateProject, 
  isGenerating 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeId, setNodeId] = useState(1);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#64748b',
        },
        style: {
          stroke: '#64748b',
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const addNode = (template: NodeTemplate) => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'workflowNode',
      position: { 
        x: Math.random() * 400 + 50, 
        y: Math.random() * 300 + 50 
      },
      data: { 
        ...template,
        size: 'medium'
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeId((id) => id + 1);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
  };

  // Handle custom events for node operations
  useEffect(() => {
    const handleDeleteNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    };

    const handleUpdateNodeSize = (event: CustomEvent) => {
      const { nodeId, size } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, size } }
            : node
        )
      );
    };

    window.addEventListener('deleteNode', handleDeleteNode as EventListener);
    window.addEventListener('updateNodeSize', handleUpdateNodeSize as EventListener);

    return () => {
      window.removeEventListener('deleteNode', handleDeleteNode as EventListener);
      window.removeEventListener('updateNodeSize', handleUpdateNodeSize as EventListener);
    };
  }, [setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete') {
        // Delete selected nodes (ReactFlow handles this automatically)
      } else if (event.ctrlKey && event.shiftKey && event.key === 'X') {
        event.preventDefault();
        setNodes([]);
        setEdges([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setEdges]);

  const nodeTypes = {
    workflowNode: WorkflowNodeComponent,
  };

  const handleGenerateProject = () => {
    onGenerateProject(nodes, edges);
  };

  const categorizedTemplates = NODE_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, NodeTemplate[]>);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Workflow Designer</h2>
                <p className="text-gray-400 text-sm">Project: {config.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
              {nodes.length} components
            </div>
            <button
              onClick={clearAll}
              disabled={nodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-600/30"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
            <button
              onClick={handleGenerateProject}
              disabled={nodes.length === 0 || isGenerating}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Component Palette */}
        <div className="w-80 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border-r border-gray-700/50 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Components</h3>
            </div>

            {Object.entries(categorizedTemplates).map(([category, templates]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">{category}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => addNode(template)}
                        className="group p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 text-left"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-gray-300 text-center leading-tight">{template.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Shortcuts</span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div>• Drag components to canvas</div>
              <div>• Connect with drag between nodes</div>
              <div>• Hover to resize/delete nodes</div>
              <div>• <kbd className="bg-gray-700 px-1 rounded">Del</kbd> - Delete selected</div>
              <div>• <kbd className="bg-gray-700 px-1 rounded">Ctrl+Shift+X</kbd> - Clear all</div>
            </div>
          </div>
        </div>

        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            className="bg-gray-900"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.5}
            maxZoom={2}
            attributionPosition="bottom-left"
            deleteKeyCode={['Delete', 'Backspace']}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#374151"
            />
            <Controls 
              className="bg-gray-800 border border-gray-700 rounded-lg [&>button]:bg-gray-700 [&>button]:border-gray-600 [&>button]:text-gray-300 [&>button:hover]:bg-gray-600"
            />
          </ReactFlow>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center border border-gray-700">
                  <Workflow className="w-10 h-10 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Design Your Workflow</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Drag components from the left panel to start building your backend architecture. 
                    Connect them to define the data flow and relationships.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back Button - Fixed in lower left */}
      <button
        onClick={onBack}
        className="fixed bottom-6 left-6 flex items-center gap-2 px-4 py-3 bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm text-gray-300 rounded-xl border border-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Setup
      </button>

      {/* Step Indicator */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 text-xs text-gray-400 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
        </div>
        <span>Step 2 of 3 - Workflow Design</span>
      </div>
    </div>
  );
};

export default WorkflowBuilder;