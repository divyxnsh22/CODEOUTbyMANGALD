# CodeOut

A tiny, free website for a real problem: students on shared lab computers write code, don't want to log in to any personal account on that machine, and end up losing their work when the session ends.

CodeOut is a static page (no backend, no database, no accounts). A student pastes or drags in their code and gets it off the lab computer three ways:

- **QR code** — scan with a phone camera, no app needed
- **Email** — either instantly (if the site owner sets up a free EmailJS account) or by opening their own mail app
- **Download** — saves the file locally, useful alongside the other two

Nothing is ever written to a server. Everything happens inside the browser tab, and closing the tab leaves nothing behind.

