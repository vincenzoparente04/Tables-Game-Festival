export interface TokenPayload {
    id: number
    role: string
    type?: 'access' | 'refresh' // distinguishes access vs refresh tokens
    jti?: string // unique token id (keeps tokens/hashes distinct)
    iat?: number // issued at
    exp?: number // expiration
}