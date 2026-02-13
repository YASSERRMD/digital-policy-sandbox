'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Building2, Plus, Save, Trash2, 
  TrendingUp, TrendingDown, Percent, DollarSign
} from 'lucide-react';
import type { CitizenGroup, BusinessCategory } from './types';

export function PopulationModeling() {
  const [citizenGroups, setCitizenGroups] = useState<CitizenGroup[]>([]);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('citizens');

  // Form states
  const [editingCitizen, setEditingCitizen] = useState<CitizenGroup | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<BusinessCategory | null>(null);

  const [citizenForm, setCitizenForm] = useState({
    name: '',
    description: '',
    population: 10000,
    complianceRate: 0.8,
    demographics: { averageIncome: 40000, permitEligibility: 0.75 },
    behaviorRules: { incomeSensitivity: 1.0, policyAwareness: 1.0 },
  });

  const [businessForm, setBusinessForm] = useState({
    name: '',
    description: '',
    count: 100,
    industry: '',
    sizeCategory: 'small',
    complianceRate: 0.85,
    behaviorRules: { averageRevenue: 200000, policyAwareness: 1.0 },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [citizensRes, businessesRes] = await Promise.all([
        fetch('/api/citizen-groups'),
        fetch('/api/business-categories'),
      ]);
      const citizens = await citizensRes.json();
      const businesses = await businessesRes.json();
      setCitizenGroups(citizens);
      setBusinessCategories(businesses);
    } catch (error) {
      console.error('Error fetching population data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCitizen = async () => {
    try {
      if (editingCitizen) {
        const response = await fetch(`/api/citizen-groups/${editingCitizen.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(citizenForm),
        });
        const updated = await response.json();
        setCitizenGroups(citizenGroups.map(c => c.id === updated.id ? updated : c));
      } else {
        const response = await fetch('/api/citizen-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(citizenForm),
        });
        const newGroup = await response.json();
        setCitizenGroups([...citizenGroups, newGroup]);
      }
      setEditingCitizen(null);
      resetCitizenForm();
    } catch (error) {
      console.error('Error saving citizen group:', error);
    }
  };

  const handleSaveBusiness = async () => {
    try {
      if (editingBusiness) {
        const response = await fetch(`/api/business-categories/${editingBusiness.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(businessForm),
        });
        const updated = await response.json();
        setBusinessCategories(businessCategories.map(b => b.id === updated.id ? updated : b));
      } else {
        const response = await fetch('/api/business-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(businessForm),
        });
        const newCategory = await response.json();
        setBusinessCategories([...businessCategories, newCategory]);
      }
      setEditingBusiness(null);
      resetBusinessForm();
    } catch (error) {
      console.error('Error saving business category:', error);
    }
  };

  const handleDeleteCitizen = async (id: string) => {
    if (!confirm('Delete this citizen group?')) return;
    await fetch(`/api/citizen-groups/${id}`, { method: 'DELETE' });
    setCitizenGroups(citizenGroups.filter(c => c.id !== id));
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Delete this business category?')) return;
    await fetch(`/api/business-categories/${id}`, { method: 'DELETE' });
    setBusinessCategories(businessCategories.filter(b => b.id !== id));
  };

  const resetCitizenForm = () => {
    setCitizenForm({
      name: '',
      description: '',
      population: 10000,
      complianceRate: 0.8,
      demographics: { averageIncome: 40000, permitEligibility: 0.75 },
      behaviorRules: { incomeSensitivity: 1.0, policyAwareness: 1.0 },
    });
  };

  const resetBusinessForm = () => {
    setBusinessForm({
      name: '',
      description: '',
      count: 100,
      industry: '',
      sizeCategory: 'small',
      complianceRate: 0.85,
      behaviorRules: { averageRevenue: 200000, policyAwareness: 1.0 },
    });
  };

  const getTotalPopulation = () => citizenGroups.reduce((sum, g) => sum + g.population, 0);
  const getTotalBusinesses = () => businessCategories.reduce((sum, b) => sum + b.count, 0);
  const getAverageCitizenCompliance = () => {
    const total = citizenGroups.reduce((sum, g) => sum + g.population * g.complianceRate, 0);
    return total / getTotalPopulation() || 0;
  };
  const getAverageBusinessCompliance = () => {
    const total = businessCategories.reduce((sum, b) => sum + b.count * b.complianceRate, 0);
    return total / getTotalBusinesses() || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading population data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{getTotalPopulation().toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Citizens</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{getTotalBusinesses().toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Businesses</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{(getAverageCitizenCompliance() * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Citizen Compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-500" />
              <div>
                <div className="text-2xl font-bold">{(getAverageBusinessCompliance() * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Business Compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Citizens and Businesses */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="citizens" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Citizen Groups
          </TabsTrigger>
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Business Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="citizens" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Citizen Groups List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">Groups</CardTitle>
                  <CardDescription>{citizenGroups.length} groups defined</CardDescription>
                </div>
                <Button size="sm" onClick={() => { resetCitizenForm(); setEditingCitizen({ id: 'new' } as CitizenGroup); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1 p-2">
                    {citizenGroups.map((group) => (
                      <div
                        key={group.id}
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setEditingCitizen(group);
                          setCitizenForm({
                            name: group.name,
                            description: group.description || '',
                            population: group.population,
                            complianceRate: group.complianceRate,
                            demographics: group.demographics as Record<string, number>,
                            behaviorRules: group.behaviorRules as Record<string, number> || { incomeSensitivity: 1, policyAwareness: 1 },
                          });
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="outline">{group.population.toLocaleString()}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Compliance: {(group.complianceRate * 100).toFixed(0)}%</span>
                          <span>Avg Income: ${((group.demographics as Record<string, number>)?.averageIncome || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Citizen Group Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingCitizen?.id === 'new' ? 'New Group' : editingCitizen ? 'Edit Group' : 'Group Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingCitizen ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={citizenForm.name}
                          onChange={(e) => setCitizenForm({ ...citizenForm, name: e.target.value })}
                          placeholder="e.g., Young Adults"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Population</Label>
                        <Input
                          type="number"
                          value={citizenForm.population}
                          onChange={(e) => setCitizenForm({ ...citizenForm, population: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={citizenForm.description}
                        onChange={(e) => setCitizenForm({ ...citizenForm, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <Label>Compliance Rate: {(citizenForm.complianceRate * 100).toFixed(0)}%</Label>
                      <Slider
                        value={[citizenForm.complianceRate * 100]}
                        onValueChange={([v]) => setCitizenForm({ ...citizenForm, complianceRate: v / 100 })}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Average Income ($)</Label>
                        <Input
                          type="number"
                          value={citizenForm.demographics.averageIncome}
                          onChange={(e) => setCitizenForm({
                            ...citizenForm,
                            demographics: { ...citizenForm.demographics, averageIncome: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Permit Eligibility (%)</Label>
                        <Input
                          type="number"
                          value={(citizenForm.demographics.permitEligibility * 100).toFixed(0)}
                          onChange={(e) => setCitizenForm({
                            ...citizenForm,
                            demographics: { ...citizenForm.demographics, permitEligibility: parseInt(e.target.value) / 100 }
                          })}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Behavior Modifiers</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Income Sensitivity</span>
                            <span>{citizenForm.behaviorRules.incomeSensitivity.toFixed(1)}x</span>
                          </div>
                          <Slider
                            value={[citizenForm.behaviorRules.incomeSensitivity * 10]}
                            onValueChange={([v]) => setCitizenForm({
                              ...citizenForm,
                              behaviorRules: { ...citizenForm.behaviorRules, incomeSensitivity: v / 10 }
                            })}
                            max={20}
                            step={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Policy Awareness</span>
                            <span>{citizenForm.behaviorRules.policyAwareness.toFixed(1)}x</span>
                          </div>
                          <Slider
                            value={[citizenForm.behaviorRules.policyAwareness * 10]}
                            onValueChange={([v]) => setCitizenForm({
                              ...citizenForm,
                              behaviorRules: { ...citizenForm.behaviorRules, policyAwareness: v / 10 }
                            })}
                            max={20}
                            step={1}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEditingCitizen(null)}>Cancel</Button>
                      <Button onClick={handleSaveCitizen}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a group to edit or create a new one
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="businesses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Business Categories List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">Categories</CardTitle>
                  <CardDescription>{businessCategories.length} categories defined</CardDescription>
                </div>
                <Button size="sm" onClick={() => { resetBusinessForm(); setEditingBusiness({ id: 'new' } as BusinessCategory); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1 p-2">
                    {businessCategories.map((business) => (
                      <div
                        key={business.id}
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setEditingBusiness(business);
                          setBusinessForm({
                            name: business.name,
                            description: business.description || '',
                            count: business.count,
                            industry: business.industry || '',
                            sizeCategory: business.sizeCategory || 'small',
                            complianceRate: business.complianceRate,
                            behaviorRules: business.behaviorRules as Record<string, number> || { averageRevenue: 200000, policyAwareness: 1 },
                          });
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{business.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{business.sizeCategory || 'N/A'}</Badge>
                            <Badge>{business.count}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{business.industry}</span>
                          <span>Compliance: {(business.complianceRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Business Category Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingBusiness?.id === 'new' ? 'New Category' : editingBusiness ? 'Edit Category' : 'Category Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingBusiness ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={businessForm.name}
                          onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                          placeholder="e.g., Small Retail"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Count</Label>
                        <Input
                          type="number"
                          value={businessForm.count}
                          onChange={(e) => setBusinessForm({ ...businessForm, count: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input
                          value={businessForm.industry}
                          onChange={(e) => setBusinessForm({ ...businessForm, industry: e.target.value })}
                          placeholder="e.g., Retail"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Size Category</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={businessForm.sizeCategory}
                          onChange={(e) => setBusinessForm({ ...businessForm, sizeCategory: e.target.value })}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <Label>Compliance Rate: {(businessForm.complianceRate * 100).toFixed(0)}%</Label>
                      <Slider
                        value={[businessForm.complianceRate * 100]}
                        onValueChange={([v]) => setBusinessForm({ ...businessForm, complianceRate: v / 100 })}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Average Revenue ($)</Label>
                      <Input
                        type="number"
                        value={businessForm.behaviorRules.averageRevenue}
                        onChange={(e) => setBusinessForm({
                          ...businessForm,
                          behaviorRules: { ...businessForm.behaviorRules, averageRevenue: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Policy Awareness</span>
                        <span>{businessForm.behaviorRules.policyAwareness.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[businessForm.behaviorRules.policyAwareness * 10]}
                        onValueChange={([v]) => setBusinessForm({
                          ...businessForm,
                          behaviorRules: { ...businessForm.behaviorRules, policyAwareness: v / 10 }
                        })}
                        max={20}
                        step={1}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEditingBusiness(null)}>Cancel</Button>
                      <Button onClick={handleSaveBusiness}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a category to edit or create a new one
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
