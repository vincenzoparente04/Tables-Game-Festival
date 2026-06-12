import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface ArtistRow {
  id: number
  name: string
  kind: string
  bio: string | null
  image_url: string | null
  links: Record<string, unknown>
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateArtistInput {
  name: string
  kind?: string
  bio?: string
  image_url?: string
  links?: Record<string, unknown>
  attributes?: Record<string, unknown>
}

export type UpdateArtistInput = Partial<CreateArtistInput>

const TABLE = 'artists'
const UPDATABLE = ['name', 'kind', 'bio', 'image_url', 'links', 'attributes'] as const

export async function listArtists(kind?: string, search?: string): Promise<ArtistRow[]> {
  const { rows } = await pool.query<ArtistRow>(
    `SELECT * FROM artists
      WHERE ($1::text IS NULL OR kind = $1)
        AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
      ORDER BY name`,
    [kind ?? null, search ?? null],
  )
  return rows
}

export const getArtist = (id: number) => findById<ArtistRow>(TABLE, id)
export const updateArtist = (id: number, input: UpdateArtistInput) =>
  updateById<ArtistRow>(TABLE, UPDATABLE, id, input)
export const deleteArtist = (id: number) => deleteById(TABLE, id)

export async function createArtist(input: CreateArtistInput): Promise<ArtistRow> {
  const { rows } = await pool.query<ArtistRow>(
    `INSERT INTO artists (name, kind, bio, image_url, links, attributes)
     VALUES ($1, COALESCE($2,'musician'), $3, $4, COALESCE($5,'{}'::jsonb), COALESCE($6,'{}'::jsonb))
     RETURNING *`,
    [
      input.name, input.kind ?? null, input.bio ?? null,
      input.image_url ?? null, input.links ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
