import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function twilioPlugin() {
  let env
  return {
    name: 'twilio-whatsapp-proxy',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '')
    },
    configureServer(server) {
      server.middlewares.use('/api/send-whatsapp', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { to, message } = JSON.parse(body)
            const sid  = env.VITE_TWILIO_ACCOUNT_SID
            const auth = env.VITE_TWILIO_AUTH_TOKEN
            const from = env.VITE_TWILIO_WHATSAPP_FROM || '+14155238886'

            if (!sid || !auth) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Twilio credentials missing' }))
              return
            }

            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  From: `whatsapp:${from}`,
                  To: `whatsapp:${to}`,
                  Body: message,
                }),
              }
            )

            const result = await twilioRes.json()
            res.setHeader('Content-Type', 'application/json')
            if (twilioRes.ok) {
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, sid: result.sid }))
            } else {
              console.error('Twilio error:', result)
              res.statusCode = 400
              res.end(JSON.stringify({ error: result.message || 'Twilio error' }))
            }
          } catch (e) {
            console.error('WhatsApp proxy error:', e)
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), twilioPlugin()],
})
