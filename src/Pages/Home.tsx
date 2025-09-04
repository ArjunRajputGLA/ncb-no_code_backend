'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Folder, 
  Calendar, 
  Settings, 
  Trash2, 
  ExternalLink, 
  Menu, 
  X, 
  AlertCircle,
  Search,
  Filter,
  Grid3X3,
  List,
  Clock,
  Zap,
  CheckCircle,
  CircleDot,
  ArrowUpRight,
  Star,
  Sparkles,
  Code,
  Database
} from 'lucide-react';
import { getDatabase, Project } from '@/utils/database';

const NoCodeDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'deployed'>('all');
  const router = useRouter();

  useEffect(() => {
    // Only load projects on client side to avoid SSR issues
    if (typeof window !== 'undefined') {
      loadProjects();
    }
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Home: Loading projects...');
      
      // Only load projects on client side
      if (typeof window === 'undefined') {
        console.log('Home: Server side, setting empty projects');
        setProjects([]);
        return;
      }
      
      const db = getDatabase();
      console.log('Home: Got database instance');
      
      const loadedProjects = await db.getAllProjects();
      console.log('Home: Loaded projects from database:', loadedProjects);
      
      setProjects(loadedProjects);
      console.log('Home: Projects set in state');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      console.error('Home: Error loading projects:', err);
      setError(errorMessage);
      
      // Fallback to empty projects array if database fails
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      console.log('Creating project:', newProjectName);
      
      // Only create projects on client side
      if (typeof window === 'undefined') {
        setError('Cannot create projects on server side');
        return;
      }
      
      const db = getDatabase();
      console.log('Database instance:', db);
      
      const newProject = await db.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || 'No description provided',
        createdAt: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
        status: 'draft',
      });
      
      console.log('Project created successfully:', newProject);
      
      setProjects([newProject, ...projects]);
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreating(false);
      
      // Show success message
      console.log('Project added to UI successfully');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      console.error('Error creating project:', err);
      setError(errorMessage);
    }
  };

  const handleOpenProject = (projectId: string) => {
    router.push(`/workflow/${projectId}`);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      console.log('Home: Deleting project with id:', id);
      const db = getDatabase();
      await db.deleteProject(id);
      setProjects(projects.filter((project) => project.id !== id));
      console.log('Home: Project deleted successfully');
    } catch (err) {
      console.error('Home: Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  // Debug function to test database
  const createTestProject = async () => {
    try {
      console.log('Home: Creating test project...');
      const db = getDatabase();
      const testProject = await db.createProject({
        name: `Test Project ${Date.now()}`,
        description: 'This is a test project created for debugging',
        createdAt: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
        status: 'draft',
      });
      
      console.log('Home: Test project created:', testProject);
      setProjects([testProject, ...projects]);
    } catch (err) {
      console.error('Home: Error creating test project:', err);
      setError('Failed to create test project');
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deployed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CircleDot className="w-3 h-3" />;
      case 'deployed':
        return <CheckCircle className="w-3 h-3" />;
      case 'draft':
        return <Clock className="w-3 h-3" />;
      default:
        return <CircleDot className="w-3 h-3" />;
    }
  };

  const filteredAndSortedProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white/90 backdrop-blur-xl shadow-2xl border-r border-gray-200/50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-all duration-300 ease-out lg:static lg:translate-x-0 z-50`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">NoCode Builder</h2>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-6 space-y-2">
          <div className="mb-6">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center w-full px-4 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold">New Project</div>
                <div className="text-xs text-white/80">Create a new backend</div>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-80" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</h3>
            <a href="#" className="flex items-center px-4 py-3 text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-100 transition-all duration-200">
              <Folder className="w-5 h-5 mr-3" />
              <span className="font-medium">Projects</span>
              <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {filteredAndSortedProjects.length}
              </span>
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all duration-200">
              <Database className="w-5 h-5 mr-3" />
              <span className="font-medium">Templates</span>
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                Soon
              </span>
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all duration-200">
              <Settings className="w-5 h-5 mr-3" />
              <span className="font-medium">Settings</span>
            </a>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Pro Features</h4>
                  <p className="text-xs text-gray-600 mt-1">Unlock advanced templates and AI features</p>
                  <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    Learn More →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Your Projects
                </h1>
                <p className="text-gray-600 mt-1">Build and manage your backend services</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl px-4 py-2">
                <Folder className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-800">
                  {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4 space-y-4">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm placeholder-gray-500 transition-all duration-200"
                />
              </div>
              <div className="flex space-x-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm text-gray-700 transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="deployed">Deployed</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm text-gray-700 transition-all duration-200"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Projects Display */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
              <span className="flex-1">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-3 text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-colors"
                title="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center animate-spin">
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading your projects</h3>
                <p className="text-gray-600">Please wait while we fetch your amazing work...</p>
              </div>
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            searchQuery || filterStatus !== 'all' ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria to find what you're looking for.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Create your first project</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start building amazing backends with our visual workflow builder. No coding required!
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Project
                  <ArrowUpRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )
          ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                : 'space-y-4'
            } animate-in fade-in duration-500`}>
              {filteredAndSortedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className={`group bg-white/70 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl border border-gray-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                    viewMode === 'list' ? 'p-6 flex items-center space-x-6' : 'p-6'
                  }`}
                  onClick={() => handleOpenProject(project.id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Code className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {project.name}
                            </h3>
                            <div className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(project.status)}`}>
                              {getStatusIcon(project.status)}
                              <span className="capitalize">{project.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Updated {new Date(project.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center text-xs text-gray-500">
                          <Database className="w-3 h-3 mr-1" />
                          <span>Backend Project</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {project.name}
                          </h3>
                          <div className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span className="capitalize">{project.status}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Updated {new Date(project.lastModified).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Enhanced Create Project Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
                    <p className="text-sm text-gray-600">Start building your backend service</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsCreating(false);
                    setNewProjectName('');
                    setNewProjectDesc('');
                    setError(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter a unique project name..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Choose a descriptive name for your backend project
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Describe what this project will do..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 resize-none bg-gray-50 focus:bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Help others understand what this project is about
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Project</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewProjectName('');
                      setNewProjectDesc('');
                      setError(null);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoCodeDashboard;