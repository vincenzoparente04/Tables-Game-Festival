import nodemailer from 'nodemailer'

// Provider-agnostic outgoing mail. EMAIL_PROVIDER selects the backend:
//   console (default) — records/logs only; safe for dev and CI
//   smtp             — nodemailer transport from SMTP_URL
//   resend           — Resend HTTP API via RESEND_API_KEY

export interface MailAttachment {
  filename: string
  content: Buffer
  cid?: string
  contentType?: string
}

export interface MailMessage {
  to: string
  subject: string
  html: string
  attachments?: MailAttachment[]
}

// Console-provider record, so tests can assert on delivered mail.
export const sentMailsForTesting: MailMessage[] = []

export async function sendMail(message: MailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? 'console'
  const from = process.env.EMAIL_FROM ?? 'Event Platform <no-reply@example.com>'

  if (provider === 'console') {
    sentMailsForTesting.push(message)
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[email:console] to=${message.to} subject="${message.subject}" attachments=${message.attachments?.length ?? 0}`,
      )
    }
    return
  }

  if (provider === 'smtp') {
    const url = process.env.SMTP_URL
    if (!url) throw new Error('SMTP_URL is required when EMAIL_PROVIDER=smtp')
    const transport = nodemailer.createTransport(url)
    await transport.sendMail({ from, ...message })
    return
  }

  if (provider === 'resend') {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        })),
      }),
    })
    if (!res.ok) throw new Error(`Resend API error: ${res.status} ${await res.text()}`)
    return
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`)
}
