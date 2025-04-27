import type { MiddlewareHandler } from 'hono'
import jwt from 'jsonwebtoken'

interface UserPayload {
  id: number
  role: string
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable not set')
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return c.json({ error: 'Unauthorized, token missing' }, 401)
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload

    if (!decoded || typeof decoded !== 'object') {
      return c.json({ error: 'Invalid token payload' }, 401)
    }

    const { id, role } = decoded as UserPayload

    if (!id || !role) {
      return c.json({ error: 'Invalid token payload' }, 401)
    }

    c.set('user', { id, role })

    await next()
  } catch (error) {
    console.error('JWT Error:', error)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

export const adminOnly: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as UserPayload

  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admins only' }, 403)
  }

  await next()
}
