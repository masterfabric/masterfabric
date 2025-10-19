import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-8 py-24">
        <div className="mb-24">
          <h1 className="text-8xl font-light text-foreground mb-6">
            MasterFabric
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Multi-tenant Backend-as-a-Service Platform
          </p>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-16">
            Build scalable, multi-tenant applications with dynamic GraphQL APIs, 
            authentication, and real-time features. Deploy in minutes, scale infinitely.
          </p>
          
          <div className="flex gap-8">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-muted-foreground">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-foreground hover:bg-muted">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-16">
          <div>
            <h2 className="text-2xl font-light text-foreground mb-4">Dynamic APIs</h2>
            <p className="text-base text-muted-foreground mb-4">
              Auto-generated GraphQL APIs with real-time subscriptions
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Define your schema and get instant GraphQL APIs with built-in authentication and authorization. 
              No complex setup required, just define your data model and start building.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-light text-foreground mb-4">Multi-tenant Architecture</h2>
            <p className="text-base text-muted-foreground mb-4">
              Isolated tenant environments with automatic provisioning
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each tenant gets their own isolated database schema and subdomain with automatic DNS management. 
              Complete data isolation ensures security and compliance.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-light text-foreground mb-4">Real-time Capabilities</h2>
            <p className="text-base text-muted-foreground mb-4">
              WebSocket subscriptions and live data updates
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Built-in real-time capabilities with WebSocket support for live data synchronization. 
              Keep your applications in sync across all connected clients.
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">MasterFabric</h3>
              <p className="text-sm text-muted-foreground">
                Multi-tenant Backend-as-a-Service Platform
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">License</h3>
              <p className="text-sm text-muted-foreground">
                Licensed under GNU AGPL-3.0
              </p>
              <p className="text-sm text-muted-foreground">
                © 2025 MASTERFABRIC Information Technologies Inc.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <p className="text-sm text-muted-foreground">
                Author: @gurkanfikretgunak
              </p>
              <p className="text-sm text-muted-foreground">
                License: license@masterfabric.co
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t">
            <p className="text-xs text-muted-foreground text-center">
              This software is provided under the GNU Affero General Public License v3.0 with additional terms.
              Forking this repository requires contact with MASTERFABRIC within 10 days.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
