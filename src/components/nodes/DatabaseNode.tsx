import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import {
  Database,
  ChevronDown,
  ChevronRight,
  Table,
  Eye,
  EyeOff,
  Key,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
  X,
  Columns,
} from "lucide-react";

// Supabase client types
interface SupabaseConfig {
  projectUrl: string;
  apiKey: string;
}

interface TableInfo {
  name: string;
  schema?: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  format?: string;
  description?: string;
  is_nullable?: boolean;
  column_default?: string;
}

interface TableData {
  [key: string]: any;
}

// Supabase client implementation
class SupabaseClient {
  private projectUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor(projectUrl: string, apiKey: string) {
    this.projectUrl = projectUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.projectUrl}/rest/v1/`, {
        headers: this.headers
      });
      return response.ok;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  async getTables(): Promise<TableInfo[]> {
    try {
      const response = await fetch(`${this.projectUrl}/rest/v1/`, {
        headers: this.headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const tables: TableInfo[] = [];
        
        if (data.definitions) {
          for (const tableName of Object.keys(data.definitions)) {
            if (!tableName.startsWith('_')) {
              tables.push({ name: tableName });
            }
          }
        }
        return tables;
      }
      return [];
    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  }

  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    try {
      // First, try to get minimal response to check if table exists
      const testResponse = await fetch(
        `${this.projectUrl}/rest/v1/${tableName}`,
        {
          headers: { ...this.headers, 'Prefer': 'return=minimal' },
          method: 'GET',
        }
      );

      if (!testResponse.ok) {
        throw new Error(`Table ${tableName} not found or not accessible`);
      }

      // Get schema from OpenAPI definition
      const schemaResponse = await fetch(`${this.projectUrl}/rest/v1/`, {
        headers: this.headers
      });
      
      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json();
        if (schemaData.definitions && schemaData.definitions[tableName]) {
          const properties = schemaData.definitions[tableName].properties || {};
          const columns: ColumnInfo[] = [];
          
          for (const [colName, colInfo] of Object.entries(properties)) {
            const info = colInfo as any;
            columns.push({
              column_name: colName,
              data_type: info.type || 'unknown',
              format: info.format || '',
              description: info.description || '',
            });
          }
          return columns;
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching table schema:', error);
      return [];
    }
  }

  async getTableData(tableName: string, limit: number = 10): Promise<TableData[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      const response = await fetch(
        `${this.projectUrl}/rest/v1/${tableName}?${params}`,
        { headers: this.headers }
      );
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      return [];
    }
  }
}

interface DatabaseNodeData {
  label: string;
  iconName: string;
  color: string;
  nodeType: string;
  projectUrl: string;
  apiKey: string;
  selectedTable: string;
}

interface DatabaseNodeProps {
  data: DatabaseNodeData;
  selected?: boolean;
  id: string;
}

const DatabaseNode: React.FC<DatabaseNodeProps> = ({ data, selected, id }) => {
  const { setNodes } = useReactFlow();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [tables, setTables] = useState<TableInfo[]>([]);
  
  // Database configuration state - using state and syncing with ReactFlow
  const [databaseData, setDatabaseData] = useState<DatabaseNodeData>({
    label: data.label || "Supabase Database",
    iconName: data.iconName || "Database",
    color: data.color || "bg-green-600",
    nodeType: data.nodeType || "database",
    projectUrl: data.projectUrl || "",
    apiKey: data.apiKey || "",
    selectedTable: data.selectedTable || ""
  });

  const [tableSchema, setTableSchema] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [showData, setShowData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTableSelectionMode, setIsTableSelectionMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [client, setClient] = useState<SupabaseClient | null>(null);

  // Function to update the node data in the ReactFlow state
  const updateNodeData = useCallback((newData: Partial<DatabaseNodeData>) => {
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

  // Update database data and sync with ReactFlow
  const updateDatabaseData = useCallback((field: keyof DatabaseNodeData, value: any) => {
    const newData = { ...databaseData, [field]: value };
    setDatabaseData(newData);
    updateNodeData({ [field]: value });
  }, [databaseData, updateNodeData]);

  // Sync initial data when component mounts or data changes
  useEffect(() => {
    const hasChanges = Object.keys(databaseData).some(key => {
      const k = key as keyof DatabaseNodeData;
      return databaseData[k] !== data[k];
    });

    if (hasChanges) {
      updateNodeData(databaseData);
    }
  }, [databaseData, data, updateNodeData]);

  // Initialize client when config changes
  useEffect(() => {
    if (databaseData.projectUrl && databaseData.apiKey) {
      const newClient = new SupabaseClient(databaseData.projectUrl, databaseData.apiKey);
      setClient(newClient);
    } else {
      setClient(null);
      setConnectionStatus('idle');
    }
  }, [databaseData.projectUrl, databaseData.apiKey]);

  // Load schema when selectedTable changes
  useEffect(() => {
    if (databaseData.selectedTable && client && connectionStatus === 'connected') {
      loadTableSchema(databaseData.selectedTable);
    }
  }, [databaseData.selectedTable, client, connectionStatus]);

  const testConnection = async () => {
    if (!client) {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    setLoading(true);
    
    try {
      const isConnected = await client.testConnection();
      if (isConnected) {
        setConnectionStatus('connected');
        await loadTables();
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Connection test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const tableList = await client.getTables();
      setTables(tableList);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableSchema = async (tableName: string) => {
    if (!client) return;
    
    setLoading(true);
    try {
      const schema = await client.getTableSchema(tableName);
      setTableSchema(schema);
    } catch (error) {
      console.error('Error loading table schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    if (!client) return;
    
    setLoading(true);
    try {
      const data = await client.getTableData(tableName, 5);
      setTableData(data);
      setShowData(true);
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTable = useCallback((tableName: string) => {
    updateDatabaseData("selectedTable", tableName);
    setIsTableSelectionMode(false);
    setShowData(false);
  }, [updateDatabaseData]);

  const clearTableSelection = useCallback(() => {
    updateDatabaseData("selectedTable", "");
    setTableSchema([]);
    setShowData(false);
    setTableData([]);
  }, [updateDatabaseData]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Database className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div
      className={`shadow-lg rounded-lg bg-white border-2 transition-all duration-200 ${
        selected ? "border-blue-500" : "border-gray-200"
      } hover:border-gray-300 ${isExpanded ? "min-w-[500px]" : "min-w-[200px]"}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        style={{ left: -6 }}
      />

