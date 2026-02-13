'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  DollarSign, TrendingUp, Clock, Smile, BarChart3, RefreshCw, Loader2
} from 'lucide-react';
import type { Simulation, SimulationMetric } from './types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface MonthlyProjection {
  month: number;
  revenue: number;
  compliance: number;
  workload: number;
  satisfaction: number;
}

export function KPIDashboard() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetric[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchSimulations();
  }, []);

  useEffect(() => {
    if (selectedSimulation) {
      fetchSimulationResults(selectedSimulation.id);
    }
  }, [selectedSimulation]);

  const fetchSimulations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulations?status=completed');
      const data = await response.json();
      setSimulations(data);
      if (data.length > 0) {
        setSelectedSimulation(data[0]);
      } else {
        setSelectedSimulation(null);
        setMetrics([]);
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulationResults = async (simulationId: string) => {
    setLoadingResults(true);
    try {
      const response = await fetch(`/api/simulations/${simulationId}/results?includeDetails=true`);
      const data = await response.json();
      setMetrics(data.metrics || []);
      setMonthlyData(data.monthlyProjections || []);
    } catch (error) {
      console.error('Error fetching simulation results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMetricIcon = (category: string | null) => {
    switch (category) {
      case 'financial': return <DollarSign className="h-4 w-4" />;
      case 'operational': return <Clock className="h-4 w-4" />;
      case 'social': return <Smile className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getMetricColor = (name: string) => {
    if (name.includes('revenue')) return 'text-green-500';
    if (name.includes('compliance')) return 'text-blue-500';
    if (name.includes('workload')) return 'text-orange-500';
    if (name.includes('satisfaction')) return 'text-purple-500';
    return 'text-gray-500';
  };

  // Prepare radar chart data
  const radarData = metrics.slice(0, 6).map(m => ({
    name: m.displayName.replace('Overall ', '').replace(' Rate', '').substring(0, 15),
    value: m.unit === 'percentage' ? m.value : (m.value / Math.max(...metrics.filter(m2 => m2.unit !== 'percentage').map(m2 => m2.value))) * 100,
    fullMark: 100,
  }));

  // Prepare revenue breakdown
  const revenueData = metrics
    .filter(m => m.name.startsWith('revenue_'))
    .map(m => ({
      name: m.displayName.replace('Revenue from ', ''),
      value: m.value,
    }));

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
      {/* Simulation Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={selectedSimulation?.id || ''}
            onValueChange={(value) => {
              const sim = simulations.find(s => s.id === value);
              setSelectedSimulation(sim || null);
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a simulation" />
            </SelectTrigger>
            <SelectContent>
              {simulations.map((sim) => (
                <SelectItem key={sim.id} value={sim.id}>
                  {sim.scenario?.name || sim.id} - {new Date(sim.createdAt).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
            {selectedSimulation && (
              <Badge variant="outline">
                {selectedSimulation.scenario?.isBaseline ? 'Baseline' : 'Scenario'}
              </Badge>
            )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchSimulations}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {loadingResults ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : selectedSimulation && metrics.length > 0 ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics.find(m => m.name === 'revenue')?.value || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(metrics.find(m => m.name === 'compliance_overall')?.value || 0).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Work Hours</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round(metrics.find(m => m.name === 'workload_hours')?.value || 0).toLocaleString()}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(metrics.find(m => m.name === 'satisfaction_overall')?.value || 0).toFixed(0)}
                    </p>
                  </div>
                  <Smile className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Projection</CardTitle>
                <CardDescription>Monthly revenue forecast over simulation period</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance & Satisfaction */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance & Satisfaction Trends</CardTitle>
                <CardDescription>Key performance indicators over time</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="satisfaction" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={revenueData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name.substring(0, 6)} ${(percent * 100).toFixed(0)}%`}
                      >
                        {revenueData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No revenue breakdown
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No performance data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workload Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: 'Inspections', value: metrics.find(m => m.name === 'workload_inspections')?.value || 0 },
                      { name: 'Permits', value: metrics.find(m => m.name === 'workload_permits')?.value || 0 },
                      { name: 'Appeals', value: 50, display: 'Est.' },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Metrics</CardTitle>
              <CardDescription>Complete breakdown of simulation results</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={getMetricColor(metric.name)}>
                          {getMetricIcon(metric.category)}
                        </div>
                        <div>
                          <p className="font-medium">{metric.displayName}</p>
                          <p className="text-xs text-muted-foreground">{metric.category || 'general'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {metric.unit === 'currency' 
                            ? formatCurrency(metric.value)
                            : metric.unit === 'percentage'
                            ? `${metric.value.toFixed(1)}%`
                            : metric.value.toLocaleString()}
                        </p>
                        {metric.unit && (
                          <p className="text-xs text-muted-foreground">{metric.unit}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {simulations.length === 0 
                ? 'No completed simulations yet. Go to Scenarios tab and run a simulation to see results here.'
                : 'Select a simulation to view its results.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
