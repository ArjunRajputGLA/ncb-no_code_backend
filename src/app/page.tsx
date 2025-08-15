'use client';
import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Node,
  Edge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Plus, Database, Server, Globe, Folder, Download, Check, ChevronDown, X, Code, Settings, Loader,
  Mail, Webhook, Timer, FileText, Shield, Key, Users, Cloud, Zap, ArrowRight, Play
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for our project configuration
interface ProjectConfig {
  name: string;
  framework: string;
  database: string;
  language: string;
}

interface GeneratedProject {
  bashScript: string;
  projectStructure: string;
  dependencies: string[];
}

interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  category: 'core' | 'database' | 'auth' | 'api' | 'deployment';
}

// Node Templates for the workflow builder
const NODE_TEMPLATES: NodeTemplate[] = [
  // Core Components
  { id: 'server', type: 'server', label: 'API Server', icon: Server, color: 'bg-blue-600', description: 'Express/Fastify server instance', category: 'core' },
  { id: 'router', type: 'router', label: 'Route Handler', icon: ArrowRight, color: 'bg-green-600', description: 'API route endpoints', category: 'core' },
  { id: 'middleware', type: 'middleware', label: 'Middleware', icon: Shield, color: 'bg-purple-600', description: 'Request processing middleware', category: 'core' },
  
  // Database Components
  { id: 'database', type: 'database', label: 'Database', icon: Database, color: 'bg-indigo-600', description: 'Database connection and models', category: 'database' },
  { id: 'cache', type: 'cache', label: 'Cache Layer', icon: Zap, color: 'bg-orange-600', description: 'Redis/Memory cache', category: 'database' },
  
  // Authentication
  { id: 'auth', type: 'auth', label: 'Authentication', icon: Key, color: 'bg-red-600', description: 'JWT/OAuth authentication', category: 'auth' },
  { id: 'rbac', type: 'rbac', label: 'Authorization', icon: Users, color: 'bg-pink-600', description: 'Role-based access control', category: 'auth' },
  
  // External APIs
  { id: 'webhook', type: 'webhook', label: 'Webhooks', icon: Webhook, color: 'bg-teal-600', description: 'Incoming webhook handlers', category: 'api' },
  { id: 'email', type: 'email', label: 'Email Service', icon: Mail, color: 'bg-cyan-600', description: 'Email notifications', category: 'api' },
  { id: 'scheduler', type: 'scheduler', label: 'Task Scheduler', icon: Timer, color: 'bg-amber-600', description: 'Cron jobs and scheduled tasks', category: 'api' },
  
  // Deployment & Monitoring
  { id: 'docker', type: 'docker', label: 'Docker', icon: Cloud, color: 'bg-gray-600', description: 'Containerization setup', category: 'deployment' },
  { id: 'logging', type: 'logging', label: 'Logging', icon: FileText, color: 'bg-slate-600', description: 'Application logging', category: 'deployment' },
];

