import Loki from 'lokijs';
import { getSimpleStorage, Project as SimpleProject, WorkflowData as SimpleWorkflowData } from './simpleStorage';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'draft' | 'deployed';
}

export interface WorkflowData {
  id: string;
  projectId: string;
  nodes: any[];
  edges: any[];
  lastModified: string;
}

class DatabaseManager {
  private db: Loki | null = null;
  private projects: Collection<Project> | null = null;
  private workflows: Collection<WorkflowData> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private useSimpleStorage = true; // Default to simple storage to avoid LokiJS issues

  constructor() {
    if (typeof window !== 'undefined') {
      // Always use simple storage for now to avoid LokiJS compatibility issues
      this.useSimpleStorage = true;
      this.isInitialized = true;
      console.log('Database initialized with simple storage');
    }
  }

  public isUsingSimpleStorage(): boolean {
    return this.useSimpleStorage;
  }

  private async initDatabase(): Promise<void> {
    if (typeof window === 'undefined') {
      this.useSimpleStorage = true;
      return;
    }

    // Skip LokiJS initialization and use simple storage
    this.useSimpleStorage = true;
    this.isInitialized = true;
    return Promise.resolve();
  }

  private initCollections() {
    if (!this.db) return;

    // Initialize projects collection
    this.projects = this.db.getCollection('projects');
    if (!this.projects) {
      this.projects = this.db.addCollection('projects', { 
        indices: ['id', 'name'],
        unique: ['id', 'name'] 
      });
    }

    // Initialize workflows collection
    this.workflows = this.db.getCollection('workflows');
    if (!this.workflows) {
      this.workflows = this.db.addCollection('workflows', { 
        indices: ['id', 'projectId'],
        unique: ['id'] 
      });
    }
  }

  private waitForInit(): Promise<void> {
    // Since we're using simple storage by default, always return resolved promise
    return Promise.resolve();
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    console.log('DatabaseManager: getAllProjects called');
    if (this.useSimpleStorage || typeof window === 'undefined') {
      console.log('DatabaseManager: Using simple storage');
      const storage = getSimpleStorage();
      const projects = storage.getAllProjects();
      console.log('DatabaseManager: Retrieved projects from simple storage:', projects);
      return projects;
    }

    await this.waitForInit();
    if (!this.projects) return [];
    return this.projects.find().map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      lastModified: project.lastModified,
      status: project.status
    }));
  }

  async createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    console.log('DatabaseManager: createProject called with:', projectData);
    if (this.useSimpleStorage || typeof window === 'undefined') {
      console.log('DatabaseManager: Using simple storage for project creation');
      const storage = getSimpleStorage();
      const newProject = storage.createProject(projectData);
      console.log('DatabaseManager: Project created in simple storage:', newProject);
      return newProject;
    }

    await this.waitForInit();
    if (!this.projects) throw new Error('Database not initialized');

    // Check if project name already exists
    const existingProject = this.projects.findOne({ name: projectData.name });
    if (existingProject) {
      throw new Error('Project with this name already exists');
    }

    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      status: 'draft'
    };

    this.projects.insert(newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.updateProject(id, updates);
    }

    await this.waitForInit();
    if (!this.projects) return null;

    const project = this.projects.findOne({ id });
    if (!project) return null;

    // If updating name, check for duplicates
    if (updates.name && updates.name !== project.name) {
      const existingProject = this.projects.findOne({ name: updates.name });
      if (existingProject) {
        throw new Error('Project with this name already exists');
      }
    }

    Object.assign(project, updates, { lastModified: new Date().toISOString().split('T')[0] });
    this.projects.update(project);
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.deleteProject(id);
    }

    await this.waitForInit();
    if (!this.projects || !this.workflows) return false;

    const project = this.projects.findOne({ id });
    if (!project) return false;

    // Delete associated workflows
    const projectWorkflows = this.workflows.find({ projectId: id });
    projectWorkflows.forEach(workflow => {
      this.workflows!.remove(workflow);
    });

    // Delete the project
    this.projects.remove(project);
    return true;
  }

  async getProject(id: string): Promise<Project | null> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.getProject(id);
    }

    await this.waitForInit();
    if (!this.projects) return null;
    return this.projects.findOne({ id }) || null;
  }

  // Workflow methods
  async saveWorkflow(projectId: string, nodes: any[], edges: any[]): Promise<WorkflowData> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.saveWorkflow(projectId, nodes, edges);
    }

    await this.waitForInit();
    if (!this.workflows) throw new Error('Database not initialized');

    const workflowId = `workflow-${projectId}`;
    let workflow = this.workflows.findOne({ projectId });

    const workflowData: WorkflowData = {
      id: workflowId,
      projectId,
      nodes,
      edges,
      lastModified: new Date().toISOString()
    };

    if (workflow) {
      Object.assign(workflow, workflowData);
      this.workflows.update(workflow);
    } else {
      this.workflows.insert(workflowData);
    }

    // Update project lastModified
    if (this.projects) {
      const project = this.projects.findOne({ id: projectId });
      if (project) {
        project.lastModified = new Date().toISOString().split('T')[0];
        this.projects.update(project);
      }
    }

    return workflowData;
  }

  async getWorkflow(projectId: string): Promise<WorkflowData | null> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.getWorkflow(projectId);
    }

    await this.waitForInit();
    if (!this.workflows) return null;
    return this.workflows.findOne({ projectId }) || null;
  }

  async deleteWorkflow(projectId: string): Promise<boolean> {
    if (this.useSimpleStorage || typeof window === 'undefined') {
      const storage = getSimpleStorage();
      return storage.deleteWorkflow(projectId);
    }

    await this.waitForInit();
    if (!this.workflows) return false;

    const workflow = this.workflows.findOne({ projectId });
    if (!workflow) return false;

    this.workflows.remove(workflow);
    return true;
  }
}

// Singleton instance
let dbManager: DatabaseManager | null = null;

export const getDatabase = (): DatabaseManager => {
  if (!dbManager) {
    dbManager = new DatabaseManager();
    console.log('Creating new database manager instance');
  }
  console.log('Returning database manager, using simple storage:', dbManager.isUsingSimpleStorage());
  return dbManager;
};

export default DatabaseManager;
