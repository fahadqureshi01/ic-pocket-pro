import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Search,
  Plus,
  Wrench,
  Cpu,
  Smartphone,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  activeRepairs: number;
  categoriesCount: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    activeRepairs: 0,
    categoriesCount: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total items count
      const { count: totalItems } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch low stock items
      const { data: lowStockData, count: lowStockCount } = await supabase
        .from('inventory_items')
        .select('*, categories(name, color), pouches(pouch_number)', { count: 'exact' })
        .lte('current_stock', 'min_stock_level')
        .eq('is_active', true)
        .order('current_stock', { ascending: true })
        .limit(5);

      // Fetch active repairs count
      const { count: activeRepairs } = await supabase
        .from('repair_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'IN_PROGRESS']);

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      // Fetch recent items
      const { data: recentData } = await supabase
        .from('inventory_items')
        .select('*, categories(name, color), pouches(pouch_number)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalItems: totalItems || 0,
        lowStockItems: lowStockCount || 0,
        activeRepairs: activeRepairs || 0,
        categoriesCount: categoriesCount || 0
      });

      setLowStockItems(lowStockData || []);
      setRecentItems(recentData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const { data } = await supabase
        .from('inventory_items')
        .select('*, categories(name, color), pouches(pouch_number)')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);
      
      console.log('Search results:', data);
      // TODO: Show search results in a modal or separate component
    } catch (error) {
      console.error('Error searching items:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Electronics Repair Lab</h1>
          <p className="text-muted-foreground">Manage your inventory and repairs efficiently</p>
        </div>
        <div className="flex gap-2">
          <Button className="tech-glow transition-smooth">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button variant="outline">
            <Wrench className="h-4 w-4 mr-2" />
            New Repair
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <Card className="card-shadow">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search items by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} className="transition-smooth">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow transition-smooth hover:tech-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card className="card-shadow transition-smooth hover:tech-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card className="card-shadow transition-smooth hover:tech-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Repairs</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeRepairs}</div>
            <p className="text-xs text-muted-foreground">Jobs in progress</p>
          </CardContent>
        </Card>

        <Card className="card-shadow transition-smooth hover:tech-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">Item categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Items */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Recent Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg transition-smooth hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.categories?.color || '#3B82F6' }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pouch #{item.pouches?.pouch_number} • Stock: {item.current_stock}
                    </p>
                  </div>
                  <Badge variant={item.current_stock <= item.min_stock_level ? "destructive" : "default"}>
                    {item.categories?.name}
                  </Badge>
                </div>
              ))}
              {recentItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pouch #{item.pouches?.pouch_number} • Only {item.current_stock} left
                    </p>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning">
                    Restock
                  </Badge>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">All items are well stocked! 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}