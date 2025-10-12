'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GET_MY_ORGANIZATION, GET_ORGANIZATION_STATUS, DELETE_ORGANIZATION } from '@/lib/graphql';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'PROVISIONING' | 'READY' | 'FAILED';
  createdAt: string;
  _count?: {
    users: number;
    projects: number;
  };
}

export default function DashboardPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: orgData, loading: orgLoading, error: orgError } = useQuery(GET_MY_ORGANIZATION, {
    skip: typeof window === 'undefined' || !localStorage.getItem('token'),
  });

  const [deleteOrganization] = useMutation(DELETE_ORGANIZATION);

  useEffect(() => {
    if (orgData?.myOrganization) {
      setOrganization(orgData.myOrganization);
      setLoading(false);
    }
  }, [orgData]);

  useEffect(() => {
    if (orgError) {
      console.error('Dashboard GraphQL Error:', orgError);
      if (orgError.message.includes('Unauthorized') || orgError.message.includes('401')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  }, [orgError]);

  const handleViewDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleDeleteOrganization = async () => {
    if (!organization) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the organization "${organization.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await deleteOrganization({
        variables: { id: organization.id }
      });
      
      alert('Organization deleted successfully');
      // Redirect to login or show message
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      alert(`Failed to delete organization: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-light text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to your MasterFabric dashboard</p>
      </div>

      {organization && (
        <div className="space-y-6">
          {/* Organization Information */}
          <div className="space-y-4">
            <h2 className="text-2xl font-light text-foreground">Organization Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <p className="font-medium text-foreground">{organization.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Slug:</span>
                    <p className="font-medium text-foreground">{organization.slug}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subdomain:</span>
                    <p className="font-medium text-foreground">
                      {organization.slug}.masterfabric.co
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <p className="font-medium text-foreground">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Status</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Current Status:</span>
                    <Badge variant={getStatusVariant(organization.status) as any} className="ml-2">
                      {organization.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Projects:</span>
                    <p className="font-medium text-foreground">{organization._count?.projects || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Users:</span>
                    <p className="font-medium text-foreground">{organization._count?.users || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-light text-foreground">Quick Actions</h2>
            <div className="flex gap-4 flex-wrap">
              <Button asChild className="bg-foreground text-background hover:bg-muted-foreground">
                <Link href="/dashboard/projects">View Projects</Link>
              </Button>
              <Button asChild variant="ghost" className="text-foreground hover:bg-muted">
                <Link href="/dashboard/organizations">Manage Organizations</Link>
              </Button>
              <Button 
                onClick={handleViewDetails}
                variant="ghost" 
                className="text-foreground hover:bg-muted"
              >
                {showDetails ? 'Hide Details' : 'View Details'}
              </Button>
              <Button 
                onClick={handleDeleteOrganization}
                variant="ghost" 
                className="text-foreground hover:bg-muted"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Organization'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && organization && (
        <div className="space-y-4">
          <h2 className="text-2xl font-light text-foreground">Detailed Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-muted">
              <h3 className="text-lg font-medium text-foreground mb-3">Technical Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Organization ID:</span>
                  <p className="font-mono text-foreground">{organization.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Database Schema:</span>
                  <p className="font-mono text-foreground">tenant_{organization.slug}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">GraphQL Endpoint:</span>
                  <p className="font-mono text-foreground">{organization.slug}.masterfabric.co/graphql</p>
                </div>
                <div>
                  <span className="text-muted-foreground">API Base URL:</span>
                  <p className="font-mono text-foreground">{organization.slug}.masterfabric.co</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted">
              <h3 className="text-lg font-medium text-foreground mb-3">Status Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Status:</span>
                  <Badge variant={getStatusVariant(organization.status) as any} className="ml-2">
                    {organization.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created At:</span>
                  <p className="text-foreground">{new Date(organization.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <p className="text-foreground">{new Date(organization.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Projects:</span>
                  <p className="text-foreground">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Getting Started Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-light text-foreground">Getting Started</h2>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Organization Created</h4>
              <p className="text-sm text-muted-foreground">
                Your organization has been created and is {organization?.status.toLowerCase()}.
              </p>
            </div>
          </div>
          
          {organization?.status === 'READY' && (
            <>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Create Your First Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up a new project to start building your application.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Access Your GraphQL API</h4>
                  <p className="text-sm text-muted-foreground">
                    Your GraphQL endpoint is available at: {organization.slug}.masterfabric.co/graphql
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
