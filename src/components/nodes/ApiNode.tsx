import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { 
  Globe, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Send,
  Shield
} from "lucide-react";

// HTTP Method types and colors
const HTTP_METHODS = {
  GET: { color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" },
  POST: { color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
  PUT: { color: "bg-orange-500", textColor: "text-orange-700", bgLight: "bg-orange-50" },
  PATCH: { color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  DELETE: { color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" }
} as const;

type HttpMethod = keyof typeof HTTP_METHODS;

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ApiNodeData {
  method: HttpMethod;
  path: string;
  description: string;
  parameters: ApiParameter[];
  requestBodySample: string;
  authRequired: boolean;
  baseUrl?: string;
  tags?: string[];
  // Keep original properties for compatibility
  label?: string;
  iconName?: string;
  color?: string;
  nodeType?: string;
}

interface ApiNodeProps {
  data: ApiNodeData;
  selected?: boolean;
  id: string;
}

const ApiNode: React.FC<ApiNodeProps> = ({ data, selected, id }) => {
  const { setNodes } = useReactFlow();
  
  const [endpointData, setEndpointData] = useState<ApiNodeData>({
    method: data.method || "POST",
    path: data.path || "/endpoint",
    description: data.description || "API endpoint description",
    parameters: data.parameters || [],
    requestBodySample: data.requestBodySample || "",
    authRequired: data.authRequired || false,
    baseUrl: data.baseUrl || "/api/v1",
    tags: data.tags || [],
    // Preserve original properties
    label: data.label,
    iconName: data.iconName,
    color: data.color,
    nodeType: data.nodeType
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Function to update the node data in the ReactFlow state
  const updateNodeData = useCallback((newData: ApiNodeData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData
            }
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  // Update endpoint data and sync with ReactFlow
  const updateEndpointData = useCallback((field: keyof ApiNodeData, value: any) => {
    const newData = { ...endpointData, [field]: value };
    setEndpointData(newData);
    updateNodeData(newData);
  }, [endpointData, updateNodeData]);

  // Sync initial data when component mounts or data changes
  useEffect(() => {
    const hasChanges = Object.keys(endpointData).some(key => {
      const k = key as keyof ApiNodeData;
      return JSON.stringify(endpointData[k]) !== JSON.stringify(data[k]);
    });

    if (hasChanges) {
      updateNodeData(endpointData);
    }
  }, [endpointData, data, updateNodeData]);

  const addParameter = useCallback(() => {
    const newParam: ApiParameter = {
      name: "param_name",
      type: "string",
      required: false,
      description: "Parameter description"
    };
    const newParameters = [...endpointData.parameters, newParam];
    updateEndpointData("parameters", newParameters);
  }, [endpointData.parameters, updateEndpointData]);

  const updateParameter = useCallback((paramIndex: number, field: keyof ApiParameter, value: any) => {
    const updatedParams = endpointData.parameters.map((param, index) =>
      index === paramIndex ? { ...param, [field]: value } : param
    );
    updateEndpointData("parameters", updatedParams);
  }, [endpointData.parameters, updateEndpointData]);

  const deleteParameter = useCallback((paramIndex: number) => {
    const updatedParams = endpointData.parameters.filter((_, index) => index !== paramIndex);
    updateEndpointData("parameters", updatedParams);
  }, [endpointData.parameters, updateEndpointData]);

  const methodStyle = HTTP_METHODS[endpointData.method];

  return (
    <div
      className={`shadow-lg rounded-lg bg-white border-2 ${
        selected ? "border-purple-500" : "border-gray-200"
      } hover:border-gray-300 transition-all duration-200 min-w-[350px] max-w-[450px]`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6, top: "50%" }}
      />

      {/* Endpoint Header */}
      <div className={`${methodStyle.bgLight} px-4 py-3 rounded-t-lg border-b border-gray-200`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1">
            <select
              value={endpointData.method}
              onChange={(e) => updateEndpointData("method", e.target.value as HttpMethod)}
              className={`${methodStyle.color} text-white text-xs font-bold px-3 py-1 rounded border-none outline-none`}
            >
              {Object.keys(HTTP_METHODS).map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <input
              type="text"
              value={endpointData.path}
              onChange={(e) => updateEndpointData("path", e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm font-mono outline-none focus:border-purple-500"
              placeholder="/endpoint"
            />
          </div>
          <div className="flex items-center space-x-2">
            {endpointData.authRequired && (
              <Shield className="w-4 h-4 text-yellow-600" title="Auth Required" />
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div className="mb-2">
          <input
            type="text"
            value={endpointData.baseUrl || ""}
            onChange={(e) => updateEndpointData("baseUrl", e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-600 outline-none focus:border-purple-500"
            placeholder="Base URL (e.g., /api/v1)"
          />
        </div>

        {/* Description */}
        <textarea
          value={endpointData.description}
          onChange={(e) => updateEndpointData("description", e.target.value)}
          className={`w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm resize-none outline-none focus:border-purple-500 ${methodStyle.textColor}`}
          rows={2}
          placeholder="Endpoint description"
        />
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Auth Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={endpointData.authRequired}
              onChange={(e) => updateEndpointData("authRequired", e.target.checked)}
              className="rounded"
            />
            <label className="text-sm text-gray-600">Requires Authentication</label>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Parameters</span>
              <button
                onClick={addParameter}
                className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            
            {endpointData.parameters.length > 0 && (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-5 gap-2 text-xs text-gray-500 font-medium">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Required</span>
                  <span>Description</span>
                  <span></span>
                </div>
                
                {/* Parameters */}
                {endpointData.parameters.map((param, paramIndex) => (
                  <div key={paramIndex} className="grid grid-cols-5 gap-2 text-xs">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => updateParameter(paramIndex, "name", e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-purple-500"
                      placeholder="name"
                    />
                    <select
                      value={param.type}
                      onChange={(e) => updateParameter(paramIndex, "type", e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-purple-500"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                      <option value="array">array</option>
                    </select>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParameter(paramIndex, "required", e.target.checked)}
                        title="Required"
                      />
                    </div>
                    <input
                      type="text"
                      value={param.description}
                      onChange={(e) => updateParameter(paramIndex, "description", e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-purple-500"
                      placeholder="description"
                    />
                    <button
                      onClick={() => deleteParameter(paramIndex)}
                      className="text-red-500 hover:text-red-700 flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Body Sample */}
          {(endpointData.method === "POST" || endpointData.method === "PUT" || endpointData.method === "PATCH") && (
            <div>
              <div className="flex items-center space-x-1 mb-2">
                <Send className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Request Body Sample</span>
              </div>
              <textarea
                value={endpointData.requestBodySample}
                onChange={(e) => updateEndpointData("requestBodySample", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded text-xs font-mono resize-none outline-none focus:border-purple-500 bg-gray-50"
                rows={4}
                placeholder='{ "key": "value" }'
              />
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

export default ApiNode;