// Custom Node Component for React Flow
const WorkflowNodeComponent = ({ data, selected, id }: { data: { label: string; iconName: string; color: string; description: string; size?: 'small' | 'medium' | 'large' }; selected: boolean; id: string }) => {
  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Server, Database, Globe, Folder, Mail, Webhook, Timer, FileText, Shield, Key, Users, Cloud, Zap, ArrowRight
  };
  
  const IconComponent = iconMap[data.iconName] || Server;
  
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'px-3 py-2 min-w-[140px]',
      icon: 'w-6 h-6',
      iconContainer: 'w-6 h-6',
      iconSize: 'w-3 h-3',
      titleSize: 'text-xs',
      descSize: 'text-xs',
      buttonSize: 'w-5 h-5',
      buttonIcon: 'w-3 h-3'
    },
    medium: {
      container: 'px-4 py-3 min-w-[160px]',
      icon: 'w-8 h-8',
      iconContainer: 'w-8 h-8',
      iconSize: 'w-4 h-4',
      titleSize: 'text-sm',
      descSize: 'text-xs',
      buttonSize: 'w-6 h-6',
      buttonIcon: 'w-3.5 h-3.5'
    },
    large: {
      container: 'px-5 py-4 min-w-[180px]',
      icon: 'w-10 h-10',
      iconContainer: 'w-10 h-10',
      iconSize: 'w-5 h-5',
      titleSize: 'text-base',
      descSize: 'text-sm',
      buttonSize: 'w-7 h-7',
      buttonIcon: 'w-4 h-4'
    }
  };
  
  const currentSize = data.size || 'medium';
  const config = sizeConfig[currentSize];
  
  return (
    <div className={`relative group ${selected ? 'z-10' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors opacity-0 group-hover:opacity-100"
        style={{ left: -6 }}
      />
      
      <div className={`${config.container} rounded-xl shadow-lg border-2 transition-all duration-200 ${
        selected 
          ? 'border-blue-500 shadow-blue-500/25 scale-105' 
          : 'border-gray-700 hover:border-gray-600'
      } ${data.color} backdrop-blur-sm relative`}>
        
        {/* Control buttons - only show when selected */}
        {selected && (
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Size controls */}
            <div className="flex bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-600 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Dispatch custom event to resize node
                  window.dispatchEvent(new CustomEvent('resizeNode', { 
                    detail: { nodeId: id, size: 'small' } 
                  }));
                }}
                className={`${config.buttonSize} flex items-center justify-center hover:bg-blue-600/20 transition-colors ${
                  currentSize === 'small' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'
                }`}
                title="Small size"
              >
                <div className="w-2 h-2 bg-current rounded-sm"></div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('resizeNode', { 
                    detail: { nodeId: id, size: 'medium' } 
                  }));
                }}
                className={`${config.buttonSize} flex items-center justify-center hover:bg-blue-600/20 transition-colors ${
                  currentSize === 'medium' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'
                }`}
                title="Medium size"
              >
                <div className="w-3 h-3 bg-current rounded-sm"></div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('resizeNode', { 
                    detail: { nodeId: id, size: 'large' } 
                  }));
                }}
                className={`${config.buttonSize} flex items-center justify-center hover:bg-blue-600/20 transition-colors ${
                  currentSize === 'large' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'
                }`}
                title="Large size"
              >
                <div className="w-4 h-4 bg-current rounded-sm"></div>
              </button>
            </div>
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Dispatch custom event to delete node
                window.dispatchEvent(new CustomEvent('deleteNode', { 
                  detail: { nodeId: id } 
                }));
              }}
              className={`${config.buttonSize} flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white rounded-lg border border-red-500 transition-colors shadow-lg`}
              title="Delete component"
            >
              <X className={config.buttonIcon} />
            </button>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          <div className={`${config.iconContainer} rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`${config.iconSize} text-white`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`${config.titleSize} font-semibold text-white truncate`}>{data.label}</div>
            <div className={`${config.descSize} text-white/70 truncate`}>{data.description}</div>
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 hover:!bg-green-500 transition-colors opacity-0 group-hover:opacity-100"
        style={{ right: -6 }}
      />
    </div>
  );
};

