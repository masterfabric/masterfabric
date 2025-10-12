'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-8 py-24">
        <h1 className="text-6xl font-light text-foreground mb-16">Component Test</h1>
        
        <div className="space-y-16">
          <div>
            <h2 className="text-2xl font-light text-foreground mb-6">Buttons</h2>
            <div className="space-y-4">
              <div>
                <Button className="bg-foreground text-background hover:bg-muted-foreground">Primary Button</Button>
              </div>
              <div>
                <Button variant="ghost" className="text-foreground hover:bg-muted">Ghost Button</Button>
              </div>
              <div>
                <Button variant="secondary" className="bg-muted text-foreground hover:bg-muted-foreground">Secondary Button</Button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-light text-foreground mb-6">Form Elements</h2>
            <div className="space-y-6 max-w-md">
              <div>
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" placeholder="Enter your email" className="mt-2 bg-background" />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" className="mt-2 bg-background" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-light text-foreground mb-6">Status Indicators</h2>
            <div className="flex gap-4">
              <Badge className="bg-foreground text-background">Active</Badge>
              <Badge variant="secondary" className="bg-muted text-foreground">Pending</Badge>
              <Badge variant="outline" className="text-foreground">Inactive</Badge>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-light text-foreground mb-6">Information Display</h2>
            <div className="space-y-4">
              <div className="p-6 bg-muted">
                <h3 className="text-lg font-medium text-foreground mb-2">Primary Information</h3>
                <p className="text-sm text-muted-foreground">This is a primary information block with important details.</p>
              </div>
              <div className="p-6 bg-background">
                <h3 className="text-lg font-medium text-foreground mb-2">Secondary Information</h3>
                <p className="text-sm text-muted-foreground">This is a secondary information block with additional context.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
