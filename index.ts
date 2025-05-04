import { Hono } from 'hono'
import { cors } from 'hono/cors' 
import { authRouter } from './routes/auth'
import { bookRouter } from './routes/book'
import { borrowRouter } from './routes/borrow'

const app = new Hono()

// Tambahkan middleware CORS sebelum route
app.use('*', cors({
  origin: '*', // Pertimbangkan untuk membatasi origin di produksi
}))

// Menambahkan router
app.route('/auth', authRouter)
app.route('/books', bookRouter)
app.route('/borrows', borrowRouter)

// Endpoint untuk favicon.ico
app.get('/favicon.ico', (c) => c.body(null, 204)) // 204 No Content

// Endpoint utama
app.get('/', (c) => {
  return c.text('E-Library API is running 🚀')
})

// Menentukan port dan fetch handler
export default {
  port: 3000,
  fetch: app.fetch,
}
