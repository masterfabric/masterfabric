'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface QRCodeTestProps {
  onGenerate?: (data: string) => void;
  onTest?: (url: string) => void;
}

export function QRCodeTest({ onGenerate, onTest }: QRCodeTestProps) {
  const [qrData, setQrData] = useState('https://masterfabric.dev');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate QR Code URL using a free QR code service
  const generateQRCodeUrl = (data: string) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  };

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate(qrData);
    }
  };

  const handleTestUrl = async () => {
    if (!testUrl) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // Handle CORS issues
      });
      
      setTestResult({
        success: true,
        message: 'URL is accessible'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'URL test failed or is not accessible'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const predefinedUrls = [
    'https://masterfabric.dev',
    'https://github.com/masterfabric',
    'https://docs.masterfabric.dev',
    'https://api.masterfabric.dev/health'
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>QR Code Generator & Test</CardTitle>
        <CardDescription>
          Generate QR codes for URLs and test URL accessibility
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code Generation */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="qr-data">QR Code Data</Label>
            <Input
              id="qr-data"
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              placeholder="Enter URL or text for QR code"
              className="mt-1"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {predefinedUrls.map((url, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => setQrData(url)}
              >
                {url.replace('https://', '')}
              </Button>
            ))}
          </div>
          
          <Button onClick={handleGenerate} className="w-full">
            Generate QR Code
          </Button>
          
          {qrData && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 border rounded-lg bg-white">
                <img
                  src={generateQRCodeUrl(qrData)}
                  alt="Generated QR Code"
                  className="w-48 h-48"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkVSUk9SPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Scan with your phone</p>
                <p className="text-xs text-muted-foreground break-all max-w-xs">{qrData}</p>
              </div>
            </div>
          )}
        </div>

        {/* URL Testing */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4">URL Accessibility Test</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-url">Test URL</Label>
              <Input
                id="test-url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Enter URL to test"
                className="mt-1"
              />
            </div>
            
            <Button 
              onClick={handleTestUrl} 
              disabled={isLoading || !testUrl}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test URL'}
            </Button>
            
            {testResult && (
              <div className="flex items-center justify-center">
                <div className="bg-black text-white p-3 rounded-lg text-2xl">
                  {testResult.success ? '✅' : '❌'}
                </div>
              </div>
            )}
            
            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <strong>Result:</strong> {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Information */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-3">QR Code Information</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• QR codes are generated using a free public service</p>
            <p>• Maximum data length: ~4,000 characters</p>
            <p>• Supported formats: URLs, text, contact info, WiFi credentials</p>
            <p>• Test URLs to verify accessibility and connectivity</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
