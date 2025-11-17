'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MagicLinkProps {
  onSuccess?: () => void;
}

export function MagicLink({ onSuccess }: MagicLinkProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Simulate API call - replace with actual GraphQL mutation when available
      const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation SendMagicLink($email: String!) {
              sendMagicLink(email: $email) {
                success
                message
              }
            }
          `,
          variables: {
            email,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to send magic link');
      } else if (data.data?.sendMagicLink?.success) {
        setSuccess(true);
        setCanResend(false);
        setResendCountdown(60); // 60 second countdown
        
        // Start countdown timer
        const timer = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      } else {
        setError('Failed to send magic link');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCanResend(false);
    setResendCountdown(60);
    handleSubmit(new Event('submit') as any);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Magic Link Sign In</CardTitle>
        <CardDescription>We'll send you a secure link to sign in without a password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              Magic link sent! Please check your email and click the link to sign in.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>

          {success && (
            <div className="text-center space-y-2">
              {resendCountdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend available in {resendCountdown} seconds
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={!canResend}
                >
                  Resend Magic Link
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

