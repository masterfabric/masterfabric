'use client';

// Force dynamic rendering to prevent static generation issues with Apollo Client
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GET_ORGANIZATIONS, UPDATE_ORGANIZATION, DELETE_ORGANIZATION } from '@/lib/graphql';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'PROVISIONING' | 'READY' | 'FAILED';
  createdAt: string;
  _count: {
    users: number;
    projects: number;
  };
}

export default function OrganizationsPage() {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '' });
  const router = useRouter();

  // GraphQL Queries and Mutations
  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATIONS, {
    context: {
      headers: {
        authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    },
    errorPolicy: 'all', // Allow partial data even with errors
  });

  // Handle errors with useEffect instead of onError callback
  useEffect(() => {
    if (error) {
      console.error('GraphQL Error:', error);
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        router.push('/login');
      }
    }
  }, [error, router]);

  const [updateOrganization, { error: updateError, data: updateData }] = useMutation(UPDATE_ORGANIZATION);
  const [deleteOrganization, { error: deleteError, data: deleteData }] = useMutation(DELETE_ORGANIZATION);

  // Handle successful update
  useEffect(() => {
    if (updateData?.updateOrganization) {
      refetch();
      setShowEditForm(false);
      setEditingOrg(null);
    }
  }, [updateData, refetch]);

  // Handle successful delete
  useEffect(() => {
    if (deleteData?.deleteOrganization) {
      refetch();
      if (selectedOrg) {
        setShowDetails(false);
        setSelectedOrg(null);
      }
      alert('Organization deleted successfully!');
    }
  }, [deleteData, refetch, selectedOrg]);

  // Handle mutation errors with useEffect
  useEffect(() => {
    if (updateError) {
      console.error('Update Error:', updateError);
      alert('Failed to update organization');
    }
  }, [updateError]);

  useEffect(() => {
    if (deleteError) {
      console.error('Delete Error:', deleteError);
      alert('Failed to delete organization');
    }
  }, [deleteError]);

  const organizations = data?.organizations || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'READY':
        return 'default';
      case 'PROVISIONING':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleViewDetails = (org: Organization) => {
    setSelectedOrg(org);
    setShowDetails(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setEditForm({ name: org.name, slug: org.slug });
    setShowEditForm(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      await updateOrganization({
        variables: {
          id: editingOrg.id,
          input: editForm,
        },
        context: {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      });
    } catch (error) {
      console.error('Error updating organization:', error);
    }
  };

  const handleDelete = async (org: Organization) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the organization "${org.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await deleteOrganization({
        variables: {
          id: org.id,
        },
        context: {
          headers: {
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      });
    } catch (error) {
      console.error('Error deleting organization:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading organizations</p>
          <Button onClick={() => refetch()} className="bg-foreground text-background hover:bg-muted-foreground">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-light text-foreground">Organizations</h1>
        <p className="text-muted-foreground mt-2">Manage your organizations</p>
      </div>

      {organizations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No organizations found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org: Organization) => (
            <div key={org.id} className="p-6 bg-muted">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">{org.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Slug: {org.slug}</span>
                    <span>Users: {org._count?.users || 0}</span>
                    <span>Projects: {org._count?.projects || 0}</span>
                    <span>Created: {new Date(org.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(org.status) as any}>
                    {org.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:bg-muted"
                    onClick={() => handleViewDetails(org)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:bg-muted"
                    onClick={() => handleEdit(org)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:bg-muted"
                    onClick={() => window.open(`http://${org.slug}.masterfabric.co`, '_blank')}
                  >
                    Visit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleDelete(org)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organization Details Modal */}
      {showDetails && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-foreground">Organization Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium text-foreground">{selectedOrg.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Slug:</span>
                      <p className="font-medium text-foreground">{selectedOrg.slug}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={getStatusVariant(selectedOrg.status) as any} className="ml-2">
                        {selectedOrg.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <p className="font-medium text-foreground">
                        {new Date(selectedOrg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Users:</span>
                      <p className="font-medium text-foreground">{selectedOrg._count?.users || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Projects:</span>
                      <p className="font-medium text-foreground">{selectedOrg._count?.projects || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Technical Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Organization ID:</span>
                    <p className="font-mono text-foreground text-sm">{selectedOrg.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subdomain:</span>
                    <p className="font-mono text-foreground text-sm">{selectedOrg.slug}.masterfabric.co</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">GraphQL Endpoint:</span>
                    <p className="font-mono text-foreground text-sm">{selectedOrg.slug}.masterfabric.co/graphql</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowDetails(false);
                  handleEdit(selectedOrg);
                }}
                className="bg-foreground text-background hover:bg-muted-foreground"
              >
                Edit Organization
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDetails(false)}
                className="text-foreground hover:bg-muted"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditForm && editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-foreground">Edit Organization</h2>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Organization Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Organization Slug</label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full mt-1 p-2 border border-foreground/20 bg-background"
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="bg-foreground text-background hover:bg-muted-foreground"
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditForm(false)}
                  className="text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}