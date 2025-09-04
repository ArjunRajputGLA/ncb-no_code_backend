"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Shield, Plus, Trash2, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ValidationRule {
  id: string;
  field: string;
  type: "required" | "type" | "length" | "range" | "pattern" | "custom";
  condition: string;
  value: string;
  errorMessage: string;
  enabled: boolean;
  severity: "error" | "warning";
}

interface ValidationNodeData {
  label: string;
  iconName: string;
  color: string;
  nodeType: string;
  rules: ValidationRule[];
  isExpanded: boolean;
  status: "idle" | "validating" | "passed" | "failed";
  validationMode: "strict" | "lenient";
  stopOnFirstError: boolean;
}

interface ValidationNodeProps {
  data: ValidationNodeData;
  selected?: boolean;
  id: string;
}

const validationTypes = [
  { value: "required", label: "Required Field" },
  { value: "type", label: "Data Type" },
  { value: "length", label: "Length Check" },
  { value: "range", label: "Range Check" },
  { value: "pattern", label: "Pattern Match" },
  { value: "custom", label: "Custom Rule" },
];

const typeConditions = {
  required: ["is_required"],
  type: ["is_string", "is_number", "is_boolean", "is_email", "is_url", "is_date"],
  length: ["min_length", "max_length", "exact_length"],
  range: ["min_value", "max_value", "between"],
  pattern: ["matches_regex", "contains", "starts_with", "ends_with"],
  custom: ["custom_function"],
};

