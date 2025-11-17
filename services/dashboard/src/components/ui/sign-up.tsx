'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REGISTER_MUTATION } from '@/lib/graphql';

interface SignUpProps {
  onSuccess?: () => void;
  showLinks?: boolean;
}

export function SignUp({ onSuccess, showLinks = true }: SignUpProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationSlug: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [registerMutation, { loading }] = useMutation(REGISTER_MUTATION);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!isClient) return;

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    try {
      const result = await registerMutation({
        variables: {
          input: {
            email: formData.email,
            password: formData.password,
            organizationName: formData.organizationName,
            organizationSlug: formData.organizationSlug,
          },
        },
      });

      if (result.data?.register) {
        // Store token and user info
        localStorage.setItem('token', result.data.register.token);
        localStorage.setItem('user', JSON.stringify(result.data.register.user));
        
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
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
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
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
            <Label htmlFor="signup-confirm-password">Confirm Password</Label>
            <Input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-org-name">Organization Name</Label>
            <Input
              id="signup-org-name"
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
            <Label htmlFor="signup-org-slug">Organization Slug</Label>
            <Input
              id="signup-org-slug"
              name="organizationSlug"
              type="text"
              placeholder="my-company"
              pattern="[a-z0-9\-]+"
              value={formData.organizationSlug}
              onChange={handleInputChange}
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="accept-terms" className="text-sm font-normal cursor-pointer">
              I accept the terms and conditions
            </Label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              Registration successful!
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>

          {showLinks && (
            <div className="text-center text-sm">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800"
                onClick={() => {/* Handle sign in */}}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