      {/* Header */}
      <div className={`px-4 py-3 ${databaseData.color} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-white" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{databaseData.label}</span>
              {databaseData.selectedTable && (
                <span className="text-xs text-white/80 font-mono">{databaseData.selectedTable}</span>
              )}
            </div>
            {getStatusIcon()}
          </div>
          <div className="flex items-center space-x-1">
            {databaseData.selectedTable && (
              <button
                onClick={clearTableSelection}
                className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                title="Clear table selection"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1 hover:bg-white/20 rounded text-white transition-colors"
              title="Configure connection"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-white/20 rounded text-white transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Project URL
              </label>
              <input
                type="text"
                value={databaseData.projectUrl}
                onChange={(e) => updateDatabaseData("projectUrl", e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={databaseData.apiKey}
                  onChange={(e) => updateDatabaseData("apiKey", e.target.value)}
                  placeholder="Your anon/public API key"
                  className="w-full px-2 py-1 pr-8 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <button
              onClick={testConnection}
              disabled={!databaseData.projectUrl || !databaseData.apiKey || loading}
              className="w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>Test Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && connectionStatus === 'connected' && (
        <div className="p-4">
          <div className="flex space-x-4">
            {/* Left Column - Tables or Table Selection */}
            <div className="flex-1">
              {!databaseData.selectedTable ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-800 flex items-center">
                      <Table className="w-3 h-3 mr-1" />
                      Tables ({tables.length})
                    </h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {tables.map((table, index) => (
                      <div
                        key={index}
                        className="p-2 text-xs rounded cursor-pointer transition-colors hover:bg-blue-50 border border-gray-200 hover:border-blue-300 group"
                        onClick={() => selectTable(table.name)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{table.name}</span>
                          <Check className="w-3 h-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center">
                        <Table className="w-3 h-3 mr-1" />
                        Selected Table
                      </h4>
                      <button
                        onClick={() => setIsTableSelectionMode(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                      >
                        Change
                      </button>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="font-medium text-gray-800 text-sm">{databaseData.selectedTable}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {tableSchema.length} columns
                      </div>
                    </div>
                  </div>

                  {/* Table Actions */}
                  <div className="mb-4">
                    <button
                      onClick={() => loadTableData(databaseData.selectedTable)}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span>View Data</span>
                    </button>
                  </div>
                </>
              )}

              {/* Table Selection Mode */}
              {isTableSelectionMode && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-800">Select Table</h3>
                      <button
                        onClick={() => setIsTableSelectionMode(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {tables.map((table, index) => (
                        <div
                          key={index}
                          className={`p-2 text-xs rounded cursor-pointer transition-colors border ${
                            databaseData.selectedTable === table.name
                              ? "bg-blue-100 border-blue-300"
                              : "hover:bg-gray-100 border-gray-200"
                          }`}
                          onClick={() => selectTable(table.name)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{table.name}</span>
                            {databaseData.selectedTable === table.name && (
                              <Check className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Table Schema/Attributes */}
            {databaseData.selectedTable && tableSchema.length > 0 && (
              <div className="flex-1 border-l border-gray-200 pl-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                  <Columns className="w-3 h-3 mr-1" />
                  Attributes ({tableSchema.length})
                </h4>
                <div className="max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {tableSchema.map((column, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-medium text-gray-800">
                            {column.column_name}
                          </span>
                          <span className="text-xs text-gray-600 bg-white px-1 py-0.5 rounded">
                            {column.data_type}
                          </span>
                        </div>
                        {column.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {column.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table Data Preview */}
          {showData && tableData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-800">
                  Data Preview (5 rows)
                </h4>
                <button
                  onClick={() => setShowData(false)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Hide
                </button>
              </div>
              <div className="max-h-32 overflow-auto border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {Object.keys(tableData[0] || {}).map((key) => (
                        <th key={key} className="px-2 py-1 text-left font-medium text-gray-800 border-b">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="px-2 py-1 text-gray-700">
                            {value !== null ? String(value) : 'null'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Status Message */}
      {isExpanded && connectionStatus !== 'connected' && (
        <div className="p-4 text-center">
          {connectionStatus === 'idle' && (
            <p className="text-xs text-gray-600">Configure connection to get started</p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-xs text-red-500">Connection failed. Check your credentials.</p>
          )}
          {connectionStatus === 'connecting' && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <p className="text-xs text-blue-500">Connecting...</p>
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400 hover:!bg-green-500 transition-colors"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default DatabaseNode;