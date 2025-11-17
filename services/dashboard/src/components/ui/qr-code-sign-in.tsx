'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QRCodeSignInProps {
  onSuccess?: () => void;
}

type QRStatus = 'waiting' | 'scanning' | 'success' | 'expired';

export function QRCodeSignIn({ onSuccess }: QRCodeSignInProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<QRStatus>('waiting');
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  // Generate QR code URL using a free QR code service
  const generateQRCodeUrl = (data: string) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  };

  const generateQRCode = async () => {
    try {
      // Generate a session ID for QR code authentication
      const sessionId = `qr-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(sessionId);
      
      // Create QR code data with session ID and authentication endpoint
      const qrData = JSON.stringify({
        type: 'auth',
        sessionId: sessionId,
        url: `${window.location.origin}/auth/qr/${sessionId}`,
        timestamp: Date.now(),
      });

      setQrCodeUrl(generateQRCodeUrl(qrData));
      setStatus('waiting');
      setError('');
      
      // Start polling for authentication status
      startPolling(sessionId);
    } catch (err: any) {
      setError('Failed to generate QR code');
    }
  };

  const startPolling = (sessionId: string) => {
    if (polling) return;
    
    setPolling(true);
    let pollCount = 0;
    const maxPolls = 60; // Poll for 2 minutes (60 * 2 seconds)

    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        // Simulate checking authentication status
        // Replace with actual GraphQL query when available
        const response = await fetch(process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3002/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query CheckQRAuthStatus($sessionId: String!) {
                checkQRAuthStatus(sessionId: $sessionId) {
                  status
                  token
                  user
                }
              }
            `,
            variables: {
              sessionId,
            },
          }),
        });

        const data = await response.json();

        if (data.data?.checkQRAuthStatus?.status === 'authenticated') {
          const { token, user } = data.data.checkQRAuthStatus;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setStatus('success');
          clearInterval(pollInterval);
          setPolling(false);
          
          if (onSuccess) {
            setTimeout(onSuccess, 1000);
          }
        } else if (data.data?.checkQRAuthStatus?.status === 'expired') {
          setStatus('expired');
          clearInterval(pollInterval);
          setPolling(false);
        } else if (data.data?.checkQRAuthStatus?.status === 'scanning') {
          setStatus('scanning');
        }
      } catch (err) {
        // Continue polling on error
      }

      if (pollCount >= maxPolls) {
        setStatus('expired');
        clearInterval(pollInterval);
        setPolling(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  useEffect(() => {
    generateQRCode();
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary">Waiting for scan</Badge>;
      case 'scanning':
        return <Badge variant="default">Scanning...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-600">Success!</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>QR Code Sign In</CardTitle>
        <CardDescription>Scan the QR code with your mobile device to sign in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {qrCodeUrl ? (
            <>
              <div className="p-4 border rounded-lg bg-white">
                <img
                  src={qrCodeUrl}
                  alt="QR Code for Sign In"
                  className="w-48 h-48"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVSUk9SPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              </div>
              
              <div className="text-center">
                {getStatusBadge()}
              </div>

              {status === 'waiting' && (
                <p className="text-sm text-muted-foreground text-center">
                  Open the MasterFabric app on your phone and scan this QR code
                </p>
              )}

              {status === 'scanning' && (
                <p className="text-sm text-blue-600 text-center">
                  QR code scanned! Please confirm on your device...
                </p>
              )}

              {status === 'success' && (
                <p className="text-sm text-green-600 text-center">
                  Authentication successful! Redirecting...
                </p>
              )}

              {status === 'expired' && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-600">
                    QR code has expired. Please generate a new one.
                  </p>
                  <Button onClick={generateQRCode} size="sm">
                    Generate New QR Code
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Generating QR code...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {qrCodeUrl && status !== 'expired' && (
          <Button
            variant="outline"
            className="w-full"
            onClick={generateQRCode}
            disabled={polling}
          >
            Refresh QR Code
          </Button>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Instructions:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Open the MasterFabric mobile app</li>
            <li>Navigate to Sign In → QR Code</li>
            <li>Point your camera at this QR code</li>
            <li>Confirm the sign-in request on your device</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

