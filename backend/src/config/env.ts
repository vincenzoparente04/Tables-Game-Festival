import 'dotenv/config'

const secret = process.env.JWT_SECRET
if (!secret) {
    throw new Error('JWT_SECRET missing in environment')
}

export const JWT_SECRET: string = secret
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m'
export const REFRESH_EXPIRATION = process.env.REFRESH_EXPIRATION || '7d'
