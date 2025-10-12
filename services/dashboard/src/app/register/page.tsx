'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useLazyQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REGISTER_MUTATION, GET_ORGANIZATION_STATUS } from '@/lib/graphql';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [success, setSuccess] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [getOrgStatus] = useLazyQuery(GET_ORGANIZATION_STATUS, {
    fetchPolicy: 'network-only',
  });

  const [registerMutation, { loading, data, error: mutationError }] = useMutation(REGISTER_MUTATION);

  // Handle successful registration
  useEffect(() => {
    if (data?.register) {
      setOrganizationId(data.register.user.organizationId);
      
      // Store token and user data
      localStorage.setItem('token', data.register.token);
      localStorage.setItem('user', JSON.stringify(data.register.user));
      
      // In local development, skip provisioning and go directly to dashboard
      if (process.env.NODE_ENV === 'development') {
        router.push('/dashboard');
        return;
      }
      
      setSuccess(true);
      // Start polling for organization status
      pollOrganizationStatus(data.register.user.organizationId);
    }
  }, [data, router]);

  // Handle registration errors
  useEffect(() => {
    if (mutationError) {
      setRegisterError(mutationError.message || 'Registration failed');
    }
  }, [mutationError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!isClient) return;

    try {
      await registerMutation({
        variables: {
          input: {
            email: formData.email,
            password: formData.password,
            organizationName: formData.organizationName,
            organizationSlug: formData.organizationSlug,
          },
        },
      });
    } catch (err) {
      // Error handled by useEffect
    }
  };

  const pollOrganizationStatus = async (orgId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await getOrgStatus({
          variables: { id: orgId },
        });

        if (result.data) {
          const status = result.data.organizationStatus.status;
          if (status === 'READY') {
            router.push('/dashboard');
            return;
          } else if (status === 'FAILED') {
            setRegisterError('Organization provisioning failed. Please contact support.');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setRegisterError('Organization provisioning is taking longer than expected. Please check back later.');
        }
      } catch (err) {
        setRegisterError('Error checking organization status. Please refresh the page.');
      }
    };

    poll();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Registration Successful!
            </CardTitle>
            <CardDescription>
              Your organization is being provisioned. This may take a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">
              Please wait while we set up your environment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Create your account</CardTitle>
          <CardDescription>
            Join MasterFabric and start building your multi-tenant applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Enter organization name"
                value={formData.organizationName}
                onChange={handleInputChange}
                required
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationSlug">Organization Slug</Label>
              <Input
                id="organizationSlug"
                name="organizationSlug"
                type="text"
                placeholder="my-company"
                pattern="[a-z0-9\-]+"
                value={formData.organizationSlug}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>

            {registerError && (
              <div className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-md">
                {registerError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-blue-800 hover:text-blue-900">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
