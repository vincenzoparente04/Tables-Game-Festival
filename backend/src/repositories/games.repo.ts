import pool from '../db/database.js'
import { deleteById, findById, listAll, updateById } from './crud.js'
import type { AuthorRow } from './authors.repo.js'

export interface GameRow {
  id: number
  publisher_id: number | null
  name: string
  category: string | null
  min_age: number | null
  max_age: number | null
  min_players: number | null
  max_players: number | null
  table_size: string | null
  average_duration: number | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GameWithAuthors extends GameRow {
  authors: AuthorRow[]
}

export interface CreateGameInput {
  publisher_id?: number
  name: string
  category?: string
  min_age?: number
  max_age?: number
  min_players?: number
  max_players?: number
  table_size?: string
  average_duration?: number
  attributes?: Record<string, unknown>
  author_ids?: number[]
}

export type UpdateGameInput = Partial<CreateGameInput>

const TABLE = 'games'
const UPDATABLE = [
  'publisher_id', 'name', 'category', 'min_age', 'max_age',
  'min_players', 'max_players', 'table_size', 'average_duration', 'attributes',
] as const

export const listGames = () => listAll<GameRow>(TABLE, 'name')
export const deleteGame = (id: number) => deleteById(TABLE, id)

async function getGameAuthors(gameId: number): Promise<AuthorRow[]> {
  const { rows } = await pool.query<AuthorRow>(
    `SELECT a.* FROM game_authors ga JOIN authors a ON a.id = ga.author_id
      WHERE ga.game_id = $1 ORDER BY a.last_name`,
    [gameId],
  )
  return rows
}

export async function getGame(id: number): Promise<GameWithAuthors | null> {
  const game = await findById<GameRow>(TABLE, id)
  if (!game) return null
  return { ...game, authors: await getGameAuthors(id) }
}

export async function createGame(input: CreateGameInput): Promise<GameWithAuthors> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<GameRow>(
      `INSERT INTO games
         (publisher_id, name, category, min_age, max_age, min_players, max_players, table_size, average_duration, attributes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10,'{}'::jsonb))
       RETURNING *`,
      [
        input.publisher_id ?? null, input.name, input.category ?? null,
        input.min_age ?? null, input.max_age ?? null, input.min_players ?? null,
        input.max_players ?? null, input.table_size ?? null,
        input.average_duration ?? null, input.attributes ?? null,
      ],
    )
    const game = rows[0]!
    for (const authorId of input.author_ids ?? []) {
      await client.query(
        'INSERT INTO game_authors (game_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [game.id, authorId],
      )
    }
    await client.query('COMMIT')
    return { ...game, authors: await getGameAuthors(game.id) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateGame(id: number, input: UpdateGameInput): Promise<GameWithAuthors | null> {
  const { author_ids, ...fields } = input
  const game = await updateById<GameRow>(TABLE, UPDATABLE, id, fields)
  if (!game) return null
  if (author_ids !== undefined) {
    await pool.query('DELETE FROM game_authors WHERE game_id = $1', [id])
    for (const authorId of author_ids) {
      await pool.query(
        'INSERT INTO game_authors (game_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, authorId],
      )
    }
  }
  return { ...game, authors: await getGameAuthors(id) }
}
