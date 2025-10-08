"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
  Connection,
  NodeTypes,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Database,
  Mail,
  Webhook,
  Timer,
  Code,
  Send,
  Play,
  Save,
  Shield,
  Table,
  FolderOpen,
  Users,
  Zap,
  Package,
  Globe,
  Download,
  Upload,
  Trash2,
  Bot,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  FileText,
  Eye,
  EyeOff,
  Plus,
  ChevronLeft,
  ChevronRight,
  Box,
} from "lucide-react";

import Dashboard from "../components/Dashboard";
import ApiNode from "@/components/nodes/ApiNode";
import ResponseNode from "./nodes/ResponseNode";
import TransformationNode from "@/components/nodes/TransformationNode";
import ValidationNode from "@/components/nodes/ValidationNode";
import DatabaseNode from "@/components/nodes/DatabaseNode";
import FileExplorer from "./File Explorer/FileExplorer";
import { WorkflowSerializer } from "@/utils/workflowSerializer";
import Chatbot from "./Chatbot";
import WorkflowApplier from "./WorkflowApplier";
import AIBackendGenerator from "./Ai-agent/AIBackendGenerator";
import { getDatabase } from "@/utils/database";

const iconMap = {
  Database,
  Mail,
  Webhook,
  Timer,
  Code,
  Table,
  FolderOpen,
  Users,
  Zap,
  Package,
  Globe,
  Send,
  Shield,
};

type CustomNodeData = {
  label: string;
  iconName: keyof typeof iconMap;
  color: string;
  nodeType: string;
  title?: string;
};

type CustomNodeProps = {
  data: CustomNodeData;
  selected?: boolean;
};

// Custom Node Component
const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const IconComponent = iconMap[data.iconName];

  return (
    <div
      className={`px-4 py-2 shadow-lg rounded-lg bg-white border-2 min-w-[120px] ${
        selected ? "border-blue-500" : "border-gray-200"
      } hover:border-gray-300 transition-all duration-200`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6 }}
      />

      <div className="flex items-center space-x-2">
        <div
          className={`w-8 h-8 rounded-md ${data.color} flex items-center justify-center flex-shrink-0`}
        >
          {IconComponent && <IconComponent className="w-4 h-4 text-white" />}
        </div>
        <div className="text-sm font-medium text-gray-700 truncate">
          {data.label}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 hover:!bg-green-500 transition-colors"
        style={{ right: -6 }}
      />
    </div>
  );
};

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  customNode: CustomNode,
  apiNode: ApiNode,
  responseNode: ResponseNode,
  transformationNode: TransformationNode,
  validationNode: ValidationNode,
  databaseNode: DatabaseNode,
};

// Node templates
const nodeTemplates = [
  {
    id: "apiService",
    type: "api",
    nodeType: "apiNode",
    iconName: "Globe",
    label: "API Service",
    color: "bg-purple-600",
  },
  {
    id: "httpResponse",
    type: "response",
    nodeType: "responseNode",
    iconName: "Send",
    label: "HTTP Response",
    color: "bg-green-600",
  },
  {
    id: "dataTransformation",
    type: "transformation",
    nodeType: "transformationNode",
    iconName: "Code",
    label: "Data Transformation",
    color: "bg-blue-600",
  },
  {
    id: "dataValidation",
    type: "validation",
    nodeType: "validationNode",
    iconName: "Shield",
    label: "Data Validation",
    color: "bg-red-600",
  },
  {
    id: "supabaseDatabase",
    type: "database",
    nodeType: "databaseNode",
    iconName: "Database",
    label: "Supabase Database",
    color: "bg-green-600",
  },
];

// Shrinkable NodeSidebar Component
type NodeSidebarProps = {
  nodeTemplates: any[];
  iconMap: any;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeTemplate: any) => void;
  executeWorkflow: () => void;
  saveWorkflow: () => void;
  clearWorkflow: () => void;
  nodesLength: number;
  projectName: string;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  exportWorkflow: () => void;
  importWorkflow: () => void;
  onBackToProjects: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  edgesLength: number;
  showAIGenerator: () => void;
  projectId?: string;
};

