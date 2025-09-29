import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AddItemDialog } from "./AddItemDialog";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  current_stock: number;
  min_stock_level: number;
  purchase_price: number;
  selling_price: number;
  supplier: string;
  categories: { name: string; color: string } | null;
  pouches: { pouch_number: number } | null;
  created_at: string;
}

export function InventoryTable() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, categoryFilter, stockFilter]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          categories(name, color),
          pouches(pouch_number)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.categories?.name === categoryFilter);
    }

    // Stock filter
    if (stockFilter === "low") {
      filtered = filtered.filter(item => item.current_stock <= item.min_stock_level);
    } else if (stockFilter === "out") {
      filtered = filtered.filter(item => item.current_stock === 0);
    }

    setFilteredItems(filtered);
  };

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (current <= min) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-8 text-center">
          <Package className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
          <p>Loading inventory...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Inventory Management
          </div>
          <AddItemDialog onItemAdded={fetchItems} />
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery || categoryFilter !== "all" || stockFilter !== "all" 
                ? "No items found matching your filters" 
                : "No items in inventory yet"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Pouch</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item.current_stock, item.min_stock_level);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.categories && (
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: item.categories.color,
                              color: item.categories.color 
                            }}
                          >
                            {item.categories.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.current_stock <= item.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <span className={
                            item.current_stock === 0 ? "text-destructive font-medium" :
                            item.current_stock <= item.min_stock_level ? "text-warning font-medium" :
                            "text-success font-medium"
                          }>
                            {item.current_stock}
                          </span>
                          <span className="text-muted-foreground">/ {item.min_stock_level}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.pouches && (
                          <Badge variant="secondary">
                            #{item.pouches.pouch_number}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.selling_price ? (
                          <span className="font-medium">${item.selling_price.toFixed(2)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}