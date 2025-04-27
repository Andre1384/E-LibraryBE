// index.ts
import { Hono } from 'hono'
import { authRouter } from './routes/auth'
import { bookRouter } from './routes/book'
import { borrowRouter } from './routes/borrow'

const app = new Hono()

// Routes
app.route('/auth', authRouter)
app.route('/books', bookRouter)
app.route('/borrows', borrowRouter)

app.get('/favicon.ico', (c) => c.body(null, 204)) // 204 No Content
app.get('/', (c) => {
    return c.text('E-Library API is running 🚀')
  })

export default {
  port: 3000,
  fetch: app.fetch,
}
