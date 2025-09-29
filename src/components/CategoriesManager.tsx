import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FolderOpen, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  item_count?: number;
}

const ICON_OPTIONS = [
  { value: "Cpu", label: "CPU" },
  { value: "Smartphone", label: "Phone" },
  { value: "Cable", label: "Cable" },
  { value: "Zap", label: "Electric" },
  { value: "Activity", label: "Activity" },
  { value: "Wrench", label: "Tools" },
  { value: "HardDrive", label: "Storage" },
  { value: "Monitor", label: "Display" },
  { value: "Battery", label: "Battery" },
  { value: "Wifi", label: "Wireless" }
];

const COLOR_OPTIONS = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
  "#EF4444", "#6B7280", "#EC4899", "#14B8A6",
  "#F97316", "#84CC16", "#6366F1", "#EAB308"
];

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Package",
    color: "#3B82F6"
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          inventory_items(count)
        `)
        .order('name');

      if (error) throw error;
      
      const categoriesWithCount = data?.map(category => ({
        ...category,
        item_count: category.inventory_items[0]?.count || 0
      })) || [];

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        
        toast({
          title: "Category Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: "Category Created",
          description: `${formData.name} has been created successfully.`,
        });
      }

      setDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", description: "", icon: "Package", color: "#3B82F6" });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "Failed to save category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "Package",
      color: category.color || "#3B82F6"
    });
    setDialogOpen(true);
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Category Deleted",
        description: `${categoryName} has been deleted successfully.`,
      });

      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", icon: "Package", color: "#3B82F6" });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-8 text-center">
          <FolderOpen className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
          <p>Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Categories Management
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="tech-glow transition-smooth">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Create New Category"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., ICs & Processors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of this category..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ICON_OPTIONS.map((icon) => (
                        <Button
                          key={icon.value}
                          type="button"
                          variant={formData.icon === icon.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, icon: icon.value }))}
                          className="h-10"
                        >
                          {icon.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                          className={`h-10 border-2 ${formData.color === color ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: color, borderColor: color }}
                        >
                          <span className="sr-only">{color}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategory ? "Update" : "Create"} Category
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No categories created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="transition-smooth hover:tech-glow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <Badge variant="secondary">
                          {category.item_count} items
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(category.id, category.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}