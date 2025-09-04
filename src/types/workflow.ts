export interface SerializedParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SerializedApiNode {
  id: string;
  type: "api";
  position: { x: number; y: number };
  data: {
    method: string;
    path: string;
    description: string;
    parameters: SerializedParameter[];
    requestBodySample: string;
    authRequired: boolean;
    baseUrl: string;
    tags: string[];
  };
}

export interface SerializedHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface SerializedTemplate {
  name: string;
  statusCode: number;
  body: string;
  headers: SerializedHeader[];
}

export interface SerializedResponseNode {
  id: string;
  type: "response";
  position: { x: number; y: number };
  data: {
    statusCode: number;
    responseBody: string;
    contentType: string;
    customHeaders: SerializedHeader[];
    templates: SerializedTemplate[];
    selectedTemplate?: string;
    enableCORS: boolean;
    enableCache: boolean;
    cacheMaxAge: number;
  };
}

export interface SerializedConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface SerializedWorkflow {
  version: "1.0";
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    lastModified: string;
  };
  nodes: (SerializedApiNode | SerializedResponseNode)[];
  connections: SerializedConnection[];
}

export interface TransformationRule {
  id: string;
  type: "map" | "filter" | "sort" | "aggregate" | "format";
  field: string;
  operation: string;
  value: string;
  newField?: string;
  enabled: boolean;
}

export interface SerializedTransformationNode {
  id: string;
  type: "transformation";
  position: { x: number; y: number };
  data: {
    label: string;
    iconName: string;
    color: string;
    nodeType: string;
    transformations: TransformationRule[];
    isExpanded: boolean;
    status: "idle" | "processing" | "success" | "error";
  };
}

export interface ValidationRule {
  id: string;
  field: string;
  type: "required" | "type" | "length" | "range" | "pattern" | "custom";
  condition: string;
  value: string;
  errorMessage: string;
  enabled: boolean;
  severity: "error" | "warning";
}

export interface SerializedValidationNode {
  id: string;
  type: "validation";
  position: { x: number; y: number };
  data: {
    label: string;
    iconName: string;
    color: string;
    nodeType: string;
    rules: ValidationRule[];
    isExpanded: boolean;
    status: "idle" | "validating" | "passed" | "failed";
    validationMode: "strict" | "lenient";
    stopOnFirstError: boolean;
  };
}

export interface SerializedDatabaseNode {
  id: string;
  type: "database";
  position: { x: number; y: number };
  data: {
    label: string;
    iconName: string;
    color: string;
    nodeType: string;
    projectUrl?: string;
    apiKey?: string;
    selectedTable?: string;
  };
}