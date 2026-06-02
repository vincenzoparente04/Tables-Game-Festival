export interface TokenPayload {
    id: number
    role: string
    type?: 'access' | 'refresh' // distinguishes access vs refresh tokens
    iat?: number // issued at
    exp?: number // expiration
}