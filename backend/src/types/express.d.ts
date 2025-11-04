import type { TokenPayload } from './token-payload.js'
declare global {
    namespace Express { // on rajoute user au type Request de express
        interface Request {
            // pour aider VSCode (ds cookie-parser mais pas vu par VSCode)
            user?: TokenPayload 
            cookies?: Record<string, string>
            
        }
    }
}

export {}
