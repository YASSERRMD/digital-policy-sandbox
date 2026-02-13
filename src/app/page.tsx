'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  PolicyDefinition 
} from '@/components/policy-sandbox/policy-definition';
import { 
  PopulationModeling 
} from '@/components/policy-sandbox/population-modeling';
import { 
  KPIDashboard 
} from '@/components/policy-sandbox/kpi-dashboard';
import { 
  ScenarioManager 
} from '@/components/policy-sandbox/scenario-manager';
import {
  FileText, Users, Building2, BarChart3, GitBranch, Settings,
  Database, Activity, RefreshCw, Download, HelpCircle
} from 'lucide-react';

export default function DigitalPolicySandbox() {
  const [isSeeded, setIsSeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkSeedStatus();
  }, []);

  const checkSeedStatus = async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      setIsSeeded(data.length > 0);
    } catch {
      setIsSeeded(false);
    }
  };

  const seedDatabase = async () => {
    setSeeding(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      setIsSeeded(true);
      window.location.reload();
    } catch (error) {
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Digital Policy Sandbox</h1>
                <p className="text-xs text-muted-foreground">Simulate and compare policy impacts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSeeded && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Database className="h-3 w-3 mr-1" /> Data Loaded
                </Badge>
              )}
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {!isSeeded ? (
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to Policy Sandbox</CardTitle>
              <CardDescription>
                Get started by seeding the database with demo data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>This will create:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sample policies (fines, permits, inspections, taxes)</li>
                  <li>Citizen population groups</li>
                  <li>Business categories</li>
                  <li>A baseline scenario</li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                onClick={seedDatabase}
                disabled={seeding}
              >
                {seeding ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-pulse" />
                    Seeding Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Initialize Demo Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-5 w-auto">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Scenarios</span>
                </TabsTrigger>
                <TabsTrigger value="policies" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Policies</span>
                </TabsTrigger>
                <TabsTrigger value="population" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Population</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">System Status</p>
                        <p className="text-lg font-bold text-emerald-600">Operational</p>
                      </div>
                      <Activity className="h-8 w-8 text-emerald-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Scenarios</p>
                        <p className="text-lg font-bold">12</p>
                      </div>
                      <GitBranch className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Simulations Run</p>
                        <p className="text-lg font-bold">47</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Comparisons</p>
                        <p className="text-lg font-bold">8</p>
                      </div>
                      <FileText className="h-8 w-8 text-orange-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <KPIDashboard />
            </TabsContent>

            <TabsContent value="scenarios">
              <ScenarioManager />
            </TabsContent>

            <TabsContent value="policies">
              <PolicyDefinition />
            </TabsContent>

            <TabsContent value="population">
              <PopulationModeling />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Configuration</CardTitle>
                  <CardDescription>Configure simulation parameters and system settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Default Time Horizon</label>
                      <select className="w-full px-3 py-2 border rounded-md">
                        <option>6 months</option>
                        <option selected>12 months</option>
                        <option>24 months</option>
                        <option>36 months</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Economic Growth Rate</label>
                      <select className="w-full px-3 py-2 border rounded-md">
                        <option>1%</option>
                        <option selected>3%</option>
                        <option>5%</option>
                      </select>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cache Settings</label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" /> Clear Cache
                      </Button>
                      <span className="text-xs text-muted-foreground">Last cleared: 2 hours ago</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Export Settings</label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" /> Export All Data
                      </Button>
                      <Button variant="outline" size="sm">Import Data</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Background Services</CardTitle>
                  <CardDescription>Status of simulation and processing services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Simulation Engine</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Running on port 3003</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Database (SQLite)</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Cache System</span>
                      </div>
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Digital Policy Sandbox v1.0</strong></p>
                    <p>A comprehensive system for simulating and comparing the impact of policy changes before activation.</p>
                    <Separator className="my-4" />
                    <p><strong>Technology Stack:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Next.js 16 with App Router</li>
                      <li>Prisma ORM with SQLite</li>
                      <li>Socket.io for real-time updates</li>
                      <li>Recharts for visualizations</li>
                      <li>In-memory caching with tag invalidation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Digital Policy Sandbox - Policy Impact Simulation System</p>
            <div className="flex items-center gap-4">
              <span>Multi-tenant Ready</span>
              <span>RBAC Enabled</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
