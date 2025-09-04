"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Code, Plus, Trash2, Settings, Eye, EyeOff } from "lucide-react";

interface TransformationRule {
  id: string;
  type: "map" | "filter" | "sort" | "aggregate" | "format";
  field: string;
  operation: string;
  value: string;
  newField?: string;
  enabled: boolean;
}

interface TransformationNodeData {
  label: string;
  iconName: string;
  color: string;
  nodeType: string;
  transformations: TransformationRule[];
  isExpanded: boolean;
  status: "idle" | "processing" | "success" | "error";
}

interface TransformationNodeProps {
  data: TransformationNodeData;
  selected?: boolean;
  id: string;
}

const transformationTypes = [
  { value: "map", label: "Map Field" },
  { value: "filter", label: "Filter Data" },
  { value: "sort", label: "Sort Data" },
  { value: "aggregate", label: "Aggregate" },
  { value: "format", label: "Format" },
];

const operationsByType = {
  map: ["rename", "copy", "concatenate", "split"],
  filter: [
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
  ],
  sort: ["ascending", "descending"],
  aggregate: ["sum", "count", "average", "min", "max", "group_by"],
  format: ["uppercase", "lowercase", "trim", "date_format", "number_format"],
};

const TransformationNode: React.FC<TransformationNodeProps> = ({
  data,
  selected,
  id,
}) => {
  const { setNodes } = useReactFlow();

  const [nodeData, setNodeData] = useState<TransformationNodeData>({
    transformations: data.transformations || [],
    isExpanded: data.isExpanded !== undefined ? data.isExpanded : true,
    status: data.status || "idle",
    // Keep original properties for compatibility
    label: data.label || "Data Transformation",
    iconName: data.iconName || "Code",
    color: data.color || "bg-blue-600",
    nodeType: data.nodeType || "transformation",
  });

  // Function to update the node data in the ReactFlow state
  const updateNodeData = useCallback(
    (newData: TransformationNodeData) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );

  // Update node data and sync with ReactFlow
  const updateTransformationData = useCallback(
    (field: keyof TransformationNodeData, value: any) => {
      const newData = { ...nodeData, [field]: value };
      setNodeData(newData);
      updateNodeData(newData);
    },
    [nodeData, updateNodeData]
  );

  // Sync initial data when component mounts or data changes
  useEffect(() => {
    const hasChanges = Object.keys(nodeData).some((key) => {
      const k = key as keyof TransformationNodeData;
      return JSON.stringify(nodeData[k]) !== JSON.stringify(data[k]);
    });

    if (hasChanges) {
      updateNodeData(nodeData);
    }
  }, [nodeData, data, updateNodeData]);

  const addTransformation = useCallback(() => {
    const newTransformation: TransformationRule = {
      id: Date.now().toString(),
      type: "map",
      field: "",
      operation: "rename",
      value: "",
      newField: "",
      enabled: true,
    };

    const newTransformations = [...nodeData.transformations, newTransformation];
    updateTransformationData("transformations", newTransformations);
  }, [nodeData.transformations, updateTransformationData]);

  const updateTransformation = useCallback(
    (transformationId: string, updates: Partial<TransformationRule>) => {
      const updatedTransformations = nodeData.transformations.map((t) =>
        t.id === transformationId ? { ...t, ...updates } : t
      );
      updateTransformationData("transformations", updatedTransformations);
    },
    [nodeData.transformations, updateTransformationData]
  );

  const removeTransformation = useCallback(
    (transformationId: string) => {
      const updatedTransformations = nodeData.transformations.filter(
        (t) => t.id !== transformationId
      );
      updateTransformationData("transformations", updatedTransformations);
    },
    [nodeData.transformations, updateTransformationData]
  );

  const toggleTransformation = useCallback(
    (transformationId: string) => {
      const updatedTransformations = nodeData.transformations.map((t) =>
        t.id === transformationId ? { ...t, enabled: !t.enabled } : t
      );
      updateTransformationData("transformations", updatedTransformations);
    },
    [nodeData.transformations, updateTransformationData]
  );

  const toggleExpanded = useCallback(() => {
    updateTransformationData("isExpanded", !nodeData.isExpanded);
  }, [nodeData.isExpanded, updateTransformationData]);

  const getStatusColor = () => {
    switch (nodeData.status) {
      case "processing":
        return "border-yellow-400 bg-yellow-50";
      case "success":
        return "border-green-400 bg-green-50";
      case "error":
        return "border-red-400 bg-red-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  return (
    <div
      className={`shadow-lg rounded-lg border-2 min-w-[320px] max-w-[420px] ${
        selected ? "border-blue-500" : ""
      } ${getStatusColor()} hover:border-gray-300 transition-all duration-200`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6, top: "50%" }}
      />

      {/* Header */}
      <div className={`px-4 py-3 ${data.color} rounded-t-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{data.label}</span>
            <div className="text-xs text-white/70 bg-white/20 px-2 py-1 rounded">
              {nodeData.transformations.filter((t) => t.enabled).length} rules
            </div>
          </div>
          <button
            onClick={toggleExpanded}
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {nodeData.isExpanded && (
        <div className="p-4 space-y-3">
          {/* Add Transformation Button */}
          <button
            onClick={addTransformation}
            className="w-full flex items-center justify-center space-x-2 p-2 border border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transformation</span>
          </button>

          {/* Transformations List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nodeData.transformations.map((transformation, index) => (
              <div
                key={transformation.id}
                className={`p-3 border rounded-md space-y-2 ${
                  transformation.enabled
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-100 bg-gray-25 opacity-60"
                }`}
              >
                {/* Transformation Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <select
                      value={transformation.type}
                      onChange={(e) =>
                        updateTransformation(transformation.id, {
                          type: e.target.value as TransformationRule["type"],
                          operation:
                            operationsByType[
                              e.target.value as keyof typeof operationsByType
                            ][0],
                        })
                      }
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      {transformationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleTransformation(transformation.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {transformation.enabled ? (
                        <Eye className="w-3 h-3 text-green-600" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => removeTransformation(transformation.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Transformation Configuration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field
                    </label>
                    <input
                      type="text"
                      value={transformation.field}
                      onChange={(e) =>
                        updateTransformation(transformation.id, {
                          field: e.target.value,
                        })
                      }
                      placeholder="Field name"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operation
                    </label>
                    <select
                      value={transformation.operation}
                      onChange={(e) =>
                        updateTransformation(transformation.id, {
                          operation: e.target.value,
                        })
                      }
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      {operationsByType[transformation.type].map((op) => (
                        <option key={op} value={op}>
                          {op.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional fields based on operation */}
                <div className="grid grid-cols-1 gap-2">
                  {(transformation.operation === "rename" ||
                    transformation.operation === "copy") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        New Field Name
                      </label>
                      <input
                        type="text"
                        value={transformation.newField || ""}
                        onChange={(e) =>
                          updateTransformation(transformation.id, {
                            newField: e.target.value,
                          })
                        }
                        placeholder="New field name"
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                      />
                    </div>
                  )}
                  {(transformation.operation.includes("equals") ||
                    transformation.operation.includes("contains") ||
                    transformation.operation.includes("than") ||
                    transformation.operation === "concatenate" ||
                    transformation.operation.includes("format")) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={transformation.value}
                        onChange={(e) =>
                          updateTransformation(transformation.id, {
                            value: e.target.value,
                          })
                        }
                        placeholder="Value"
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status Indicator */}
          {nodeData.status !== "idle" && (
            <div className="flex items-center space-x-2 mt-3 p-2 bg-gray-100 rounded">
              <div
                className={`w-2 h-2 rounded-full ${
                  nodeData.status === "processing"
                    ? "bg-yellow-400 animate-pulse"
                    : nodeData.status === "success"
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-xs text-gray-600 capitalize">
                {nodeData.status}
              </span>
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 hover:!bg-green-500 transition-colors"
        style={{ right: -6, top: "50%" }}
      />
    </div>
  );
};

export default TransformationNode;
