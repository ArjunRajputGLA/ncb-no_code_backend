import React from "react";
import { Plus, Play, Save, Box } from "lucide-react"; // Add Box as fallback icon

type NodeSidebarProps = {
  nodeTemplates: any[];
  iconMap: any;
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeTemplate: any
  ) => void;
  executeWorkflow: () => void;
  saveWorkflow: () => void;
  clearWorkflow: () => void;
  nodesLength: number;
};

const NodeSidebar: React.FC<NodeSidebarProps> = ({
  nodeTemplates,
  iconMap,
  onDragStart,
  executeWorkflow,
  saveWorkflow,
  clearWorkflow,
  nodesLength,
}) => (
  <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        Add Nodes
      </h2>
    </div>
    <div className="flex-1 p-4 space-y-3 overflow-y-auto">
      {nodeTemplates.map((nodeTemplate) => {
        // Add fallback for missing icons
        const IconComponent = iconMap[nodeTemplate.iconName] || Box;
        
        // Add console warning for debugging
        if (!iconMap[nodeTemplate.iconName]) {
          console.warn(`Icon "${nodeTemplate.iconName}" not found in iconMap for node "${nodeTemplate.label}"`);
        }
        
        return (
          <div
            key={nodeTemplate.id}
            onDragStart={(event) => onDragStart(event, nodeTemplate)}
            draggable
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 cursor-move transition-all duration-150 shadow-sm hover:shadow-md group"
          >
            <div
              className={`w-8 h-8 rounded-md ${nodeTemplate.color} flex items-center justify-center group-hover:scale-105 transition-transform`}
            >
              <IconComponent className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {nodeTemplate.label}
            </span>
          </div>
        );
      })}
    </div>
    <div className="p-4 space-y-2 border-t border-gray-200">
      <button
        onClick={executeWorkflow}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={nodesLength === 0}
      >
        <Play className="w-4 h-4" />
        Execute
      </button>
      <button
        onClick={saveWorkflow}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
      >
        <Save className="w-4 h-4" />
        Save
      </button>
      <button
        onClick={clearWorkflow}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
      >
        Clear All
      </button>
    </div>
  </div>
);

export default NodeSidebar;