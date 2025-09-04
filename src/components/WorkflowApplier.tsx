// components/WorkflowApplier.tsx
"use client";

import React, { useState } from 'react';
import { CheckCircle, Download, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

interface WorkflowData {
  version: string;
  metadata: {
    name: string;
    description: string;
    createdAt: string;
    lastModified: string;
  };
  nodes: any[];
  connections: any[];
}

interface WorkflowApplierProps {
  workflowData: WorkflowData | null;
  onApplyWorkflow: (workflowData: WorkflowData) => void;
  onClearGenerated: () => void;
}

const WorkflowApplier: React.FC<WorkflowApplierProps> = ({
  workflowData,
  onApplyWorkflow,
  onClearGenerated,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!workflowData) return null;

  const handleApply = () => {
    onApplyWorkflow(workflowData);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowData.metadata.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'apiNode':
        return 'bg-purple-100 text-purple-800';
      case 'responseNode':
        return 'bg-green-100 text-green-800';
      case 'transformationNode':
        return 'bg-blue-100 text-blue-800';
      case 'validationNode':
        return 'bg-red-100 text-red-800';
      case 'databaseNode':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'apiNode':
        return 'API';
      case 'responseNode':
        return 'Response';
      case 'transformationNode':
        return 'Transform';
      case 'validationNode':
        return 'Validate';
      case 'databaseNode':
        return 'Database';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-800">Generated Workflow</h3>
              <p className="text-sm text-gray-500">{workflowData.metadata.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Workflow Info */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Nodes:</span>
                <span className="ml-2 font-medium">{workflowData.nodes.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Connections:</span>
                <span className="ml-2 font-medium">{workflowData.connections.length}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-gray-500 text-sm">Description:</span>
              <p className="text-sm text-gray-700 mt-1">{workflowData.metadata.description}</p>
            </div>
          </div>

          {/* Node Preview */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Nodes Overview:</h4>
            <div className="flex flex-wrap gap-2">
              {workflowData.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getNodeTypeColor(node.type)}`}
                >
                  {node.data.label || getNodeTypeLabel(node.type)}
                </div>
              ))}
            </div>
          </div>

          {/* JSON Preview Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPreview ? 'Hide' : 'Show'} JSON Preview</span>
            </button>
          </div>

          {/* JSON Preview */}
          {showPreview && (
            <div className="mb-4">
              <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(workflowData, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Apply to Canvas</span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClearGenerated}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowApplier;