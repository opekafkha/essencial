import { createApp } from './app.js'
import { env } from './lib/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`Backend escuchando en http://localhost:${env.PORT}`)
})
