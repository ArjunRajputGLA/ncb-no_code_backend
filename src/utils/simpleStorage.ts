// Simple in-memory storage fallback for when LokiJS fails
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

class SimpleStorage {
  private projects: Map<string, Project> = new Map();
  private workflows: Map<string, WorkflowData> = new Map();
  private readonly PROJECTS_KEY = 'ncb_projects';
  private readonly WORKFLOWS_KEY = 'ncb_workflows';

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      console.log('SimpleStorage: Loading data from localStorage...');
      
      // Load projects
      const projectsData = localStorage.getItem(this.PROJECTS_KEY);
      if (projectsData) {
        const projectsArray: Project[] = JSON.parse(projectsData);
        this.projects = new Map(projectsArray.map(p => [p.id, p]));
        console.log('SimpleStorage: Loaded', projectsArray.length, 'projects from localStorage:', projectsArray.map(p => p.name));
      } else {
        console.log('SimpleStorage: No projects found in localStorage');
      }

      // Load workflows
      const workflowsData = localStorage.getItem(this.WORKFLOWS_KEY);
      if (workflowsData) {
        const workflowsArray: WorkflowData[] = JSON.parse(workflowsData);
        this.workflows = new Map(workflowsArray.map(w => [w.id, w]));
        console.log('SimpleStorage: Loaded', workflowsArray.length, 'workflows from localStorage');
      } else {
        console.log('SimpleStorage: No workflows found in localStorage');
      }
    } catch (error) {
      console.error('SimpleStorage: Error loading from localStorage:', error);
      // Reset maps if data is corrupted
      this.projects = new Map();
      this.workflows = new Map();
    }
  }

  private saveProjectsToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const projectsArray = Array.from(this.projects.values());
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projectsArray));
      console.log('SimpleStorage: Saved', projectsArray.length, 'projects to localStorage');
    } catch (error) {
      console.error('SimpleStorage: Error saving projects to localStorage:', error);
    }
  }

  private saveWorkflowsToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const workflowsArray = Array.from(this.workflows.values());
      localStorage.setItem(this.WORKFLOWS_KEY, JSON.stringify(workflowsArray));
      console.log('SimpleStorage: Saved', workflowsArray.length, 'workflows to localStorage');
    } catch (error) {
      console.error('SimpleStorage: Error saving workflows to localStorage:', error);
    }
  }

  // Project methods
  getAllProjects(): Project[] {
    const projects = Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    console.log('SimpleStorage: Getting all projects, count:', projects.length);
    return projects;
  }

  createProject(projectData: Omit<Project, 'id'>): Project {
    console.log('SimpleStorage: Creating project with data:', projectData);
    
    // Check if project name already exists
    const existingProject = Array.from(this.projects.values())
      .find(p => p.name.toLowerCase() === projectData.name.toLowerCase());
    
    if (existingProject) {
      console.log('SimpleStorage: Project with this name already exists:', existingProject.name);
      throw new Error('Project with this name already exists');
    }

    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      status: 'draft'
    };

    this.projects.set(newProject.id, newProject);
    this.saveProjectsToLocalStorage(); // Save to localStorage
    console.log('SimpleStorage: Project created and saved:', newProject);
    console.log('SimpleStorage: Total projects now:', this.projects.size);
    
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    // If updating name, check for duplicates
    if (updates.name && updates.name !== project.name) {
      const existingProject = Array.from(this.projects.values())
        .find(p => p.id !== id && p.name.toLowerCase() === updates.name!.toLowerCase());
      
      if (existingProject) {
        throw new Error('Project with this name already exists');
      }
    }

    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString().split('T')[0]
    };
    
    this.projects.set(id, updatedProject);
    this.saveProjectsToLocalStorage(); // Save to localStorage
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const existed = this.projects.has(id);
    if (existed) {
      this.projects.delete(id);
      // Also delete associated workflow
      this.workflows.delete(`workflow-${id}`);
      this.saveProjectsToLocalStorage(); // Save to localStorage
      this.saveWorkflowsToLocalStorage(); // Save to localStorage
    }
    return existed;
  }

  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  // Workflow methods
  saveWorkflow(projectId: string, nodes: any[], edges: any[]): WorkflowData {
    const workflowId = `workflow-${projectId}`;
    
    const workflowData: WorkflowData = {
      id: workflowId,
      projectId,
      nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
      edges: JSON.parse(JSON.stringify(edges)), // Deep clone
      lastModified: new Date().toISOString()
    };

    this.workflows.set(workflowId, workflowData);
    this.saveWorkflowsToLocalStorage(); // Save to localStorage

    // Update project lastModified
    const project = this.projects.get(projectId);
    if (project) {
      project.lastModified = new Date().toISOString().split('T')[0];
      this.projects.set(projectId, project);
      this.saveProjectsToLocalStorage(); // Save to localStorage
    }

    console.log('SimpleStorage: Workflow saved for project:', projectId);
    return workflowData;
  }

  getWorkflow(projectId: string): WorkflowData | null {
    return this.workflows.get(`workflow-${projectId}`) || null;
  }

  deleteWorkflow(projectId: string): boolean {
    const workflowId = `workflow-${projectId}`;
    const existed = this.workflows.has(workflowId);
    if (existed) {
      this.workflows.delete(workflowId);
      this.saveWorkflowsToLocalStorage(); // Save to localStorage
    }
    return existed;
  }
}

// Singleton instance
let simpleStorage: SimpleStorage | null = null;

export const getSimpleStorage = (): SimpleStorage => {
  if (!simpleStorage) {
    simpleStorage = new SimpleStorage();
    console.log('SimpleStorage: Creating new instance and loading from localStorage');
  } else {
    console.log('SimpleStorage: Returning existing instance');
  }
  return simpleStorage;
};

export default SimpleStorage;
