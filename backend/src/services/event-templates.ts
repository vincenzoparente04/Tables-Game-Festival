// Default resource types / pricing provisioned when an event is created from a
// template. These are just sensible STARTERS — the organizer freely edits,
// adds or removes resources afterwards (no locked festival preset).

export interface ResourceTypeTemplate {
  key: string
  label: string
  unit: string
}

export interface PricingTierTemplate {
  name: string
  resource_type_key: string
  unit_price?: number
  price_per_sqm?: number
}

export interface EventTemplate {
  resource_types: ResourceTypeTemplate[]
  pricing_tiers?: PricingTierTemplate[]
}

const TEMPLATES: Record<string, EventTemplate> = {
  festival: {
    resource_types: [
      { key: 'standard_table', label: 'Standard table', unit: 'table' },
      { key: 'large_table', label: 'Large table', unit: 'table' },
    ],
    pricing_tiers: [
      { name: 'Standard table', resource_type_key: 'standard_table', unit_price: 0 },
      { name: 'Large table', resource_type_key: 'large_table', unit_price: 0 },
    ],
  },
  fair: {
    resource_types: [{ key: 'stand', label: 'Stand', unit: 'sqm' }],
    pricing_tiers: [{ name: 'Stand (per m²)', resource_type_key: 'stand', price_per_sqm: 0 }],
  },
  concert: { resource_types: [{ key: 'seat', label: 'Seat', unit: 'seat' }] },
  conference: { resource_types: [{ key: 'seat', label: 'Seat', unit: 'seat' }] },
  dinner: { resource_types: [{ key: 'seat', label: 'Seat', unit: 'seat' }] },
}

export function getEventTemplate(typeKey: string): EventTemplate | null {
  return TEMPLATES[typeKey] ?? null
}
