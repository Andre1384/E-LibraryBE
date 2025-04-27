// routes/auth.ts
import { Hono } from 'hono'
import prisma from '../prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware'

export const authRouter = new Hono()

// REGISTER
authRouter.post('/register', async (c) => {
  const { username, password, role } = await c.req.json<{ username: string; password: string; role?: string }>()

  const existingUser = await prisma.user.findUnique({
    where: { username },
  })

  if (existingUser) {
    return c.json({ error: 'Username already taken' }, 400)
  }

  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: role || 'user',
    },
  })

  return c.json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  })
})

// LOGIN
authRouter.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const isValid = await bcrypt.compare(password, user.password)

  if (!isValid) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    console.error('JWT_SECRET is not set')
    return c.json({ error: 'Internal server error' }, 500)
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    jwtSecret,
    { expiresIn: '1h' }
  )

  return c.json({ message: 'Login successful', token })
})

// GET all users (admin only)
authRouter.get('/users', authMiddleware, adminOnly, async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  })
  return c.json(users)
})

// GET single user by id (user sendiri atau admin)
authRouter.get('/users/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')

  if (user.role !== 'admin' && user.id !== id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const foundUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true },
  })

  if (!foundUser) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(foundUser)
})

// PATCH update user sendiri
authRouter.patch('/users/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')

  if (user.id !== id) {
    return c.json({ error: 'Cannot update other user' }, 403)
  }

  const { username, password } = await c.req.json()

  const data: any = {}
  if (username) data.username = username
  if (password) data.password = await bcrypt.hash(password, 10)

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
  })

  return c.json({ message: 'User updated', user: updatedUser })
})

// DELETE user sendiri atau admin
authRouter.delete('/users/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')

  if (user.role !== 'admin' && user.id !== id) {
    return c.json({ error: 'Cannot delete other user' }, 403)
  }

  await prisma.user.delete({
    where: { id },
  })

  return c.json({ message: 'User deleted successfully' })
})

// DELETE ALL regular users (admin only)
authRouter.delete('/delete-all-users', authMiddleware, adminOnly, async (c) => {
  const { confirm } = await c.req.json<{ confirm: string }>()

  if (confirm !== 'yes') {
    return c.json({ error: 'Konfirmasi gagal. Kirim { "confirm": "yes" } untuk menghapus semua user.' }, 400)
  }

  const deleted = await prisma.user.deleteMany({
    where: { role: 'user' },
  })

  return c.json({
    message: `Berhasil menghapus ${deleted.count} user.`,
  })
})
