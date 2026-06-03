import pool from '../db/database.js'
import { deleteById, findById, listByEvent, updateById } from './crud.js'

export interface PricingTierRow {
  id: number
  event_id: number
  name: string
  resource_type_id: number | null
  area_id: number | null
  unit_price: string
  price_per_sqm: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePricingTierInput {
  event_id: number
  name: string
  resource_type_id?: number
  area_id?: number
  unit_price?: number
  price_per_sqm?: number
  attributes?: Record<string, unknown>
}

export type UpdatePricingTierInput = Partial<Omit<CreatePricingTierInput, 'event_id'>>

const TABLE = 'pricing_tiers'
const UPDATABLE = ['name', 'resource_type_id', 'area_id', 'unit_price', 'price_per_sqm', 'attributes'] as const

export const listPricingTiers = (eventId?: number) => listByEvent<PricingTierRow>(TABLE, eventId)
export const getPricingTier = (id: number) => findById<PricingTierRow>(TABLE, id)
export const updatePricingTier = (id: number, input: UpdatePricingTierInput) =>
  updateById<PricingTierRow>(TABLE, UPDATABLE, id, input)
export const deletePricingTier = (id: number) => deleteById(TABLE, id)

export async function createPricingTier(input: CreatePricingTierInput): Promise<PricingTierRow> {
  const { rows } = await pool.query<PricingTierRow>(
    `INSERT INTO pricing_tiers (event_id, name, resource_type_id, area_id, unit_price, price_per_sqm, attributes)
     VALUES ($1, $2, $3, $4, COALESCE($5,0), $6, COALESCE($7,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.name, input.resource_type_id ?? null, input.area_id ?? null,
      input.unit_price ?? null, input.price_per_sqm ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
