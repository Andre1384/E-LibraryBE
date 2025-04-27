// routes/book.ts
import { Hono } from 'hono'
import prisma from '../prisma/client'
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware'

export const bookRouter = new Hono()

// Get all books - user or admin - now with pagination + search
bookRouter.get('/', authMiddleware, async (c) => {
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')
  const search = c.req.query('search') || ''

  const skip = (page - 1) * limit

  const books = await prisma.book.findMany({
    where: {
      title: {
        contains: search,
        mode: 'insensitive',
      },
    },
    skip,
    take: limit,
  })

  const totalBooks = await prisma.book.count({
    where: {
      title: {
        contains: search,
        mode: 'insensitive',
      },
    },
  })

  return c.json({
    currentPage: page,
    totalPages: Math.ceil(totalBooks / limit),
    totalBooks,
    books,
  })
})

// Get detail of one book by id - user or admin
bookRouter.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))

  const book = await prisma.book.findUnique({
    where: { id },
  })

  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  return c.json(book)
})

// Create a new book - admin only
bookRouter.post('/', authMiddleware, adminOnly, async (c) => {
  const { title, author, description, stock } = await c.req.json()

  const book = await prisma.book.create({
    data: { title, author, description, stock },
  })

  return c.json({ message: 'Book created', book })
})

// Update a book - admin only
bookRouter.put('/:id', authMiddleware, adminOnly, async (c) => {
  const id = Number(c.req.param('id'))
  const { title, author, description, stock } = await c.req.json()

  const book = await prisma.book.update({
    where: { id },
    data: { title, author, description, stock },
  })

  return c.json({ message: 'Book updated', book })
})

// Delete a book - admin only
bookRouter.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const id = Number(c.req.param('id'))

  // Validasi: Cek dulu apakah ada borrow aktif untuk buku ini
  const activeBorrow = await prisma.borrow.findFirst({
    where: {
      bookId: id,
      returnDate: null,
    },
  })

  if (activeBorrow) {
    return c.json({ error: 'Cannot delete book. Book is currently borrowed.' }, 400)
  }

  await prisma.book.delete({
    where: { id },
  })

  return c.json({ message: 'Book deleted' })
})

// Get all borrows of a specific book - user or admin
bookRouter.get('/:id/borrows', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))

  const borrows = await prisma.borrow.findMany({
    where: { bookId: id },
    include: { user: true },
  })

  return c.json(borrows)
})
