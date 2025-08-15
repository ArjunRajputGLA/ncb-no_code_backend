import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { ProjectData, Workflow, BackendResponse, ProjectUpdateData, FileChangeData, BackendError } from '../types';

const API_BASE_URL = 'http://localhost:5000';

class BackendService {
  private socket: Socket | null = null;
  private currentProject: string | null = null;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(API_BASE_URL);
    
    this.socket.on('connect', () => {
      console.log('🔌 Connected to backend server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend server');
    });

    this.socket.on('project-updated', (data: ProjectUpdateData) => {
      console.log('📝 Project updated:', data);
      // Emit custom event for React components to listen to
      window.dispatchEvent(new CustomEvent('project-updated', { detail: data }));
    });

    this.socket.on('file-changed', (data: FileChangeData) => {
      console.log('📁 File changed:', data);
      window.dispatchEvent(new CustomEvent('file-changed', { detail: data }));
    });

    this.socket.on('error', (error: BackendError) => {
      console.error('❌ Socket error:', error);
      window.dispatchEvent(new CustomEvent('backend-error', { detail: error }));
    });
  }

  async createProject(projectData: ProjectData): Promise<BackendResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/create-project`, projectData);
      
      if (response.data.success) {
        this.currentProject = projectData.projectName;
        this.joinProject(projectData.projectName);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateWorkflow(projectPath: string, workflow: Workflow): Promise<BackendResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/update-workflow`, {
        projectPath,
        workflow
      });

      // Also emit via socket for real-time updates
      if (this.socket && this.currentProject) {
        this.socket.emit('workflow-change', {
          projectPath,
          workflow,
          projectName: this.currentProject
        });
      }

      return response.data;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  async getProjectStatus(projectName: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/project-status/${projectName}`);
      return response.data;
    } catch (error) {
      console.error('Error getting project status:', error);
      throw error;
    }
  }

  joinProject(projectName: string) {
    if (this.socket) {
      this.currentProject = projectName;
      this.socket.emit('join-project', projectName);
      console.log(`🏠 Joined project: ${projectName}`);
    }
  }

  leaveProject() {
    if (this.socket && this.currentProject) {
      this.socket.emit('leave-project', this.currentProject);
      this.currentProject = null;
    }
  }

  onProjectUpdate(callback: (data: ProjectUpdateData) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('project-updated', handler as EventListener);
    return () => window.removeEventListener('project-updated', handler as EventListener);
  }

  onFileChange(callback: (data: FileChangeData) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('file-changed', handler as EventListener);
    return () => window.removeEventListener('file-changed', handler as EventListener);
  }

  onError(callback: (error: BackendError) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('backend-error', handler as EventListener);
    return () => window.removeEventListener('backend-error', handler as EventListener);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const backendService = new BackendService();
export default BackendService;
