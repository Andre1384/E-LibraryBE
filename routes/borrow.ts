import { Hono } from 'hono'
import prisma from '../prisma/client'
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware'

export const borrowRouter = new Hono()

// User: Pinjam buku
borrowRouter.post('/', authMiddleware, async (c) => {
  const { bookId } = await c.req.json<{ bookId: number }>()
  const user = c.get('user')
  const body = await c.req.json()
  
  console.log('Request Body:', body)
  console.log('Authenticated User:', user)

  // Validasi apakah buku sedang dipinjam
  const isBorrowed = await prisma.borrow.findFirst({
    where: {
      bookId,
      returnDate: null,
    },
  })

  if (isBorrowed) {
    return c.json({ error: 'Book is currently borrowed' }, 400)
  }

  // Validasi apakah user sudah pinjam buku ini
  const alreadyBorrowedByUser = await prisma.borrow.findFirst({
    where: {
      bookId,
      userId: user.id,
      returnDate: null,
    },
  })

  if (alreadyBorrowedByUser) {
    return c.json({ error: 'You have already borrowed this book' }, 400)
  }

  const borrow = await prisma.borrow.create({
    data: {
      userId: user.id,
      bookId,
    },
  })

  return c.json({ message: 'Book borrowed successfully', borrow })
})

// User: Lihat semua pinjaman dirinya - with pagination
borrowRouter.get('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')
  const skip = (page - 1) * limit

  const borrows = await prisma.borrow.findMany({
    where: { userId: user.id },
    include: { book: true },
    skip,
    take: limit,
  })

  const totalBorrows = await prisma.borrow.count({
    where: { userId: user.id },
  })

  return c.json({
    currentPage: page,
    totalPages: Math.ceil(totalBorrows / limit),
    totalBorrows,
    borrows,
  })
})

// User: Update returnDate (balikin buku)
borrowRouter.patch('/:id', authMiddleware, async (c) => {
  const borrowId = Number(c.req.param('id'))
  const user = c.get('user')

  const borrow = await prisma.borrow.findUnique({
    where: { id: borrowId },
  })

  if (!borrow || borrow.userId !== user.id) {
    return c.json({ error: 'Borrow record not found or not yours' }, 404)
  }

  if (borrow.returnDate) {
    return c.json({ error: 'Book already returned' }, 400)
  }

  const updated = await prisma.borrow.update({
    where: { id: borrowId },
    data: { returnDate: new Date() },
  })

  return c.json({ message: 'Book returned successfully', updated })
})

// User: Hapus data pinjaman (setelah balikin buku)
borrowRouter.delete('/:id', authMiddleware, async (c) => {
  const borrowId = Number(c.req.param('id'))
  const user = c.get('user')

  const borrow = await prisma.borrow.findUnique({
    where: { id: borrowId },
  })

  if (!borrow || borrow.userId !== user.id) {
    return c.json({ error: 'Borrow record not found or not yours' }, 404)
  }

  if (!borrow.returnDate) {
    return c.json({ error: 'Cannot delete active borrow record. Return the book first.' }, 400)
  }

  await prisma.borrow.delete({
    where: { id: borrowId },
  })

  return c.json({ message: 'Borrow record deleted successfully' })
})

// Admin: Lihat semua pinjaman semua user - with pagination + search
borrowRouter.get('/admin/all', authMiddleware, adminOnly, async (c) => {
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')
  const search = c.req.query('search') || ''
  const skip = (page - 1) * limit

  const borrows = await prisma.borrow.findMany({
    where: {
      OR: [
        { book: { title: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ],
    },
    include: {
      user: true,
      book: true,
    },
    skip,
    take: limit,
  })

  const totalBorrows = await prisma.borrow.count({
    where: {
      OR: [
        { book: { title: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ],
    },
  })

  return c.json({
    currentPage: page,
    totalPages: Math.ceil(totalBorrows / limit),
    totalBorrows,
    borrows,
  })
})

// Admin: Lihat riwayat pinjaman user tertentu
borrowRouter.get('/admin/user/:userId', authMiddleware, adminOnly, async (c) => {
  const userId = Number(c.req.param('userId'))
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')
  const skip = (page - 1) * limit

  const borrows = await prisma.borrow.findMany({
    where: { userId },
    include: { book: true },
    skip,
    take: limit,
  })

  const totalBorrows = await prisma.borrow.count({
    where: { userId },
  })

  return c.json({
    currentPage: page,
    totalPages: Math.ceil(totalBorrows / limit),
    totalBorrows,
    borrows,
  })
})

// --- Endpoint tambahan berdasarkan relasi Borrow - Book ---

// Cek status buku (available atau borrowed)
borrowRouter.get('/book/:bookId/status', authMiddleware, async (c) => {
  const bookId = Number(c.req.param('bookId'))

  const activeBorrow = await prisma.borrow.findFirst({
    where: {
      bookId,
      returnDate: null,
    },
  })

  const status = activeBorrow ? 'borrowed' : 'available'

  return c.json({ status })
})

// Hitung berapa kali buku dipinjam
borrowRouter.get('/book/:bookId/count', authMiddleware, adminOnly, async (c) => {
  const bookId = Number(c.req.param('bookId'))

  const count = await prisma.borrow.count({
    where: { bookId },
  })

  return c.json({ bookId, totalBorrowed: count })
})

// History pinjam buku berdasarkan bookId
borrowRouter.get('/book/:bookId/history', authMiddleware, adminOnly, async (c) => {
  const bookId = Number(c.req.param('bookId'))
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')
  const skip = (page - 1) * limit

  const history = await prisma.borrow.findMany({
    where: { bookId },
    include: { user: true },
    skip,
    take: limit,
  })

  const totalHistory = await prisma.borrow.count({
    where: { bookId },
  })

  return c.json({
    currentPage: page,
    totalPages: Math.ceil(totalHistory / limit),
    totalHistory,
    history,
  })
})
