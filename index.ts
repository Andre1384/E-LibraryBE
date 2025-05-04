import { Hono } from 'hono'
import { cors } from 'hono/cors' 
import { authRouter } from './routes/auth'
import { bookRouter } from './routes/book'
import { borrowRouter } from './routes/borrow'

const app = new Hono()

// Tambahkan middleware CORS sebelum route
app.use('*', cors({
  origin: '*',
}))

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
