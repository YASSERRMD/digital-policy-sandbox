'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, Plus, Save, Trash2, Copy, History, 
  DollarSign, Calendar, Search, Percent, Clock,
  AlertCircle, CheckCircle, Archive
} from 'lucide-react';
import type { Policy, PolicyParameters } from './types';

interface PolicyDefinitionProps {
  onPolicySelect?: (policy: Policy) => void;
}

export function PolicyDefinition({ onPolicySelect }: PolicyDefinitionProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'fines',
    status: 'draft',
    parameters: {
      fineAmount: 100,
      permitDuration: 365,
      inspectionFrequency: 4,
      taxRate: 2.5,
      feeAmount: 50,
      penaltyRate: 5,
      gracePeriod: 14,
      renewalPeriod: 30,
    } as PolicyParameters,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedPolicy) {
        const response = await fetch(`/api/policies/${selectedPolicy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const updated = await response.json();
        setPolicies(policies.map(p => p.id === updated.id ? updated : p));
        setSelectedPolicy(updated);
      } else {
        const response = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const newPolicy = await response.json();
        setPolicies([...policies, newPolicy]);
        setSelectedPolicy(newPolicy);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving policy:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await fetch(`/api/policies/${id}`, { method: 'DELETE' });
      setPolicies(policies.filter(p => p.id !== id));
      if (selectedPolicy?.id === id) {
        setSelectedPolicy(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  const handleNew = () => {
    setSelectedPolicy(null);
    setIsEditing(true);
    setFormData({
      name: '',
      code: '',
      description: '',
      category: 'fines',
      status: 'draft',
      parameters: {
        fineAmount: 100,
        permitDuration: 365,
        inspectionFrequency: 4,
        taxRate: 2.5,
        feeAmount: 50,
        penaltyRate: 5,
        gracePeriod: 14,
        renewalPeriod: 30,
      },
    });
  };

  const handleSelect = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsEditing(false);
    setFormData({
      name: policy.name,
      code: policy.code,
      description: policy.description || '',
      category: policy.category,
      status: policy.status,
      parameters: policy.currentVersion?.parameters || formData.parameters,
    });
    onPolicySelect?.(policy);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fines': return <DollarSign className="h-4 w-4" />;
      case 'permits': return <FileText className="h-4 w-4" />;
      case 'inspections': return <Search className="h-4 w-4" />;
      case 'taxation': return <Percent className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'draft':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'archived':
        return <Badge variant="outline"><Archive className="h-3 w-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading policies...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Policy List */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Policies</CardTitle>
            <CardDescription>Manage policy definitions</CardDescription>
          </div>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-2">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPolicy?.id === policy.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelect(policy)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(policy.category)}
                      <span className="font-medium text-sm">{policy.name}</span>
                    </div>
                    {getStatusBadge(policy.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {policy.code} • {policy.category}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Policy Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {isEditing ? (selectedPolicy ? 'Edit Policy' : 'New Policy') : 'Policy Details'}
              </CardTitle>
              <CardDescription>
                {selectedPolicy ? selectedPolicy.code : 'Create a new policy definition'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedPolicy && !isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(selectedPolicy.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="history">Version History</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Traffic Fine Policy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Policy Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., POL-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Brief description of the policy"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fines">Fines & Penalties</SelectItem>
                      <SelectItem value="permits">Permits & Licenses</SelectItem>
                      <SelectItem value="inspections">Inspections</SelectItem>
                      <SelectItem value="taxation">Taxation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="parameters" className="space-y-6">
              {formData.category === 'fines' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Fine Amount</Label>
                      <span className="text-sm font-medium">${formData.parameters.fineAmount}</span>
                    </div>
                    <Slider
                      value={[formData.parameters.fineAmount || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, fineAmount: value }
                        })
                      }
                      max={1000}
                      step={10}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Penalty Rate (%)</Label>
                      <span className="text-sm font-medium">{formData.parameters.penaltyRate}%</span>
                    </div>
                    <Slider
                      value={[formData.parameters.penaltyRate || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, penaltyRate: value }
                        })
                      }
                      max={50}
                      step={1}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Grace Period (days)</Label>
                      <span className="text-sm font-medium">{formData.parameters.gracePeriod} days</span>
                    </div>
                    <Slider
                      value={[formData.parameters.gracePeriod || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, gracePeriod: value }
                        })
                      }
                      max={60}
                      step={1}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}

              {formData.category === 'permits' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Permit Duration</Label>
                      <span className="text-sm font-medium">{formData.parameters.permitDuration} days</span>
                    </div>
                    <Slider
                      value={[formData.parameters.permitDuration || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, permitDuration: value }
                        })
                      }
                      max={730}
                      step={30}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Fee Amount</Label>
                      <span className="text-sm font-medium">${formData.parameters.feeAmount}</span>
                    </div>
                    <Slider
                      value={[formData.parameters.feeAmount || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, feeAmount: value }
                        })
                      }
                      max={500}
                      step={10}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Renewal Period (days)</Label>
                      <span className="text-sm font-medium">{formData.parameters.renewalPeriod} days</span>
                    </div>
                    <Slider
                      value={[formData.parameters.renewalPeriod || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, renewalPeriod: value }
                        })
                      }
                      max={90}
                      step={5}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}

              {formData.category === 'inspections' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Inspection Frequency (per year)</Label>
                      <span className="text-sm font-medium">{formData.parameters.inspectionFrequency}x</span>
                    </div>
                    <Slider
                      value={[formData.parameters.inspectionFrequency || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, inspectionFrequency: value }
                        })
                      }
                      max={12}
                      step={1}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Violation Fine</Label>
                      <span className="text-sm font-medium">${formData.parameters.fineAmount}</span>
                    </div>
                    <Slider
                      value={[formData.parameters.fineAmount || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, fineAmount: value }
                        })
                      }
                      max={2000}
                      step={50}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}

              {formData.category === 'taxation' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tax Rate</Label>
                      <span className="text-sm font-medium">{formData.parameters.taxRate}%</span>
                    </div>
                    <Slider
                      value={[formData.parameters.taxRate || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, taxRate: value }
                        })
                      }
                      max={10}
                      step={0.1}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Late Payment Penalty (%)</Label>
                      <span className="text-sm font-medium">{formData.parameters.penaltyRate}%</span>
                    </div>
                    <Slider
                      value={[formData.parameters.penaltyRate || 0]}
                      onValueChange={([value]) => 
                        setFormData({
                          ...formData,
                          parameters: { ...formData.parameters, penaltyRate: value }
                        })
                      }
                      max={25}
                      step={0.5}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Version History</h4>
                {isEditing && (
                  <Button size="sm" variant="outline">
                    <History className="h-4 w-4 mr-1" /> Create New Version
                  </Button>
                )}
              </div>
              {selectedPolicy?.currentVersion ? (
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>Version {selectedPolicy.currentVersion.version}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(selectedPolicy.currentVersion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedPolicy.currentVersion.changeLog || 'No changelog provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No version history available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
