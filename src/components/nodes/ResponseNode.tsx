
import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import {
  Send,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Settings,
  Code,
  FileText,
  Globe
} from "lucide-react";

// HTTP Status Code categories and common codes
const HTTP_STATUS_CODES = {
  success: {
    200: "OK - Request successful",
    201: "Created - Resource created successfully", 
    202: "Accepted - Request accepted for processing",
    204: "No Content - Successful but no content to return"
  },
  client_error: {
    400: "Bad Request - Invalid request syntax",
    401: "Unauthorized - Authentication required",
    403: "Forbidden - Access denied",
    404: "Not Found - Resource not found",
    409: "Conflict - Resource conflict",
    422: "Unprocessable Entity - Validation failed",
    429: "Too Many Requests - Rate limit exceeded"
  },
  server_error: {
    500: "Internal Server Error - Server error occurred",
    502: "Bad Gateway - Invalid response from upstream",
    503: "Service Unavailable - Server temporarily unavailable",
    504: "Gateway Timeout - Upstream server timeout"
  }
} as const;

type StatusCategory = keyof typeof HTTP_STATUS_CODES;
type StatusCode = keyof typeof HTTP_STATUS_CODES[StatusCategory];

interface CustomHeader {
  key: string;
  value: string;
  enabled: boolean;
}

interface ResponseTemplate {
  name: string;
  statusCode: number;
  body: string;
  headers: CustomHeader[];
}

interface ResponseNodeData {
  statusCode: number;
  responseBody: string;
  contentType: string;
  customHeaders: CustomHeader[];
  templates: ResponseTemplate[];
  selectedTemplate?: string;
  enableCORS: boolean;
  enableCache: boolean;
  cacheMaxAge: number;
  // Keep original properties for compatibility
  label?: string;
  iconName?: string;
  color?: string;
  nodeType?: string;
}

interface ResponseNodeProps {
  data: ResponseNodeData;
  selected?: boolean;
  id: string;
}

