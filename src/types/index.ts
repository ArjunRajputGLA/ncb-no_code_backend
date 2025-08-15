import React from 'react';
import { Node, Edge } from 'reactflow';

// Types for our project configuration
export interface ProjectConfig {
  name: string;
  framework: string;
  database: string;
  language: string;
}

export interface GeneratedProject {
  bashScript: string;
  projectStructure: string;
  dependencies: string[];
}

export interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  description: string;
  category: 'API' | 'Database' | 'Processing' | 'Integration' | 'Security' | 'Deployment';
}

export interface FrameworkOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DatabaseOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface LanguageOption {
  id: string;
  label: string;
}

export interface DropdownProps {
  options: FrameworkOption[] | DatabaseOption[] | LanguageOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ProjectSetupFormProps {
  onCreateProject: (config: ProjectConfig) => void;
  isGenerating: boolean;
}

export interface GeneratedProjectDisplayProps {
  project: GeneratedProject;
  config: ProjectConfig;
  onStartOver: () => void;
  onDownload: () => void;
}

export interface WorkflowBuilderProps {
  config: ProjectConfig;
  onBack: () => void;
  onGenerateProject: (nodes: Node[], edges: Edge[]) => void;
  isGenerating: boolean;
}
