import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FooterSystemStatus } from "@/components/FooterSystemStatus";

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
            <Button asChild variant="outline" size="lg">
              <Link href="/test">Developer Test Suite</Link>
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
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* MasterFabric Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">MasterFabric</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Modern microservices platform for scalable applications
                </p>
              </div>
              <div className="flex space-x-4">
                <a 
                  href="https://github.com/masterfabric" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
                <a 
                  href="https://docs.masterfabric.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Docs
                </a>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Services</h3>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">API Gateway</div>
                <div className="text-muted-foreground">Core Service</div>
                <div className="text-muted-foreground">Tenant Runtime</div>
                <div className="text-muted-foreground">Provisioning</div>
                <div className="text-muted-foreground">Dashboard</div>
              </div>
            </div>

            {/* Development */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Development</h3>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">Test Suite</div>
                <div className="text-muted-foreground">Component Library</div>
                <div className="text-muted-foreground">API Testing</div>
                <div className="text-muted-foreground">Health Monitoring</div>
              </div>
            </div>

            {/* System Status */}
            <FooterSystemStatus />
          </div>

          {/* Bottom Section */}
          <div className="border-t mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-muted-foreground">
                © 2025 MasterFabric. Built with Next.js, TypeScript, and Tailwind CSS.
              </div>
              <div className="flex space-x-6 text-sm">
                <a 
                  href="/privacy" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </a>
                <a 
                  href="/terms" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </a>
                <a 
                  href="/support" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
