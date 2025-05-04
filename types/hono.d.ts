import { User } from '@prisma/client'

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: number
      role: string
    }
  }
}
