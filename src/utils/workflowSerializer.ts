import {
  SerializedApiNode,
  SerializedConnection,
  SerializedResponseNode,
  SerializedWorkflow,
  SerializedTransformationNode,
  SerializedValidationNode,
  SerializedDatabaseNode,
} from "@/types/workflow";

export class WorkflowSerializer {
  static serialize(
    nodes: any[],
    edges: any[],
    metadata?: Partial<SerializedWorkflow['metadata']>
  ): SerializedWorkflow {
    return {
      version: "1.0",
      metadata: {
        name: metadata?.name || "Untitled Workflow",
        description: metadata?.description,
        createdAt: metadata?.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      nodes: nodes.map(node => this.serializeNode(node)).filter(Boolean),
      connections: edges.map(edge => this.serializeConnection(edge)),
    };
  }

  static deserialize(workflow: SerializedWorkflow): { nodes: any[]; edges: any[] } {
    return {
      nodes: workflow.nodes.map(node => this.deserializeNode(node)),
      edges: workflow.connections.map(conn => this.deserializeConnection(conn)),
    };
  }

  private static serializeNode(
    node: any
  ):
    | SerializedApiNode
    | SerializedResponseNode
    | SerializedTransformationNode
    | SerializedValidationNode
    | SerializedDatabaseNode
    | null {
    const baseNode = {
      id: node.id,
      position: node.position,
    };

    switch (node.type) {
      case "apiNode":
        return {
          ...baseNode,
          type: "api",
          data: {
            method: node.data.method || "GET",
            path: node.data.path || "/endpoint",
            description: node.data.description || "",
            parameters: node.data.parameters || [],
            requestBodySample: node.data.requestBodySample || "",
            authRequired: node.data.authRequired || false,
            baseUrl: node.data.baseUrl || "/api/v1",
            tags: node.data.tags || [],
          },
        } as SerializedApiNode;

      case "responseNode":
        return {
          ...baseNode,
          type: "response",
          data: {
            statusCode: node.data.statusCode || 200,
            responseBody: node.data.responseBody || "",
            contentType: node.data.contentType || "application/json",
            customHeaders: node.data.customHeaders || [],
            templates: node.data.templates || [],
            selectedTemplate: node.data.selectedTemplate,
            enableCORS: node.data.enableCORS ?? true,
            enableCache: node.data.enableCache ?? false,
            cacheMaxAge: node.data.cacheMaxAge || 3600,
          },
        } as SerializedResponseNode;

      case "transformation":
      case "transformationNode":
        return {
          ...baseNode,
          type: "transformation",
          data: {
            label: node.data.label || "Transformation",
            iconName: node.data.iconName || "",
            color: node.data.color || "",
            nodeType: node.data.nodeType || "transformation",
            transformations: node.data.transformations || [],
            isExpanded: node.data.isExpanded ?? true,
            status: node.data.status || "idle",
          },
        } as SerializedTransformationNode;

      case "validation":
      case "validationNode":
        return {
          ...baseNode,
          type: "validation",
          data: {
            label: node.data.label || "Validation",
            iconName: node.data.iconName || "",
            color: node.data.color || "",
            nodeType: node.data.nodeType || "validation",
            rules: node.data.rules || [],
            isExpanded: node.data.isExpanded ?? true,
            status: node.data.status || "idle",
            validationMode: node.data.validationMode || "strict",
            stopOnFirstError: node.data.stopOnFirstError ?? true,
          },
        } as SerializedValidationNode;

      case "database":
      case "databaseNode":
        return {
          ...baseNode,
          type: "database",
          data: {
            label: node.data.label || "Database",
            iconName: node.data.iconName || "",
            color: node.data.color || "",
            nodeType: node.data.nodeType || "database",
            projectUrl: node.data.projectUrl,
            apiKey: node.data.apiKey,
            selectedTable: node.data.selectedTable,
          },
        } as SerializedDatabaseNode;

      default:
        return null;
    }
  }

  private static deserializeNode(
    serializedNode:
      | SerializedApiNode
      | SerializedResponseNode
      | SerializedTransformationNode
      | SerializedValidationNode
      | SerializedDatabaseNode
  ): any {
    const baseNode = {
      id: serializedNode.id,
      position: serializedNode.position,
      data: serializedNode.data,
    };

    switch (serializedNode.type) {
      case "api":
        return { ...baseNode, type: "apiNode" };
      case "response":
        return { ...baseNode, type: "responseNode" };
      case "transformation":
        return { ...baseNode, type: "transformationNode" };
      case "validation":
        return { ...baseNode, type: "validationNode" };
      case "database":
        return { ...baseNode, type: "databaseNode" };
      default:
        return baseNode;
    }
  }

  private static serializeConnection(edge: any): SerializedConnection {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    };
  }

  private static deserializeConnection(conn: SerializedConnection): any {
    return {
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      animated: true,
      style: { stroke: "#6b7280", strokeWidth: 2 },
      type: "smoothstep"
    };
  }

  // Utility methods for file operations
  static exportToFile(workflow: SerializedWorkflow, filename?: string): void {
    const jsonString = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `workflow-${workflow.metadata.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static importFromFile(): Promise<SerializedWorkflow> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workflow = JSON.parse(e.target?.result as string) as SerializedWorkflow;
            if (!this.validateWorkflow(workflow)) {
              reject(new Error('Invalid workflow format'));
              return;
            }
            resolve(workflow);
          } catch (error) {
            reject(new Error('Failed to parse JSON file'));
          }
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  private static validateWorkflow(data: any): data is SerializedWorkflow {
    return (
      data &&
      data.version &&
      data.metadata &&
      Array.isArray(data.nodes) &&
      Array.isArray(data.connections)
    );
  }
}