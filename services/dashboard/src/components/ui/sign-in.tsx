'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LOGIN_MUTATION } from '@/lib/graphql';

interface SignInProps {
  onSuccess?: () => void;
  showLinks?: boolean;
}

export function SignIn({ onSuccess, showLinks = true }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!isClient) return;

    try {
      const result = await loginMutation({
        variables: {
          email,
          password,
        },
      });

      if (result.data?.login) {
        // Store token and user info
        localStorage.setItem('token', result.data.login.token);
        localStorage.setItem('user', JSON.stringify(result.data.login.user));
        
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Email and password authentication</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              Sign in successful!
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {showLinks && (
            <div className="space-y-2 text-sm">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 w-full text-left"
                onClick={() => {/* Handle forgot password */}}
              >
                Forgot password?
              </button>
              <div className="text-center text-muted-foreground">or</div>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 w-full text-left"
                onClick={() => {/* Handle magic link */}}
              >
                Sign in with magic link
              </button>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 w-full text-left"
                onClick={() => {/* Handle QR code */}}
              >
                Sign in with QR code
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

