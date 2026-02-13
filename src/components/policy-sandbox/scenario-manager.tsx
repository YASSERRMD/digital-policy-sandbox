'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  GitBranch, Play, Copy, Trash2, Plus, GitCompare, 
  Download, TrendingUp, TrendingDown, Minus, Clock, 
  CheckCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import type { Scenario, Simulation, SimulationMetric, ComparisonResult, MetricDelta } from './types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ScenarioManager() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSimulation, setRunningSimulation] = useState(false);

  // Comparison state
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Clone dialog state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedScenario) {
      fetchScenarioSimulations(selectedScenario.id);
    }
  }, [selectedScenario]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/scenarios');
      const data = await response.json();
      setScenarios(data);
      if (data.length > 0) {
        const baseline = data.find((s: Scenario) => s.isBaseline);
        setSelectedScenario(baseline || data[0]);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarioSimulations = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/simulations?scenarioId=${scenarioId}`);
      const data = await response.json();
      setSimulations(data);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    }
  };

  const runSimulation = async () => {
    if (!selectedScenario) return;
    
    setRunningSimulation(true);

    try {
      // Create and run simulation (synchronous)
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          config: {
            timeHorizon: 12,
            includeSeasonality: true,
            populationGrowth: 2,
            economicGrowth: 3,
          },
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Refresh simulations list
      await fetchScenarioSimulations(selectedScenario.id);
      
      // Refresh scenarios to update status
      await fetchData();
      
    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Failed to run simulation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRunningSimulation(false);
    }
  };

  const cloneScenario = async () => {
    if (!selectedScenario || !cloneName) return;
    
    try {
      const response = await fetch(`/api/scenarios/${selectedScenario.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cloneName }),
      });
      
      const newScenario = await response.json();
      setScenarios([...scenarios, newScenario]);
      setCloneDialogOpen(false);
      setCloneName('');
    } catch (error) {
      console.error('Error cloning scenario:', error);
    }
  };

  const deleteScenario = async (id: string) => {
    if (!confirm('Delete this scenario?')) return;
    
    try {
      await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
      setScenarios(scenarios.filter(s => s.id !== id));
      if (selectedScenario?.id === id) {
        setSelectedScenario(scenarios[0] || null);
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
    }
  };

  const createComparison = async () => {
    if (selectedForComparison.length < 1) return;
    
    try {
      const baseline = scenarios.find(s => s.isBaseline);
      if (!baseline) return;
      
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Comparison ${new Date().toLocaleDateString()}`,
          baselineScenarioId: baseline.id,
          scenarioIds: selectedForComparison,
        }),
      });
      
      const comparison = await response.json();
      fetchComparisonResults(comparison.id);
      setCompareDialogOpen(false);
      setSelectedForComparison([]);
    } catch (error) {
      console.error('Error creating comparison:', error);
    }
  };

  const fetchComparisonResults = async (comparisonId: string) => {
    try {
      const response = await fetch(`/api/comparisons/${comparisonId}?includeMetrics=true`);
      const data = await response.json();
      setComparisonResult(data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Scenario Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <GitCompare className="h-4 w-4 mr-1" /> Compare
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compare Scenarios</DialogTitle>
                <DialogDescription>Select scenarios to compare against baseline</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {scenarios.filter(s => !s.isBaseline).map((scenario) => (
                  <div key={scenario.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={scenario.id}
                      checked={selectedForComparison.includes(scenario.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedForComparison([...selectedForComparison, scenario.id]);
                        } else {
                          setSelectedForComparison(selectedForComparison.filter(id => id !== scenario.id));
                        }
                      }}
                    />
                    <label htmlFor={scenario.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {scenario.name}
                    </label>
                  </div>
                ))}
                {scenarios.filter(s => !s.isBaseline).length === 0 && (
                  <p className="text-sm text-muted-foreground">No alternative scenarios to compare. Clone the baseline first.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompareDialogOpen(false)}>Cancel</Button>
                <Button onClick={createComparison} disabled={selectedForComparison.length === 0}>
                  Create Comparison
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Scenarios</CardTitle>
            <CardDescription>{scenarios.length} scenarios</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-2">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScenario?.id === scenario.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {scenario.isBaseline && <Badge variant="default" className="text-xs">Baseline</Badge>}
                        <span className="font-medium text-sm">{scenario.name}</span>
                      </div>
                      {!scenario.isBaseline && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{scenario.status}</Badge>
                      {scenario._count && (
                        <span>{scenario._count.simulations} simulations</span>
                      )}
                    </div>
                    {scenario.parentScenario && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <GitBranch className="h-3 w-3 inline mr-1" />
                        From: {scenario.parentScenario.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Scenario Details & Simulation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedScenario?.name || 'Select a Scenario'}</CardTitle>
                <CardDescription>{selectedScenario?.description}</CardDescription>
              </div>
              {selectedScenario && (
                <div className="flex gap-2">
                  <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-1" /> Clone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Clone Scenario</DialogTitle>
                        <DialogDescription>Create a copy of this scenario</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>New Scenario Name</Label>
                          <Input
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            placeholder={`${selectedScenario.name} (Copy)`}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
                        <Button onClick={cloneScenario} disabled={!cloneName}>Clone</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" onClick={runSimulation} disabled={runningSimulation}>
                    {runningSimulation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" /> Run Simulation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="policies">
              <TabsList>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="simulations">Simulations</TabsTrigger>
                <TabsTrigger value="branches">Branches</TabsTrigger>
              </TabsList>
              
              <TabsContent value="policies" className="space-y-2 mt-4">
                {selectedScenario?.policies?.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{sp.policy.name}</p>
                      <p className="text-xs text-muted-foreground">{sp.policy.category}</p>
                    </div>
                    <Badge>v{sp.policyVersion.version}</Badge>
                  </div>
                ))}
                {(!selectedScenario?.policies || selectedScenario.policies.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">No policies configured</div>
                )}
              </TabsContent>
              
              <TabsContent value="simulations" className="space-y-2 mt-4">
                {simulations.map((sim) => (
                  <div key={sim.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sim.status)}
                      <div>
                        <p className="font-medium capitalize">{sim.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sim.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sim.duration && (
                        <Badge variant="outline">{(sim.duration / 1000).toFixed(1)}s</Badge>
                      )}
                      {sim._count && (
                        <Badge variant="outline">{sim._count.metrics} metrics</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {simulations.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No simulations yet. Click "Run Simulation" to start.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="branches" className="space-y-2 mt-4">
                {selectedScenario?.childScenarios?.map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{child.name}</span>
                    </div>
                    <Badge variant="outline">{child.status}</Badge>
                  </div>
                ))}
                {(!selectedScenario?.childScenarios || selectedScenario.childScenarios.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No branches. Clone this scenario to create a branch.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Scenario Comparison</CardTitle>
                <CardDescription>Comparing against baseline: {comparisonResult.comparison.baselineScenario.name}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setComparisonResult(null)}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparisonResult.scenarios && comparisonResult.scenarios.length > 0 ? (
                comparisonResult.scenarios.map((scenario, idx) => (
                  <div key={scenario.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <h4 className="font-semibold">{scenario.name}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {scenario.delta && scenario.delta.slice(0, 4).map((d: MetricDelta) => (
                        <div key={d.name} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{d.displayName}</span>
                            {getDeltaIcon(d.delta)}
                          </div>
                          <div className="text-lg font-bold">
                            {d.unit === 'currency' ? formatCurrency(d.scenario) : `${d.scenario.toFixed(1)}${d.unit === 'percentage' ? '%' : ''}`}
                          </div>
                          <div className={`text-xs ${d.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {d.delta > 0 ? '+' : ''}{d.percentChange.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No comparison data available. Make sure you have run simulations on both baseline and compared scenarios.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
