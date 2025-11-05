'use client';

// Force dynamic rendering to prevent static generation issues with Apollo Client
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT } from '@/lib/graphql';

interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const router = useRouter();

  // GraphQL Queries and Mutations
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS, {
    context: {
      headers: {
        authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    },
    errorPolicy: 'all',
  });

  useEffect(() => {
    if (error) {
      console.error('GraphQL Error:', error);
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        router.push('/dashboard/login');
      }
    }
  }, [error, router]);

  const [createProjectMutation, { error: createError, data: createData }] = useMutation(CREATE_PROJECT, {
    context: {
      headers: {
        authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    },
  });

  const [updateProjectMutation, { error: updateError, data: updateData }] = useMutation(UPDATE_PROJECT, {
    context: {
      headers: {
        authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    },
  });

  const [deleteProjectMutation, { error: deleteError, data: deleteData }] = useMutation(DELETE_PROJECT, {
    context: {
      headers: {
        authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    },
  });

  // Handle successful create
  useEffect(() => {
    if (createData?.createProject) {
      refetch();
      setNewProject({ name: '', description: '' });
      setShowCreateForm(false);
    }
  }, [createData, refetch]);

  // Handle successful update
  useEffect(() => {
    if (updateData?.updateProject) {
      refetch();
      setShowEditForm(false);
      setEditingProject(null);
    }
  }, [updateData, refetch]);

  // Handle successful delete
  useEffect(() => {
    if (deleteData?.deleteProject) {
      refetch();
    }
  }, [deleteData, refetch]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    try {
      await createProjectMutation({
        variables: {
          input: {
            name: newProject.name,
            description: newProject.description || undefined,
          },
        },
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      name: project.name,
      description: project.description || '',
    });
    setShowEditForm(true);
    setShowCreateForm(false);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      await updateProjectMutation({
        variables: {
          id: editingProject.id,
          input: {
            name: editForm.name,
            description: editForm.description || undefined,
          },
        },
      });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      return;
    }

    try {
      await deleteProjectMutation({
        variables: {
          id: project.id,
        },
      });
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const projects = data?.projects || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your projects</p>
        </div>
        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setShowEditForm(false);
          }}
          className="bg-foreground text-background hover:bg-muted-foreground"
        >
          {showCreateForm ? 'Cancel' : 'Create Project'}
        </Button>
      </div>

      {showCreateForm && (
        <div className="p-6 bg-muted border border-foreground/10">
          <h3 className="text-lg font-medium text-foreground mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                placeholder="Enter project name"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-foreground text-background hover:bg-muted-foreground"
              >
                Create Project
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="text-foreground hover:bg-background"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {showEditForm && editingProject && (
        <div className="p-6 bg-muted border border-foreground/10">
          <h3 className="text-lg font-medium text-foreground mb-4">Edit Project</h3>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Project Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                placeholder="Enter project name"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-foreground text-background hover:bg-muted-foreground"
              >
                Update Project
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingProject(null);
                }}
                className="text-foreground hover:bg-background"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects found.</p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-foreground text-background hover:bg-muted-foreground"
          >
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project: Project) => (
            <div key={project.id} className="p-6 bg-muted border border-foreground/10">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-foreground">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    className="text-foreground hover:bg-background"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(project)}
                    className="text-foreground hover:bg-background"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project)}
                    className="text-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