// Node types for React Flow
const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// Workflow Builder Component
const WorkflowBuilder = ({ 
  config, 
  onGenerateProject 
}: { 
  config: ProjectConfig;
  onGenerateProject: (config: ProjectConfig, workflow: { nodes: Node[]; edges: Edge[] }) => void;
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeId, setNodeId] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('core');

  const handleClearAll = useCallback(() => {
    if (nodes.length > 0) {
      const confirmed = window.confirm('Are you sure you want to clear all components? This action cannot be undone.');
      if (confirmed) {
        setNodes([]);
        setEdges([]);
      }
    }
  }, [nodes.length, setNodes, setEdges]);

  // Handle node deletion and resizing
  React.useEffect(() => {
    const handleDeleteNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      // Also remove connected edges
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    };

    const handleResizeNode = (event: CustomEvent) => {
      const { nodeId, size } = event.detail;
      setNodes((nds) => 
        nds.map((node) => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, size } }
            : node
        )
      );
    };

    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected nodes with Delete or Backspace key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(node => node.selected);
        if (selectedNodes.length > 0) {
          event.preventDefault();
          selectedNodes.forEach(node => {
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            setEdges((eds) => eds.filter((edge) => edge.source !== node.id && edge.target !== node.id));
          });
        }
      }
      
      // Clear all with Ctrl/Cmd + Shift + X
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'X') {
        event.preventDefault();
        handleClearAll();
      }
    };

    window.addEventListener('deleteNode', handleDeleteNode as EventListener);
    window.addEventListener('resizeNode', handleResizeNode as EventListener);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('deleteNode', handleDeleteNode as EventListener);
      window.removeEventListener('resizeNode', handleResizeNode as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setNodes, setEdges, nodes, handleClearAll]);

  const categories = [
    { id: 'core', label: 'Core', icon: Server },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'auth', label: 'Auth', icon: Key },
    { id: 'api', label: 'API', icon: Globe },
    { id: 'deployment', label: 'Deploy', icon: Cloud },
  ];

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#6b7280', strokeWidth: 2 },
      type: 'smoothstep'
    }, eds)),
    [setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = (event.target as Element).getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      const nodeDataString = event.dataTransfer.getData('application/nodedata');

      if (typeof type === 'undefined' || !type || !nodeDataString) {
        return;
      }

      let nodeData;
      try {
        nodeData = JSON.parse(nodeDataString);
      } catch (e) {
        console.error('Failed to parse node data:', e);
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left - 80,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode: Node = {
        id: `node_${nodeId}`,
        type: 'workflowNode',
        position,
        data: { 
          label: nodeData.label,
          description: nodeData.description,
          iconName: nodeData.iconName,
          color: nodeData.color,
          nodeType: nodeData.type,
          size: 'medium' as const, // Default size
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeId((id) => id + 1);
    },
    [nodeId, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDragStart = (event: React.DragEvent, nodeTemplate: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', 'workflowNode');
    // Create a simplified version for JSON serialization with icon name mapping
    const iconNameMap: Record<string, string> = {
      [Server.name]: 'Server',
      [ArrowRight.name]: 'ArrowRight', 
      [Shield.name]: 'Shield',
      [Database.name]: 'Database',
      [Zap.name]: 'Zap',
      [Key.name]: 'Key',
      [Users.name]: 'Users',
      [Webhook.name]: 'Webhook',
      [Mail.name]: 'Mail',
      [Timer.name]: 'Timer',
      [FileText.name]: 'FileText',
      [Cloud.name]: 'Cloud'
    };
    
    const nodeData = {
      id: nodeTemplate.id,
      type: nodeTemplate.type,
      label: nodeTemplate.label,
      color: nodeTemplate.color,
      description: nodeTemplate.description,
      category: nodeTemplate.category,
      iconName: iconNameMap[nodeTemplate.icon.name] || 'Server'
    };
    event.dataTransfer.setData('application/nodedata', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredNodes = NODE_TEMPLATES.filter(node => node.category === selectedCategory);

  const handleGenerateProject = () => {
    if (nodes.length === 0) {
      alert('Please add some components to your workflow first!');
      return;
    }
    onGenerateProject(config, { nodes, edges });
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Code className="w-5 h-5" />
            Workflow Designer
          </h2>
          <p className="text-gray-400 text-sm mb-4">Drag components to design your backend architecture</p>
          
          {/* Instructions */}
          <div className="bg-gray-700/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span>Drag & drop components to canvas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span>Click components to select & resize</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
              <span>Use X button to delete components</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              <span>Connect components with drag handles</span>
            </div>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-700">
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors min-w-fit ${
                  selectedCategory === category.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <CategoryIcon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </div>
        
        {/* Component List */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {filteredNodes.map((nodeTemplate) => {
            const IconComponent = nodeTemplate.icon;
            
            return (
              <div
                key={nodeTemplate.id}
                onDragStart={(event) => onDragStart(event, nodeTemplate)}
                draggable
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-600 bg-gray-700/50 hover:bg-gray-700 hover:border-gray-500 cursor-move transition-all duration-150 shadow-sm hover:shadow-lg group"
              >
                <div className={`w-10 h-10 rounded-lg ${nodeTemplate.color} flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{nodeTemplate.label}</div>
                  <div className="text-xs text-gray-400 truncate">{nodeTemplate.description}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Generate Button */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Components: {nodes.length}</span>
            <span>Connections: {edges.length}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <button 
              onClick={handleGenerateProject}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={nodes.length === 0}
            >
              <Play className="w-4 h-4" />
              Generate Project
            </button>
            
            {nodes.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-red-600/80 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200 border border-gray-600 hover:border-red-500"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">{config.name}</h1>
              <p className="text-gray-400 text-sm">{config.framework} with {config.database}</p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Components: {nodes.length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Connections: {edges.length}
                </span>
              </div>
              
              {/* Keyboard shortcuts help */}
              <div className="group relative">
                <button className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs">Shortcuts</span>
                </button>
                
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white mb-2">Keyboard Shortcuts</h3>
                    <div className="space-y-1 text-xs text-gray-300">
                      <div className="flex justify-between">
                        <span>Delete selected</span>
                        <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Del</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Clear all</span>
                        <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Ctrl+Shift+X</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Select component</span>
                        <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Click</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Resize component</span>
                        <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Size buttons</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-900"
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              color="#374151" 
              gap={20} 
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <MiniMap 
              className="!bg-gray-800 !border !border-gray-600 !rounded-lg !shadow-lg"
              nodeColor={() => '#6b7280'}
              maskColor="rgba(0, 0, 0, 0.2)"
              position="bottom-right"
            />
            <Controls 
              className="!bg-gray-800 !border !border-gray-600 !rounded-lg !shadow-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-600 [&>button]:!text-gray-300 [&>button]:hover:!bg-gray-700"
              position="top-right"
            />
          </ReactFlow>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center text-gray-400 bg-gray-800/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md">
                <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium mb-2 text-white">Design Your Backend Architecture</p>
                <p className="text-sm mb-6 text-gray-300">Drag and drop components from the sidebar to build your workflow</p>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Start with a Server component</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Connect components to define data flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Click to select, resize, and delete components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Generate your complete project setup</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FrameworkOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DatabaseOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LanguageOption {
  id: string;
  label: string;
}

interface DropdownProps {
  options: FrameworkOption[] | DatabaseOption[] | LanguageOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ProjectSetupFormProps {
  onCreateProject: (config: ProjectConfig) => void;
  isGenerating: boolean;
}

interface GeneratedProjectDisplayProps {
  project: GeneratedProject;
  config: ProjectConfig;
  onStartOver: () => void;
  onDownload: () => void;
}

// Framework and Database options
const FRAMEWORKS = [
  { id: 'nodejs-express', label: 'Node.js + Express', icon: Server },
  { id: 'nodejs-fastify', label: 'Node.js + Fastify', icon: Server },
  { id: 'python-flask', label: 'Python + Flask', icon: Code },
  { id: 'python-django', label: 'Python + Django', icon: Code },
  { id: 'nextjs', label: 'Next.js API Routes', icon: Globe },
];

const DATABASES = [
  { id: 'postgresql', label: 'PostgreSQL', icon: Database },
  { id: 'mysql', label: 'MySQL', icon: Database },
  { id: 'mongodb', label: 'MongoDB', icon: Database },
  { id: 'supabase', label: 'Supabase', icon: Database },
  { id: 'firebase', label: 'Firebase', icon: Database },
];

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
];

// Custom Dropdown Component
const Dropdown: React.FC<DropdownProps> = ({ options, value, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-xl text-gray-200 hover:border-blue-500/50 hover:bg-gray-700/80 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-lg"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-400" />}
          <span className={selectedOption ? 'text-gray-100 font-medium' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-md border border-gray-600 rounded-xl shadow-2xl z-[9999] max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {options.map((option, index) => {
            const OptionIcon = 'icon' in option ? option.icon : undefined;
            return (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-gray-200 hover:bg-blue-600/20 hover:text-white transition-all duration-150 border-b border-gray-700/50 last:border-b-0 group ${
                  index === 0 ? 'rounded-t-xl' : ''
                } ${index === options.length - 1 ? 'rounded-b-xl' : ''}`}
              >
                {OptionIcon && <OptionIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />}
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Backdrop overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Project Setup Form Component
const ProjectSetupForm: React.FC<ProjectSetupFormProps> = ({ onCreateProject, isGenerating }) => {
  const [config, setConfig] = useState<ProjectConfig>({
    name: '',
    framework: '',
    database: '',
    language: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.name && config.framework && config.database && config.language) {
      onCreateProject(config);
    }
  };

  const isFormValid = config.name && config.framework && config.database && config.language;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
        {/* Enhanced Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-8 py-6">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Folder className="w-6 h-6" />
              </div>
              Create New Backend Project
            </h2>
            <p className="text-blue-100/90 text-sm leading-relaxed">
              Configure your project settings and we&apos;ll generate the complete setup with AI-powered architecture design
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Project Name Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Project Name
            </label>
            <div className="relative group">
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="my-awesome-backend"
                className="w-full px-4 py-4 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-lg font-medium"
                disabled={isGenerating}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          </div>

          {/* Grid Layout for Dropdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Programming Language */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Programming Language
              </label>
              <Dropdown
                options={LANGUAGES}
                value={config.language}
                onChange={(value: string) => setConfig({ ...config, language: value })}
                placeholder="Select language"
                icon={Code}
              />
            </div>

            {/* Framework */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Backend Framework
              </label>
              <Dropdown
                options={FRAMEWORKS}
                value={config.framework}
                onChange={(value: string) => setConfig({ ...config, framework: value })}
                placeholder="Select framework"
                icon={Server}
              />
            </div>

            {/* Database */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Database
              </label>
              <Dropdown
                options={DATABASES}
                value={config.database}
                onChange={(value: string) => setConfig({ ...config, database: value })}
                placeholder="Select database"
                icon={Database}
              />
            </div>
          </div>

          {/* Configuration Preview */}
          {(config.name || config.framework || config.database || config.language) && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration Preview
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-400">Project</span>
                  <div className="text-gray-200 font-medium">{config.name || 'Not set'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Language</span>
                  <div className="text-gray-200 font-medium">{LANGUAGES.find(l => l.id === config.language)?.label || 'Not set'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Framework</span>
                  <div className="text-gray-200 font-medium">{FRAMEWORKS.find(f => f.id === config.framework)?.label || 'Not set'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400">Database</span>
                  <div className="text-gray-200 font-medium">{DATABASES.find(d => d.id === config.database)?.label || 'Not set'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!isFormValid || isGenerating}
              className="w-full group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:hover:shadow-lg"
            >
              {/* Button background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              
              {isGenerating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Setting up your project...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>Continue to Design Workflow</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              <span>Step 1 of 3 - Project Configuration</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generated Project Display Component
const GeneratedProjectDisplay: React.FC<GeneratedProjectDisplayProps> = ({ project, config, onStartOver, onDownload }) => {
  const [activeTab, setActiveTab] = useState('bash');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Check className="w-5 h-5" />
                Project Generated Successfully
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {config.name} - {config.framework} with {config.database}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onStartOver}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-700">
          <div className="flex">
            {[
              { id: 'bash', label: 'Setup Script', icon: Code },
              { id: 'structure', label: 'Project Structure', icon: Folder },
              { id: 'dependencies', label: 'Dependencies', icon: Database },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'bash' && (
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-4">Setup Script</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {project.bashScript}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-4">Project Structure</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {project.projectStructure}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-4">Dependencies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.dependencies.map((dep, index) => (
                  <div
                    key={index}
                    className="bg-gray-900 rounded-lg p-3 text-sm text-gray-300 border border-gray-700"
                  >
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NoCodeBackendGenerator = () => {
  const [currentStep, setCurrentStep] = useState<'setup' | 'workflow' | 'generated'>('setup');
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize Gemini AI (you'll need to add your API key)
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

  const handleProjectSetup = (config: ProjectConfig) => {
    setProjectConfig(config);
    setCurrentStep('workflow');
  };

  const generateProjectFromWorkflow = async (config: ProjectConfig, workflow: { nodes: Node[]; edges: Edge[] }) => {
    setIsGenerating(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      // Create a detailed description of the workflow for the AI
      const workflowDescription = workflow.nodes.map(node => {
        const connections = workflow.edges
          .filter(edge => edge.source === node.id || edge.target === node.id)
          .map(edge => edge.source === node.id ? `connects to ${edge.target}` : `receives from ${edge.source}`)
          .join(', ');
        
        return `${node.data.label} (${node.data.description})${connections ? ` - ${connections}` : ''}`;
      }).join('\n');

      const prompt = `Generate a complete setup for a ${config.language} backend project using ${config.framework} framework with ${config.database} database. Project name: ${config.name}

Based on this workflow architecture:
${workflowDescription}

Please provide:
1. A complete bash script to set up the project (including directory creation, package installation, basic file structure)
2. The expected project structure (as a tree view)
3. List of main dependencies

Format the response as JSON with keys: bashScript, projectStructure, dependencies (array)

Make sure the bash script includes:
- Project directory creation
- Package manager initialization
- Framework installation
- Database setup/configuration based on the workflow
- Basic file structure creation for each component in the workflow
- Environment file setup
- Basic server/app file creation
- Implementation stubs for each workflow component

For ${config.framework} with ${config.database}, include appropriate:
- Connection setup
- Environment variables
- Routes and endpoints based on the workflow
- Middleware setup based on the workflow components
- Authentication setup if included in workflow
- Email service setup if included in workflow
- Caching setup if included in workflow
- Docker configuration if included in workflow`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON from the response
      let parsedResponse;
      try {
        // Clean the response text to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        // Fallback with mock data if parsing fails
        parsedResponse = generateMockProject(config, workflow);
      }

      setGeneratedProject(parsedResponse);
      setCurrentStep('generated');
    } catch (error) {
      console.error('Error generating project:', error);
      // Use mock data as fallback
      const mockProject = generateMockProject(config, workflow);
      setGeneratedProject(mockProject);
      setCurrentStep('generated');
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced mock project generation that considers the workflow
  const generateMockProject = (config: ProjectConfig, workflow: { nodes: Node[]; edges: Edge[] }): GeneratedProject => {
    const hasAuth = workflow.nodes.some(node => node.data.nodeType === 'auth');
    const hasEmail = workflow.nodes.some(node => node.data.nodeType === 'email');
    const hasCache = workflow.nodes.some(node => node.data.nodeType === 'cache');
    const hasDocker = workflow.nodes.some(node => node.data.nodeType === 'docker');
    const hasScheduler = workflow.nodes.some(node => node.data.nodeType === 'scheduler');
    const hasWebhooks = workflow.nodes.some(node => node.data.nodeType === 'webhook');

    const bashScript = `#!/bin/bash

# Create project directory
mkdir ${config.name}
cd ${config.name}

# Initialize project
${config.language === 'javascript' || config.language === 'typescript' ? 'npm init -y' : 'pip init'}

# Install core dependencies
${config.framework === 'nodejs-express' ? 'npm install express cors helmet morgan dotenv' : ''}
${config.framework === 'nodejs-fastify' ? 'npm install fastify @fastify/cors dotenv' : ''}
${config.framework === 'python-flask' ? 'pip install flask flask-cors python-dotenv' : ''}
${config.framework === 'python-django' ? 'pip install django djangorestframework python-dotenv' : ''}

# Install database dependencies
${config.database === 'postgresql' ? 'npm install pg' : ''}
${config.database === 'mongodb' ? 'npm install mongoose' : ''}
${config.database === 'supabase' ? 'npm install @supabase/supabase-js' : ''}

# Install workflow-specific dependencies
${hasAuth ? 'npm install jsonwebtoken bcryptjs' : ''}
${hasEmail ? 'npm install nodemailer' : ''}
${hasCache ? 'npm install redis' : ''}
${hasScheduler ? 'npm install node-cron' : ''}
${hasWebhooks ? 'npm install crypto' : ''}

# Create basic structure based on workflow
mkdir src routes models controllers middleware config
${hasAuth ? 'mkdir src/auth' : ''}
${hasEmail ? 'mkdir src/services' : ''}
${hasCache ? 'mkdir src/cache' : ''}
${hasWebhooks ? 'mkdir src/webhooks' : ''}

# Create configuration files
touch src/app.js src/server.js .env .gitignore README.md
${hasDocker ? 'touch Dockerfile docker-compose.yml' : ''}

# Create basic app file with workflow components
echo "// ${config.framework} server with workflow components" > src/app.js
${hasAuth ? 'echo "// Authentication middleware" > src/auth/index.js' : ''}
${hasEmail ? 'echo "// Email service" > src/services/email.js' : ''}

echo "Project setup complete with workflow components!"`;

    const projectStructure = `${config.name}/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── routes/
${hasAuth ? '│   ├── auth/' : ''}
${hasEmail ? '│   ├── services/' : ''}
${hasCache ? '│   ├── cache/' : ''}
${hasWebhooks ? '│   ├── webhooks/' : ''}
├── models/
├── controllers/
├── middleware/
├── config/
├── .env
├── .gitignore
├── package.json
${hasDocker ? '├── Dockerfile' : ''}
${hasDocker ? '├── docker-compose.yml' : ''}
└── README.md`;

    const dependencies = [
      config.framework.includes('express') ? 'express' : '',
      config.framework.includes('fastify') ? 'fastify' : '',
      'cors',
      'helmet',
      'dotenv',
      config.database === 'postgresql' ? 'pg' : '',
      config.database === 'mongodb' ? 'mongoose' : '',
      config.database === 'supabase' ? '@supabase/supabase-js' : '',
      hasAuth ? 'jsonwebtoken' : '',
      hasAuth ? 'bcryptjs' : '',
      hasEmail ? 'nodemailer' : '',
      hasCache ? 'redis' : '',
      hasScheduler ? 'node-cron' : '',
      hasWebhooks ? 'crypto' : '',
    ].filter(Boolean);

    return { bashScript, projectStructure, dependencies };
  };

  const handleStartOver = () => {
    setCurrentStep('setup');
    setProjectConfig(null);
    setGeneratedProject(null);
  };

  const handleDownload = () => {
    if (generatedProject && projectConfig) {
      const content = `# ${projectConfig.name} Setup Script\n\n${generatedProject.bashScript}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectConfig.name}-setup.sh`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleBackToSetup = () => {
    setCurrentStep('setup');
    setProjectConfig(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              No-Code Backend Generator
            </h1>
            <div className="flex items-center gap-6">
              {/* Progress Indicator */}
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 ${currentStep === 'setup' ? 'text-blue-400' : currentStep === 'workflow' || currentStep === 'generated' ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentStep === 'setup' ? 'bg-blue-400' : currentStep === 'workflow' || currentStep === 'generated' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  Setup
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
                <div className={`flex items-center gap-2 ${currentStep === 'workflow' ? 'text-blue-400' : currentStep === 'generated' ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentStep === 'workflow' ? 'bg-blue-400' : currentStep === 'generated' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  Design
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
                <div className={`flex items-center gap-2 ${currentStep === 'generated' ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${currentStep === 'generated' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  Generate
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  AI-Powered
                </span>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={currentStep === 'workflow' ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
        {currentStep === 'setup' && (
          <div className="space-y-12">
            {/* Enhanced Hero Section */}
            <div className="text-center relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-96 h-96 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl"></div>
              </div>
              <div className="relative">
                <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-6 leading-tight">
                  Create Your Backend
                  <br />
                  <span className="text-white">in Minutes</span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                  Choose your tech stack and design your architecture visually. 
                  Our AI will generate a complete backend project with setup scripts, 
                  <span className="text-blue-400 font-medium"> folder structure</span>, and 
                  <span className="text-purple-400 font-medium"> all dependencies</span> configured.
                </p>
                
                {/* Feature highlights */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 mb-8">
                  <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-700/50">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-700/50">
                    <Code className="w-4 h-4 text-green-400" />
                    <span>Production Ready</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-700/50">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span>Fully Customizable</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-700/50">
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Instant Download</span>
                  </div>
                </div>
              </div>
            </div>
            
            <ProjectSetupForm 
              onCreateProject={handleProjectSetup} 
              isGenerating={isGenerating}
            />
          </div>
        )}

        {currentStep === 'workflow' && projectConfig && (
          <div className="h-screen">
            <WorkflowBuilder
              config={projectConfig}
              onGenerateProject={generateProjectFromWorkflow}
            />
            {/* Back Button - Repositioned to lower left of canvas */}
            <button
              onClick={handleBackToSetup}
              className="fixed bottom-6 left-85 z-50 flex items-center gap-2 px-4 py-3 bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-gray-600 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="font-medium">Back to Setup</span>
            </button>
          </div>
        )}

        {currentStep === 'generated' && generatedProject && projectConfig && (
          <GeneratedProjectDisplay
            project={generatedProject}
            config={projectConfig}
            onStartOver={handleStartOver}
            onDownload={handleDownload}
          />
        )}
      </div>

      {/* Footer - Only show on setup and generated steps */}
      {currentStep !== 'workflow' && (
        <div className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center text-gray-400">
              <p className="mb-2">Powered by Gemini AI • Built with Next.js & React Flow</p>
              <p className="text-sm">Generate production-ready backend projects with visual workflow design</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoCodeBackendGenerator; 