const ValidationNode: React.FC<ValidationNodeProps> = ({ data, selected, id }) => {
  const { setNodes } = useReactFlow();

  const [nodeData, setNodeData] = useState<ValidationNodeData>({
    rules: data.rules || [],
    isExpanded: data.isExpanded !== undefined ? data.isExpanded : true,
    status: data.status || "idle",
    validationMode: data.validationMode || "strict",
    stopOnFirstError: data.stopOnFirstError !== undefined ? data.stopOnFirstError : true,
    // Keep original properties for compatibility
    label: data.label || "Data Validation",
    iconName: data.iconName || "Shield",
    color: data.color || "bg-red-600",
    nodeType: data.nodeType || "validation"
  });

  // Function to update the node data in the ReactFlow state
  const updateNodeData = useCallback((newData: ValidationNodeData) => {
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

  // Update node data and sync with ReactFlow
  const updateValidationData = useCallback((field: keyof ValidationNodeData, value: any) => {
    const newData = { ...nodeData, [field]: value };
    setNodeData(newData);
    updateNodeData(newData);
  }, [nodeData, updateNodeData]);

  // Sync initial data when component mounts or data changes
  useEffect(() => {
    const hasChanges = Object.keys(nodeData).some(key => {
      const k = key as keyof ValidationNodeData;
      return JSON.stringify(nodeData[k]) !== JSON.stringify(data[k]);
    });

    if (hasChanges) {
      updateNodeData(nodeData);
    }
  }, [nodeData, data, updateNodeData]);

  const addRule = useCallback(() => {
    const newRule: ValidationRule = {
      id: Date.now().toString(),
      field: "",
      type: "required",
      condition: "is_required",
      value: "",
      errorMessage: "Validation failed",
      enabled: true,
      severity: "error",
    };

    const newRules = [...nodeData.rules, newRule];
    updateValidationData("rules", newRules);
  }, [nodeData.rules, updateValidationData]);

  const updateRule = useCallback((ruleId: string, updates: Partial<ValidationRule>) => {
    const updatedRules = nodeData.rules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    updateValidationData("rules", updatedRules);
  }, [nodeData.rules, updateValidationData]);

  const removeRule = useCallback((ruleId: string) => {
    const updatedRules = nodeData.rules.filter(rule => rule.id !== ruleId);
    updateValidationData("rules", updatedRules);
  }, [nodeData.rules, updateValidationData]);

  const toggleRule = useCallback((ruleId: string) => {
    const updatedRules = nodeData.rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    updateValidationData("rules", updatedRules);
  }, [nodeData.rules, updateValidationData]);

  const toggleExpanded = useCallback(() => {
    updateValidationData("isExpanded", !nodeData.isExpanded);
  }, [nodeData.isExpanded, updateValidationData]);

  const updateValidationMode = useCallback((mode: "strict" | "lenient") => {
    updateValidationData("validationMode", mode);
  }, [updateValidationData]);

  const toggleStopOnFirstError = useCallback(() => {
    updateValidationData("stopOnFirstError", !nodeData.stopOnFirstError);
  }, [nodeData.stopOnFirstError, updateValidationData]);

  const getStatusColor = () => {
    switch (nodeData.status) {
      case "validating": return "border-yellow-400 bg-yellow-50";
      case "passed": return "border-green-400 bg-green-50";
      case "failed": return "border-red-400 bg-red-50";
      default: return "border-gray-200 bg-white";
    }
  };

  const getStatusIcon = () => {
    switch (nodeData.status) {
      case "validating": return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case "passed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div
      className={`shadow-lg rounded-lg border-2 min-w-[340px] max-w-[450px] ${
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
            {nodeData.status === "idle" ? (
              <Shield className="w-4 h-4 text-white" />
            ) : (
              getStatusIcon()
            )}
            <span className="text-white text-sm font-medium">{data.label}</span>
            <div className="flex items-center space-x-1">
              <div className="text-xs text-white/70 bg-white/20 px-2 py-1 rounded">
                {nodeData.rules.filter(r => r.enabled).length} rules
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                nodeData.validationMode === "strict" 
                  ? "bg-red-500/20 text-white" 
                  : "bg-yellow-500/20 text-white"
              }`}>
                {nodeData.validationMode}
              </div>
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
        <div className="p-4 space-y-4">
          {/* Validation Settings */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-md">
            <h4 className="text-xs font-medium text-gray-700">Validation Settings</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-600">Mode:</label>
                <select
                  value={nodeData.validationMode}
                  onChange={(e) => updateValidationMode(e.target.value as "strict" | "lenient")}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  <option value="strict">Strict (All must pass)</option>
                  <option value="lenient">Lenient (Warnings allowed)</option>
                </select>
              </div>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={nodeData.stopOnFirstError}
                  onChange={toggleStopOnFirstError}
                  className="w-3 h-3"
                />
                <span className="text-gray-600">Stop on first error</span>
              </label>
            </div>
          </div>

          {/* Add Rule Button */}
          <button
            onClick={addRule}
            className="w-full flex items-center justify-center space-x-2 p-2 border border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Validation Rule</span>
          </button>

          {/* Rules List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {nodeData.rules.map((rule, index) => (
              <div
                key={rule.id}
                className={`p-3 border rounded-md space-y-3 ${
                  rule.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-25 opacity-60"
                }`}
              >
                {/* Rule Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                    <select
                      value={rule.type}
                      onChange={(e) => updateRule(rule.id, { 
                        type: e.target.value as ValidationRule["type"],
                        condition: typeConditions[e.target.value as keyof typeof typeConditions][0]
                      })}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      {validationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.severity}
                      onChange={(e) => updateRule(rule.id, { severity: e.target.value as "error" | "warning" })}
                      className={`text-xs border rounded px-2 py-1 ${
                        rule.severity === "error" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <option value="error">Error</option>
                      <option value="warning">Warning</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-1 rounded transition-colors ${
                        rule.enabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {rule.enabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Rule Configuration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={rule.field}
                      onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                      placeholder="Field to validate"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      {typeConditions[rule.type].map(condition => (
                        <option key={condition} value={condition}>
                          {condition.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Value field (when needed) */}
                {!["is_required", "custom_function"].includes(rule.condition) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {rule.condition.includes("regex") ? "Pattern" : 
                       rule.condition.includes("length") ? "Length" :
                       rule.condition.includes("value") ? "Value" : "Value"}
                    </label>
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      placeholder={
                        rule.condition.includes("regex") ? "^[a-zA-Z0-9]+$" :
                        rule.condition.includes("length") ? "10" :
                        rule.condition.includes("email") ? "" : "Value"
                      }
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                  </div>
                )}

                {/* Error Message */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Error Message
                  </label>
                  <input
                    type="text"
                    value={rule.errorMessage}
                    onChange={(e) => updateRule(rule.id, { errorMessage: e.target.value })}
                    placeholder="Custom error message"
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Status Indicator */}
          {nodeData.status !== "idle" && (
            <div className="flex items-center space-x-2 mt-3 p-2 bg-gray-100 rounded">
              {getStatusIcon()}
              <span className="text-xs text-gray-600 capitalize">{nodeData.status}</span>
              {nodeData.status === "failed" && (
                <span className="text-xs text-red-600 ml-2">
                  {nodeData.rules.filter(r => r.enabled && r.severity === "error").length} error(s)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Multiple output handles for different paths */}
      <Handle
        type="source"
        position={Position.Right}
        id="valid"
        className="w-3 h-3 !bg-green-500 hover:!bg-green-600 transition-colors"
        style={{ right: -6, top: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="invalid"
        className="w-3 h-3 !bg-red-500 hover:!bg-red-600 transition-colors"
        style={{ right: -6, top: "70%" }}
      />
    </div>
  );
};

export default ValidationNode;