const ResponseNode: React.FC<ResponseNodeProps> = ({ data, selected, id }) => {
  const { setNodes } = useReactFlow();
  
  const [responseData, setResponseData] = useState<ResponseNodeData>({
    statusCode: data.statusCode || 200,
    responseBody: data.responseBody || `{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}`,
    contentType: data.contentType || "application/json",
    customHeaders: data.customHeaders || [],
    templates: data.templates || [
      {
        name: "Success Response",
        statusCode: 200,
        body: '{\n  "success": true,\n  "message": "Request completed successfully",\n  "data": {}\n}',
        headers: []
      },
      {
        name: "Error Response",
        statusCode: 400,
        body: '{\n  "success": false,\n  "message": "Bad request",\n  "errors": []\n}',
        headers: []
      },
      {
        name: "Not Found",
        statusCode: 404,
        body: '{\n  "success": false,\n  "message": "Resource not found"\n}',
        headers: []
      }
    ],
    selectedTemplate: data.selectedTemplate,
    enableCORS: data.enableCORS ?? true,
    enableCache: data.enableCache ?? false,
    cacheMaxAge: data.cacheMaxAge || 3600,
    // Preserve original properties
    label: data.label,
    iconName: data.iconName,
    color: data.color,
    nodeType: data.nodeType
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'templates' | 'settings'>('body');

  // Function to update the node data in the ReactFlow state
  const updateNodeData = useCallback((newData: ResponseNodeData) => {
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

  // Update response data and sync with ReactFlow
  const updateResponseData = useCallback((field: keyof ResponseNodeData, value: any) => {
    const newData = { ...responseData, [field]: value };
    setResponseData(newData);
    updateNodeData(newData);
  }, [responseData, updateNodeData]);

  // Sync initial data when component mounts or data changes
  useEffect(() => {
    const hasChanges = Object.keys(responseData).some(key => {
      const k = key as keyof ResponseNodeData;
      return JSON.stringify(responseData[k]) !== JSON.stringify(data[k]);
    });

    if (hasChanges) {
      updateNodeData(responseData);
    }
  }, [responseData, data, updateNodeData]);

  const addCustomHeader = useCallback(() => {
    const newHeader: CustomHeader = {
      key: "X-Custom-Header",
      value: "value",
      enabled: true
    };
    const newHeaders = [...responseData.customHeaders, newHeader];
    updateResponseData("customHeaders", newHeaders);
  }, [responseData.customHeaders, updateResponseData]);

  const updateHeader = useCallback((index: number, field: keyof CustomHeader, value: any) => {
    const updatedHeaders = responseData.customHeaders.map((header, i) =>
      i === index ? { ...header, [field]: value } : header
    );
    updateResponseData("customHeaders", updatedHeaders);
  }, [responseData.customHeaders, updateResponseData]);

  const deleteHeader = useCallback((index: number) => {
    const updatedHeaders = responseData.customHeaders.filter((_, i) => i !== index);
    updateResponseData("customHeaders", updatedHeaders);
  }, [responseData.customHeaders, updateResponseData]);

  const applyTemplate = useCallback((templateName: string) => {
    const template = responseData.templates.find(t => t.name === templateName);
    if (template) {
      const newData = {
        ...responseData,
        statusCode: template.statusCode,
        responseBody: template.body,
        customHeaders: [...template.headers],
        selectedTemplate: templateName
      };
      setResponseData(newData);
      updateNodeData(newData);
    }
  }, [responseData, updateNodeData]);

  const saveAsTemplate = useCallback(() => {
    const templateName = prompt("Enter template name:");
    if (templateName) {
      const newTemplate: ResponseTemplate = {
        name: templateName,
        statusCode: responseData.statusCode,
        body: responseData.responseBody,
        headers: [...responseData.customHeaders]
      };
      const newTemplates = [...responseData.templates, newTemplate];
      updateResponseData("templates", newTemplates);
    }
  }, [responseData, updateResponseData]);

  const getStatusCodeCategory = (code: number): StatusCategory => {
    if (code >= 200 && code < 300) return 'success';
    if (code >= 400 && code < 500) return 'client_error';
    return 'server_error';
  };

  const getStatusCodeColor = (code: number): string => {
    const category = getStatusCodeCategory(code);
    switch (category) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'client_error': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'server_error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    if (contentType.includes('json')) return <Code className="w-3 h-3" />;
    if (contentType.includes('html')) return <Globe className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div
      className={`shadow-lg rounded-lg bg-white border-2 ${
        selected ? "border-green-500" : "border-gray-200"
      } hover:border-gray-300 transition-all duration-200 min-w-[350px] max-w-[500px]`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6, top: "50%" }}
      />

      {/* Header */}
      <div className="px-4 py-3 bg-green-600 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-white" />
            <span className="text-white font-medium text-sm">HTTP Response</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-green-200 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Status Code & Content Type Preview */}
        <div className="mt-2 flex items-center space-x-3">
          <div className={`px-2 py-1 rounded text-xs font-bold border ${getStatusCodeColor(responseData.statusCode)}`}>
            {responseData.statusCode}
          </div>
          <div className="flex items-center space-x-1 text-white/80 text-xs">
            {getContentTypeIcon(responseData.contentType)}
            <span>{responseData.contentType}</span>
          </div>
          {responseData.enableCORS && (
            <span className="px-2 py-1 bg-white/20 rounded text-xs text-white">CORS</span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Tabs */}
          <div className="flex space-x-1 mb-4 border-b border-gray-200">
            {[
              { id: 'body', label: 'Response Body', icon: Code },
              { id: 'headers', label: 'Headers', icon: Settings },
              { id: 'templates', label: 'Templates', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1 ${
                  activeTab === id
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-80 overflow-y-auto">
            {/* Response Body Tab */}
            {activeTab === 'body' && (
              <div className="space-y-3">
                {/* Status Code Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status Code
                    </label>
                    <select
                      value={responseData.statusCode}
                      onChange={(e) => updateResponseData("statusCode", parseInt(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      {Object.entries(HTTP_STATUS_CODES).map(([category, codes]) => (
                        <optgroup key={category} label={category.replace('_', ' ').toUpperCase()}>
                          {Object.entries(codes).map(([code, description]) => (
                            <option key={code} value={parseInt(code)}>
                              {code} - {description.split(' - ')[0]}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <select
                      value={responseData.contentType}
                      onChange={(e) => updateResponseData("contentType", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="application/json">application/json</option>
                      <option value="text/html">text/html</option>
                      <option value="text/plain">text/plain</option>
                      <option value="application/xml">application/xml</option>
                      <option value="text/csv">text/csv</option>
                    </select>
                  </div>
                </div>

                {/* Response Body */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Response Body
                  </label>
                  <textarea
                    value={responseData.responseBody}
                    onChange={(e) => updateResponseData("responseBody", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50"
                    rows={8}
                    placeholder="Enter response body content..."
                  />
                </div>
              </div>
            )}

            {/* Headers Tab */}
            {activeTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Custom Headers</h4>
                  <button
                    onClick={addCustomHeader}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Header</span>
                  </button>
                </div>

                {/* Default Headers Info */}
                <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <div className="font-medium mb-1">Auto-included headers:</div>
                  <div>• Content-Type: {responseData.contentType}</div>
                  {responseData.enableCORS && <div>• CORS headers (when enabled)</div>}
                  {responseData.enableCache && <div>• Cache-Control headers (when enabled)</div>}
                </div>

                {/* Custom Headers */}
                {responseData.customHeaders.length > 0 && (
                  <div className="space-y-2">
                    {responseData.customHeaders.map((header, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={header.enabled}
                            onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
                            className="rounded"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={header.key}
                            onChange={(e) => updateHeader(index, "key", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                            placeholder="Header name"
                          />
                        </div>
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={header.value}
                            onChange={(e) => updateHeader(index, "value", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                            placeholder="Header value"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            onClick={() => deleteHeader(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {responseData.customHeaders.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-xs">
                    No custom headers added yet
                  </div>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Response Templates</h4>
                  <button
                    onClick={saveAsTemplate}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Save Current</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {responseData.templates.map((template, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        responseData.selectedTemplate === template.name
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => applyTemplate(template.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{template.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusCodeColor(template.statusCode)}`}>
                            {template.statusCode}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.headers.length} headers
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 font-mono truncate">
                        {template.body.split('\n')[0]}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* CORS Settings */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={responseData.enableCORS}
                      onChange={(e) => updateResponseData("enableCORS", e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">Enable CORS</label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Automatically adds CORS headers for cross-origin requests
                  </p>
                </div>

                {/* Cache Settings */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={responseData.enableCache}
                      onChange={(e) => updateResponseData("enableCache", e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">Enable Caching</label>
                  </div>
                  
                  {responseData.enableCache && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cache Max Age (seconds)
                      </label>
                      <input
                        type="number"
                        value={responseData.cacheMaxAge}
                        onChange={(e) => updateResponseData("cacheMaxAge", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        min="0"
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Sets Cache-Control headers for browser caching
                  </p>
                </div>
              </div>
            )}
          </div>
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

export default ResponseNode;