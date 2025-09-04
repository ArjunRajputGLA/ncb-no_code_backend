"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  X,
  MessageSquare,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatbotProps {
  onWorkflowGenerated: (workflowData: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Type definitions for the workflow structure
interface WorkflowMetadata {
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
}

interface NodePosition {
  x: number;
  y: number;
}

interface WorkflowNode {
  id: string;
  position: NodePosition;
  type:
    | "apiNode"
    | "responseNode"
    | "transformationNode"
    | "validationNode"
    | "databaseNode";
  data: any;
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowData {
  version: string;
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

const Chatbot: React.FC<ChatbotProps> = ({
  onWorkflowGenerated,
  isOpen,
  onToggle,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        'Hi! I can help you generate workflows using AI. Just describe what you want to build and I\'ll create a workflow template for you. For example: "Create an API that handles user registration with email validation"',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const showAlert = (
    message: string,
    type: "error" | "warning" | "info" = "error"
  ) => {
    // Create a custom alert/notification
    const alertElement = document.createElement("div");
    alertElement.className = `fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-80 max-w-md ${
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-800"
        : type === "warning"
        ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
        : "bg-blue-50 border border-blue-200 text-blue-800"
    }`;

    alertElement.innerHTML = `
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 ${
          type === "error"
            ? "text-red-400"
            : type === "warning"
            ? "text-yellow-400"
            : "text-blue-400"
        }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <button class="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-gray-200" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    document.body.appendChild(alertElement);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.remove();
      }
    }, 5000);
  };

  const callGeminiAPI = async (prompt: string): Promise<WorkflowData> => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!API_KEY) {
      throw new Error(
        "Gemini API key not found. Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment variables."
      );
    }

    const systemPrompt = `You are an AI workflow generator for an n8n-like system.  
Always return a JSON object strictly matching the schema below.  
Do not include explanations, comments, or text outside the JSON.  

Schema:
{
  "version": "1.0",
  "metadata": {
    "name": string,                   
    "description": string,            
    "createdAt": ISODate string,      
    "lastModified": ISODate string    
  },
  "nodes": [
    {
      "id": string,                   
      "position": { "x": number, "y": number },
      "type": "apiNode" | "responseNode" | "transformationNode"| "databaseNode",
      "data": object                  
    }
  ],
  "connections": [ { ... } ]
}

🟢 Important Rules for Node Data:
- "apiNode" nodes MUST include:
  - realistic 'method', 'path', 'description', 'parameters' (with type/required/description), 'requestBodySample' (filled with JSON), 'authRequired', 'baseUrl', 'tags'
- "databaseNode" nodes MUST include:
  - 'projectUrl', 'apiKey', and a non-empty 'selectedTable'
- "transformationNode" nodes MUST include:
  - at least 1 transformation operation ('createField', 'mapField', or 'selectFields')
- "responseNode" nodes MUST include:
  - 'statusCode', 'responseBody' (with dynamic interpolation like {{body.field}}), 'contentType', 'enableCORS', 'enableCache', and 'templates'

🟢 Flow Guidelines:
- Always add edges to connect nodes sequentially
- Use descriptive workflow names and metadata
- Populate sample values realistically (not empty)

Output: Only valid JSON.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nUser Request: ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    try {
      console.log("Sending request to Gemini API...");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error Response:", errorText);

        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your Gemini API key.");
        } else if (response.status === 403) {
          throw new Error(
            "API access forbidden. Please check your API key permissions."
          );
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(
            `API request failed with status ${response.status}: ${errorText}`
          );
        }
      }

      const data = await response.json();
      console.log("Gemini API Response:", data);

      // Check for API-level errors
      if (data.error) {
        throw new Error(
          `Gemini API Error: ${data.error.message || "Unknown error"}`
        );
      }

      // Check for blocked content
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error(
          "Content was blocked by safety filters. Please try a different request."
        );
      }

      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content ||
        !data.candidates[0].content.parts ||
        !data.candidates[0].content.parts[0] ||
        !data.candidates[0].content.parts[0].text
      ) {
        console.error("Invalid API response structure:", data);
        throw new Error("Invalid response structure from Gemini API");
      }

      const generatedText = data.candidates[0].content.parts[0].text.trim();
      console.log("Generated text:", generatedText);

      // Try to extract JSON from the response
      let jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in response:", generatedText);
        throw new Error(
          "No valid JSON found in AI response. Please try again."
        );
      }

      let workflowData: WorkflowData;
      try {
        workflowData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error(
          "JSON parse error:",
          parseError,
          "Raw text:",
          jsonMatch[0]
        );
        throw new Error(
          "Invalid JSON format in AI response. Please try again."
        );
      }

      // Validate the workflow data structure
      if (
        !workflowData.version ||
        !workflowData.metadata ||
        !workflowData.nodes
      ) {
        throw new Error("Incomplete workflow data received. Please try again.");
      }

      return enhanceWorkflowData(workflowData);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  // Function to map AI generated types to React Flow types
  const mapNodeType = (aiType: string): string => {
    // If it's already a valid node type, return it as is
    const validTypes = [
      "apiNode",
      "responseNode",
      "transformationNode",
      "validationNode",
      "databaseNode",
    ];
    if (validTypes.includes(aiType)) {
      return aiType;
    }

    // Map alternative names to correct types
    const typeMap: { [key: string]: string } = {
      api: "apiNode",
      response: "responseNode",
      transformation: "transformationNode",
      validation: "validationNode",
      database: "databaseNode",
    };
    return typeMap[aiType] || aiType; // Return original if no mapping found
  };

  const enhanceWorkflowData = (workflow: WorkflowData): WorkflowData => {
    const now = new Date().toISOString();

    // Ensure metadata is complete
    if (!workflow.metadata) {
      workflow.metadata = {
        name: "Generated Workflow",
        description: "AI-generated workflow",
        createdAt: now,
        lastModified: now,
      };
    }

    if (!workflow.metadata.createdAt) workflow.metadata.createdAt = now;
    if (!workflow.metadata.lastModified) workflow.metadata.lastModified = now;

    // Ensure nodes have required properties and correct types
    workflow.nodes = workflow.nodes.map((node, index) => {
      // Map AI types to React Flow types
      node.type = mapNodeType(node.type) as any;

      // Ensure position is set
      if (!node.position) {
        node.position = { x: index * 200 + 100, y: 100 };
      }

      // Preserve original data and only add missing required properties based on node type
      const originalData = { ...node.data };

      switch (node.type) {
        case "apiNode":
          node.data = {
            label: originalData.label || "API Endpoint",
            iconName: "Globe",
            color: "bg-purple-600",
            nodeType: "api",
            method: originalData.method || "GET",
            path: originalData.path || "/endpoint",
            description: originalData.description || "API endpoint description",
            parameters: originalData.parameters || [],
            requestBodySample: originalData.requestBodySample || "{}",
            authRequired: originalData.authRequired || false,
            baseUrl: originalData.baseUrl || "/api/v1",
            tags: originalData.tags || [],
            ...originalData, // Preserve all original data
          };
          break;

        case "responseNode":
          node.data = {
            label: originalData.label || "HTTP Response",
            iconName: "Send",
            color: "bg-green-600",
            nodeType: "response",
            statusCode: originalData.statusCode || 200,
            responseBody:
              originalData.responseBody || '{"success": true, "data": {}}',
            contentType: originalData.contentType || "application/json",
            customHeaders: originalData.customHeaders || [],
            templates: originalData.templates || [],
            enableCORS: originalData.enableCORS !== false,
            enableCache: originalData.enableCache || false,
            cacheMaxAge: originalData.cacheMaxAge || 3600,
            ...originalData, // Preserve all original data
          };
          break;

        case "transformationNode":
          node.data = {
            label: originalData.label || "Data Transformation",
            iconName: "Code",
            color: "bg-blue-600",
            nodeType: "transformation",
            transformations: originalData.transformations || [],
            isExpanded: true,
            status: "idle",
            ...originalData, // Preserve all original data
          };
          break;

        case "validationNode":
          node.data = {
            label: originalData.label || "Data Validation",
            iconName: "Shield",
            color: "bg-red-600",
            nodeType: "validation",
            rules: originalData.rules || [],
            isExpanded: true,
            status: "idle",
            validationMode: originalData.validationMode || "strict",
            stopOnFirstError: originalData.stopOnFirstError !== false,
            ...originalData, // Preserve all original data
          };
          break;

        case "databaseNode":
          node.data = {
            label: originalData.label || "Database",
            iconName: "Database",
            color: "bg-green-600",
            nodeType: "database",
            projectUrl: originalData.projectUrl || "",
            apiKey: originalData.apiKey || "",
            selectedTable: originalData.selectedTable || "users",
            ...originalData, // Preserve all original data
          };
          break;

        default:
          // For unknown node types, preserve original data and add minimal required fields
          node.data = {
            label: originalData.label || "Unknown Node",
            iconName: "HelpCircle",
            color: "bg-gray-600",
            nodeType: "unknown",
            ...originalData,
          };
      }

      return node;
    });

    // Ensure connections have IDs and proper structure
    if (!workflow.connections) {
      workflow.connections = [];
    }

    workflow.connections = workflow.connections.map((connection, index) => ({
      id: connection.id || `connection_${index}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || null,
      targetHandle: connection.targetHandle || null,
      animated: true,
      style: { stroke: "#6b7280", strokeWidth: 2 },
      type: "smoothstep",
      ...connection,
    }));

    return workflow;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content: "Generating your workflow with AI...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue("");
    setIsGenerating(true);

    try {
      const workflowData = await callGeminiAPI(userMessage.content);

      // Remove loading message and add success message
      setMessages((prev) => {
        const withoutLoading = prev.filter((msg) => !msg.isLoading);
        return [
          ...withoutLoading,
          {
            id: (Date.now() + 2).toString(),
            type: "bot",
            content: `Great! I've generated a workflow called "${workflowData.metadata.name}" with ${workflowData.nodes.length} nodes. Click "Apply to Canvas" to add it to your workflow builder!`,
            timestamp: new Date(),
          },
        ];
      });

      // Pass the workflow data to parent component
      onWorkflowGenerated(workflowData);

      // Show success alert
      showAlert(
        `Workflow "${workflowData.metadata.name}" generated successfully!`,
        "info"
      );
    } catch (error: any) {
      console.error("Error generating workflow:", error);

      // Remove loading message and add error message
      setMessages((prev) => {
        const withoutLoading = prev.filter((msg) => !msg.isLoading);
        return [
          ...withoutLoading,
          {
            id: (Date.now() + 2).toString(),
            type: "bot",
            content: `Sorry, I encountered an error: ${
              error.message || "Unknown error occurred"
            }. Please check your API key and try again.`,
            timestamp: new Date(),
          },
        ];
      });

      // Show error alert
      showAlert(
        `Failed to generate workflow: ${
          error.message || "Unknown error occurred"
        }`,
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const examplePrompts = [
    "Create a user authentication API with validation",
    "Build a data processing workflow with transformation",
    "Generate an e-commerce order processing system",
    "Create a notification system with email alerts",
  ];

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold">AI Workflow Assistant</h3>
            <p className="text-xs opacity-90">Powered by Gemini AI</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-white/80 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === "bot" && (
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {message.isLoading ? (
                      <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                    ) : (
                      <Bot className="w-3 h-3 text-blue-600" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1 opacity-70`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Example prompts (show when no user messages) */}
        {messages.filter((m) => m.type === "user").length === 0 &&
          !isGenerating && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                Try these examples:
              </p>
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your workflow..."
            disabled={isGenerating}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send • Describe what you want to build
        </p>
      </div>
    </div>
  );
};

export default Chatbot;
