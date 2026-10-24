CREATE TABLE IF NOT EXISTS public.pos_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  item_id UUID
    REFERENCES public.items(id),

  menu_code VARCHAR(50) NOT NULL UNIQUE,
  menu_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),

  price NUMERIC(18, 2) NOT NULL
    CHECK (price >= 0),

  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_menu_items_visible
ON public.pos_menu_items(is_visible);

CREATE TABLE IF NOT EXISTS public.pos_menu_item_bom_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  menu_item_id UUID NOT NULL
    REFERENCES public.pos_menu_items(id)
    ON DELETE CASCADE,

  component_item_id UUID NOT NULL
    REFERENCES public.items(id),

  quantity_per_menu NUMERIC(14, 4) NOT NULL
    CHECK (quantity_per_menu > 0),

  tolerance_percent NUMERIC(5, 2) NOT NULL DEFAULT 3
    CHECK (tolerance_percent >= 0 AND tolerance_percent <= 3),

  is_fixed_quantity BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (menu_item_id, component_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_menu_item_bom_components_menu_item_id
ON public.pos_menu_item_bom_components(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_pos_menu_item_bom_components_component_item_id
ON public.pos_menu_item_bom_components(component_item_id);

DROP TRIGGER IF EXISTS trg_pos_menu_item_bom_components_touch_updated_at
ON public.pos_menu_item_bom_components;

CREATE TRIGGER trg_pos_menu_item_bom_components_touch_updated_at
BEFORE UPDATE ON public.pos_menu_item_bom_components
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
