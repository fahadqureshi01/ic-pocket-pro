-- Create categories table for organizing repair items
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- For storing lucide icon names
  color TEXT DEFAULT '#3B82F6', -- Hex color for category theming
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pouches table for physical organization
CREATE TABLE public.pouches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pouch_number SERIAL UNIQUE NOT NULL,
  label TEXT,
  description TEXT,
  location TEXT, -- Physical location/shelf info
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_items table for storing all repair items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  pouch_id UUID REFERENCES public.pouches(id) ON DELETE SET NULL,
  sku TEXT UNIQUE, -- Stock Keeping Unit
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5, -- For low stock alerts
  purchase_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  supplier TEXT,
  notes TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_movements table for tracking inventory changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT, -- Could be repair job ID, supplier invoice, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repair_jobs table for tracking repairs
CREATE TABLE public.repair_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number SERIAL UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  device_type TEXT NOT NULL,
  device_model TEXT,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_items table for linking items used in repairs
CREATE TABLE public.job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now, can be restricted later with user management)
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on pouches" ON public.pouches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on repair_jobs" ON public.repair_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on job_items" ON public.job_items FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pouches_updated_at BEFORE UPDATE ON public.pouches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_repair_jobs_updated_at BEFORE UPDATE ON public.repair_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically assign pouch when adding items
CREATE OR REPLACE FUNCTION public.auto_assign_pouch()
RETURNS TRIGGER AS $$
DECLARE
  available_pouch_id UUID;
BEGIN
  -- If no pouch is assigned, find or create one
  IF NEW.pouch_id IS NULL THEN
    -- Try to find an existing pouch with space (assuming max 10 items per pouch)
    SELECT p.id INTO available_pouch_id
    FROM public.pouches p
    LEFT JOIN public.inventory_items i ON p.id = i.pouch_id
    GROUP BY p.id
    HAVING COUNT(i.id) < 10
    ORDER BY p.pouch_number ASC
    LIMIT 1;
    
    -- If no available pouch found, create a new one
    IF available_pouch_id IS NULL THEN
      INSERT INTO public.pouches (label) 
      VALUES ('Auto-assigned Pouch') 
      RETURNING id INTO available_pouch_id;
    END IF;
    
    NEW.pouch_id = available_pouch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto pouch assignment
CREATE TRIGGER auto_assign_pouch_trigger BEFORE INSERT ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.auto_assign_pouch();

-- Function to update stock on item usage
CREATE OR REPLACE FUNCTION public.update_stock_on_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease stock when item is used in a repair job
  UPDATE public.inventory_items 
  SET current_stock = current_stock - NEW.quantity_used
  WHERE id = NEW.item_id;
  
  -- Create stock movement record
  INSERT INTO public.stock_movements (item_id, movement_type, quantity, reason, reference_id)
  VALUES (NEW.item_id, 'OUT', NEW.quantity_used, 'Used in repair job', NEW.job_id::TEXT);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for stock updates
CREATE TRIGGER update_stock_on_usage_trigger AFTER INSERT ON public.job_items FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_usage();

-- Insert default categories
INSERT INTO public.categories (name, description, icon, color) VALUES
('ICs & Processors', 'Integrated circuits, processors, and chips', 'Cpu', '#3B82F6'),
('Mobile Parts', 'Phone components, screens, batteries', 'Smartphone', '#10B981'),
('Connectors', 'USB ports, charging connectors, audio jacks', 'Cable', '#F59E0B'),
('Capacitors', 'Various capacitors and electrical components', 'Zap', '#8B5CF6'),
('Resistors', 'Resistors and electrical resistance components', 'Activity', '#EF4444'),
('Tools', 'Repair tools and equipment', 'Wrench', '#6B7280');

-- Insert some sample pouches
INSERT INTO public.pouches (label, description, location) VALUES
('Pouch A1', 'Small components storage', 'Shelf A, Row 1'),
('Pouch A2', 'Medium components storage', 'Shelf A, Row 2'),
('Pouch B1', 'Large components storage', 'Shelf B, Row 1');