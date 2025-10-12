'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOGIN_MUTATION } from '@/lib/graphql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [loginMutation, { loading, data, error: mutationError }] = useMutation(LOGIN_MUTATION);

  // Handle successful login
  useEffect(() => {
    if (data?.login) {
      // Store token and user info
      localStorage.setItem('token', data.login.token);
      localStorage.setItem('user', JSON.stringify(data.login.user));
      
      // Redirect to dashboard
      router.push('/dashboard');
    }
  }, [data, router]);

  // Handle login errors
  useEffect(() => {
    if (mutationError) {
      setLoginError(mutationError.message || 'Invalid credentials');
    }
  }, [mutationError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!isClient) return;

    try {
      await loginMutation({
        variables: {
          email,
          password,
        },
      });
    } catch (err) {
      // Error handled by useEffect
    }
  };

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-light text-foreground mb-2">Sign in to MasterFabric</h1>
              <p className="text-muted-foreground">Enter your credentials to access your account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div className="text-foreground text-sm text-center p-3 bg-muted">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full bg-foreground text-background hover:bg-muted-foreground" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="text-center text-sm">
                <Link href="/register" className="text-foreground hover:text-muted-foreground">
                  Don't have an account? Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      );
}