const NodeSidebar: React.FC<NodeSidebarProps> = ({
  nodeTemplates,
  iconMap,
  onDragStart,
  executeWorkflow,
  saveWorkflow,
  clearWorkflow,
  nodesLength,
  projectName,
  workflowName,
  setWorkflowName,
  exportWorkflow,
  importWorkflow,
  onBackToProjects,
  saveStatus,
  edgesLength,
  showAIGenerator,
  projectId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`${isExpanded ? 'w-80' : 'w-16'} bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {isExpanded ? (
          <div className="flex-1">
            {/* Back to Projects Button */}
            <div className="mb-4">
              <button
                onClick={onBackToProjects}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200 text-sm font-medium"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Projects</span>
              </button>
            </div>

            {/* Project Info */}
            {projectName && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Project
                </div>
                <div className="text-sm font-medium text-gray-900">{projectName}</div>
              </div>
            )}

            {/* Workflow Name Input */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter workflow name"
              />
            </div>

            {/* Export/Import Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={exportWorkflow}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                disabled={nodesLength === 0}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={importWorkflow}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
            </div>
          </div>
        ) : null}
        
        <button
          onClick={toggleSidebar}
          className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${!isExpanded ? 'mx-auto' : 'ml-2'}`}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Node Templates Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isExpanded && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Available Nodes
            </h3>
          </div>
        )}
        
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {nodeTemplates.map((nodeTemplate) => {
            const IconComponent = iconMap[nodeTemplate.iconName] || Box;
            
            if (!iconMap[nodeTemplate.iconName]) {
              console.warn(`Icon "${nodeTemplate.iconName}" not found in iconMap for node "${nodeTemplate.label}"`);
            }
            
            return (
              <div
                key={nodeTemplate.id}
                onDragStart={(event) => onDragStart(event, nodeTemplate)}
                draggable
                className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 cursor-move transition-all duration-150 shadow-sm hover:shadow-md group ${!isExpanded ? 'justify-center' : ''}`}
                title={!isExpanded ? nodeTemplate.label : ''}
              >
                <div
                  className={`w-10 h-10 rounded-md ${nodeTemplate.color} flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0`}
                >
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                {isExpanded && (
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {nodeTemplate.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      Drag to canvas to add
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* AI Generator Button */}
        <button
          onClick={showAIGenerator}
          disabled={nodesLength === 0}
          className={`w-full flex items-center ${isExpanded ? 'justify-center' : 'justify-center'} space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg`}
          title={!isExpanded ? "Generate Backend with AI" : ''}
        >
          <Bot className="w-5 h-5" />
          {isExpanded && <span>Generate Backend with AI</span>}
        </button>

        {/* Execute Button */}
        <button
          onClick={executeWorkflow}
          className={`w-full flex items-center ${isExpanded ? 'justify-center' : 'justify-center'} space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors`}
          title={!isExpanded ? "Execute Workflow" : ''}
        >
          <Play className="w-4 h-4" />
          {isExpanded && <span>Execute Workflow</span>}
        </button>

        {/* Save and Clear Buttons Row */}
        <div className="flex space-x-2">
          <button
            onClick={saveWorkflow}
            disabled={saveStatus === 'saving' || !projectId}
            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md transition-colors text-sm ${
              saveStatus === 'saving' 
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                : saveStatus === 'saved'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : saveStatus === 'error'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={!isExpanded ? (saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save') : ''}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                {isExpanded && <span>Saving...</span>}
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {isExpanded && <span>Saved</span>}
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                {isExpanded && <span>Error</span>}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isExpanded && <span>Save</span>}
              </>
            )}
          </button>
          
          <button
            onClick={clearWorkflow}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            title={!isExpanded ? "Clear All" : ''}
          >
            <Trash2 className="w-4 h-4" />
            {isExpanded && <span>Clear</span>}
          </button>
        </div>

        {/* Workflow Stats */}
        {isExpanded && (
          <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
            <div>
              Nodes: {nodesLength} | Connections: {edgesLength}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface WorkflowBuilderProps {
  projectId?: string;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ projectId }) => {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeId, setNodeId] = useState<number>(1);
  const [workflowName, setWorkflowName] = useState<string>("My Workflow");
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [projectName, setProjectName] = useState<string>('');
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(true);
  
  // New state for file explorer
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');

  // Load project and workflow data on component mount
  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return;
    
    const loadProjectAndWorkflow = async () => {
      try {
        setIsLoadingWorkflow(true);
        const db = getDatabase();
        
        // Load project details
        const project = await db.getProject(projectId);
        if (project) {
          setProjectName(project.name);
          setWorkflowName(`${project.name} Workflow`);
        }

        // Load existing workflow
        const workflow = await db.getWorkflow(projectId);
        if (workflow) {
          setNodes(workflow.nodes || []);
          setEdges(workflow.edges || []);
          
          // Update nodeId counter based on existing nodes
          if (workflow.nodes && workflow.nodes.length > 0) {
            const maxId = workflow.nodes.reduce((max: number, node: any) => {
              const nodeNum = parseInt(node.id.replace('node_', ''));
              return nodeNum > max ? nodeNum : max;
            }, 0);
            setNodeId(maxId + 1);
          }
        }
      } catch (error) {
        console.error('Error loading project and workflow:', error);
        setSaveStatus('error');
      } finally {
        setIsLoadingWorkflow(false);
      }
    };

    loadProjectAndWorkflow();
  }, [projectId, setNodes, setEdges]);

  // Auto-save workflow when nodes or edges change (after initial load)
  useEffect(() => {
    if (!projectId || isLoadingWorkflow || typeof window === 'undefined') return;
    
    // Debounce auto-save to avoid too frequent saves
    const timeoutId = setTimeout(async () => {
      if (nodes.length > 0 || edges.length > 0) {
        try {
          const db = getDatabase();
          await db.saveWorkflow(projectId, nodes, edges);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, projectId, isLoadingWorkflow]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#6b7280", strokeWidth: 2 },
            type: "smoothstep",
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = (
        event.target as HTMLElement
      ).getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      const nodeDataString = event.dataTransfer.getData("application/nodedata");

      if (typeof type === "undefined" || !type || !nodeDataString) {
        return;
      }

      let nodeData;
      try {
        nodeData = JSON.parse(nodeDataString);
      } catch (e) {
        console.error("Failed to parse node data:", e);
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left - 60,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode = {
        id: `node_${nodeId}`,
        type: nodeData.nodeType,
        position,
        data: {
          label: nodeData.label,
          iconName: nodeData.iconName,
          color: nodeData.color,
          nodeType: nodeData.type,
          // Default data for API nodes
          ...(nodeData.nodeType === "apiNode" && {
            method: "GET",
            path: "/endpoint",
            description: "API endpoint description",
            parameters: [],
            requestBodySample: "",
            authRequired: false,
            baseUrl: "/api/v1",
            tags: [],
          }),
          // Default data for Response nodes
          ...(nodeData.nodeType === "responseNode" && {
            statusCode: 200,
            responseBody: `{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}`,
            contentType: "application/json",
            customHeaders: [],
            templates: [
              {
                name: "Success Response",
                statusCode: 200,
                body: '{\n  "success": true,\n  "message": "Request completed successfully",\n  "data": {}\n}',
                headers: [],
              },
            ],
            enableCORS: true,
            enableCache: false,
            cacheMaxAge: 3600,
          }),
          // Default data for Transformation nodes
          ...(nodeData.nodeType === "transformationNode" && {
            transformations: [],
            isExpanded: true,
            status: "idle",
            iconName: "Code",
            color: "bg-blue-600",
            nodeType: "transformation",
          }),
          // Default data for Validation nodes
          ...(nodeData.nodeType === "validationNode" && {
            rules: [],
            isExpanded: true,
            status: "idle",
            validationMode: "strict",
            stopOnFirstError: true,
            iconName: "Shield",
            color: "bg-red-600",
            nodeType: "validation",
          }),
          // Default data for Database nodes
          ...(nodeData.nodeType === "databaseNode" && {
            projectUrl: "",
            apiKey: "",
            selectedTable: "",
            iconName: "Database",
            color: "bg-green-600",
            nodeType: "database",
          }),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeId((id) => id + 1);
    },
    [nodeId, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeTemplate: any
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeTemplate.nodeType);
    event.dataTransfer.setData(
      "application/nodedata",
      JSON.stringify(nodeTemplate)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  // File Explorer handlers
  const handleFileSelect = (file: any) => {
    setSelectedFile(file);
    console.log('Selected file:', file);
  };

  const handleDirectoryChange = (path: string) => {
    setCurrentDirectory(path);
  };

  // Workflow operations
  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setNodeId(1);
    setWorkflowName("My Workflow");
  };

  const executeWorkflow = () => {
    if (nodes.length === 0) {
      alert("Please add some nodes to execute the workflow!");
      return;
    }

    const apiNodes = nodes.filter((n) => n.type === "apiNode");
    const responseNodes = nodes.filter((n) => n.type === "responseNode");

    const summary =
      `Executing workflow: ${workflowName}\n\n` +
      `API Endpoints: ${apiNodes.length}\n` +
      `Response Nodes: ${responseNodes.length}\n` +
      `Connections: ${edges.length}\n\n` +
      `Workflow ready for execution!`;

    alert(summary);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "apiNode":
        return "bg-purple-600";
      case "responseNode":
        return "bg-green-600";
      case "transformationNode":
        return "bg-blue-600";
      case "validationNode":
        return "bg-red-600";
      case "databaseNode":
        return "bg-green-600";
      default:
        return "bg-gray-300";
    }
  };

  const exportWorkflow = () => {
    try {
      const nodesForExport = nodes.map((node) => {
        const { color, ...dataWithoutColor } = node.data;
        return { ...node, data: dataWithoutColor };
      });

      const workflow = WorkflowSerializer.serialize(nodesForExport, edges, {
        name: workflowName,
        description: "Exported workflow with API and Response nodes",
      });

      WorkflowSerializer.exportToFile(workflow);

      const summary =
        `Exported: ${workflowName}\n\n` +
        `Nodes: ${workflow.nodes.length}\n` +
        `Connections: ${workflow.connections.length}\n` +
        `Export completed successfully!`;

      alert(summary);
    } catch (error) {
      alert(`Export failed: ${error}`);
    }
  };

  const importWorkflow = async () => {
    try {
      const workflow = await WorkflowSerializer.importFromFile();
      const { nodes: importedNodes, edges: importedEdges } =
        WorkflowSerializer.deserialize(workflow);

      const nodesWithColor = importedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          color: getNodeColor(node.type),
        },
      }));

      setNodes(nodesWithColor);
      setEdges(importedEdges);
      setWorkflowName(workflow.metadata.name);

      const maxId = Math.max(
        0,
        ...nodesWithColor.map((n) => parseInt(n.id.split("_")[1]) || 0)
      );
      setNodeId(maxId + 1);

      const summary =
        `Imported: ${workflow.metadata.name}\n\n` +
        `Nodes: ${nodesWithColor.length}\n` +
        `Connections: ${importedEdges.length}\n` +
        `Import completed successfully!`;

      alert(summary);
    } catch (error) {
      alert(`Import failed: ${error}`);
    }
  };

  const saveWorkflow = async () => {
    if (!projectId || typeof window === 'undefined') {
      setSaveStatus('error');
      return;
    }

    try {
      setSaveStatus('saving');
      const db = getDatabase();
      await db.saveWorkflow(projectId, nodes, edges);
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setSaveStatus('error');
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleBackToProjects = () => {
    router.push('/');
  };

  const handleApplyWorkflow = (workflowData: any) => {
    if (!workflowData) return;
    const nodesWithColor = workflowData.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        color: getNodeColor(node.type),
      },
    }));
    setNodes(nodesWithColor);
    setEdges(workflowData.connections || []);
    setWorkflowName(workflowData.metadata?.name || "My Workflow");
    const maxId = Math.max(
      0,
      ...nodesWithColor.map((n: any) => parseInt(n.id.split("_")[1]) || 0)
    );
    setNodeId(maxId + 1);
    setGeneratedWorkflow(null);
  };

  const handleClearGenerated = () => setGeneratedWorkflow(null);

  return (
    <>
      {/* Loading State */}
      {isLoadingWorkflow ? (
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Loading {projectName || 'Project'}
            </h2>
            <p className="text-gray-600">Please wait while we load your workflow...</p>
          </div>
        </div>
      ) : (
        <div className="flex h-screen bg-gray-50 relative">
          {/* Left Sidebar - Shrinkable Node Templates */}
          <NodeSidebar
            nodeTemplates={nodeTemplates}
            iconMap={iconMap}
            onDragStart={onDragStart}
            executeWorkflow={executeWorkflow}
            saveWorkflow={saveWorkflow}
            clearWorkflow={clearWorkflow}
            nodesLength={nodes.length}
            projectName={projectName}
            workflowName={workflowName}
            setWorkflowName={setWorkflowName}
            exportWorkflow={exportWorkflow}
            importWorkflow={importWorkflow}
            onBackToProjects={handleBackToProjects}
            saveStatus={saveStatus}
            edgesLength={edges.length}
            showAIGenerator={() => setShowAIGenerator(true)}
            projectId={projectId}
          />

          {/* Middle - Dashboard */}
          <div className="flex-1 flex flex-col">
            <Dashboard
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
            />
          </div>

          {/* Right Sidebar - File Explorer */}
          <div className={`${showFileExplorer ? 'w-80' : 'w-12'} transition-all duration-300 ease-in-out bg-white border-l border-gray-200 relative`}>
            {/* File Explorer Toggle Button */}
            <button
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              className="absolute left-0 top-4 -translate-x-6 z-10 bg-white border border-gray-200 rounded-l-lg px-2 py-2 hover:bg-gray-50 transition-colors shadow-sm"
              title={showFileExplorer ? "Hide File Explorer" : "Show File Explorer"}
            >
              {showFileExplorer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* File Explorer Content */}
            {showFileExplorer && (
              <>
                <FileExplorer
                  onFileSelect={handleFileSelect}
                  onDirectoryChange={handleDirectoryChange}
                  className="h-full"
                />

                {/* Selected File Info Panel */}
                {selectedFile && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Selected File
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="truncate" title={selectedFile.name}>
                        <strong>Name:</strong> {selectedFile.name}
                      </div>
                      <div className="truncate" title={selectedFile.path}>
                        <strong>Path:</strong> {selectedFile.path}
                      </div>
                      {!selectedFile.isDirectory && (
                        <>
                          <div>
                            <strong>Size:</strong> {Math.round(selectedFile.size / 1024)} KB
                          </div>
                          <div>
                            <strong>Type:</strong> {selectedFile.type}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chatbot Floating Button & Panel */}
          <Chatbot
            isOpen={chatbotOpen}
            onToggle={() => setChatbotOpen((open) => !open)}
            onWorkflowGenerated={setGeneratedWorkflow}
          />

          {/* WorkflowApplier Preview */}
          {generatedWorkflow && (
            <div className="fixed bottom-6 left-6 z-50 w-[400px]">
              <WorkflowApplier
                workflowData={generatedWorkflow}
                onApplyWorkflow={handleApplyWorkflow}
                onClearGenerated={handleClearGenerated}
              />
            </div>
          )}

          {/* AI Backend Generator Modal */}
          {showAIGenerator && (
            <AIBackendGenerator
              workflowData={{
                nodes: nodes.map(node => ({
                  type: node.type || 'unknown',
                  id: node.id
                })),
                connections: edges,
              }}
              onClose={() => setShowAIGenerator(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default WorkflowBuilder;