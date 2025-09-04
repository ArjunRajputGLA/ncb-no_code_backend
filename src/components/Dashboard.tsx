import React from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import { Settings, Plus } from "lucide-react";

type DashboardProps = {
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onDrop: any;
  onDragOver: any;
  nodeTypes: any;
};

const Dashboard: React.FC<DashboardProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  nodeTypes,
}) => (
  <div className="flex-1 flex flex-col">
    {/* Header */}
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          Workflow Builder
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Nodes: {nodes.length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connections: {edges.length}
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </button>
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
        className="bg-gray-50"
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#e5e7eb" gap={20} size={2} variant="dots" />
        <MiniMap
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
          nodeColor={() => "#6b7280"}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-right"
        />
        <Controls
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
          position="top-right"
        />
      </ReactFlow>
      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center text-gray-400 bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg">
            <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Start Building Your Workflow
            </p>
            <p className="text-sm">
              Drag and drop nodes from the sidebar to get started
            </p>
            <div className="mt-4 text-xs text-gray-500">
              💡 Tip: Connect nodes by dragging from the right handle to the
              left handle
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default Dashboard;
