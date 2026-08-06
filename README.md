# CodeOut

A tiny, free website for a real problem: students on shared lab computers write code, don't want to log in to any personal account on that machine, and end up losing their work when the session ends.

CodeOut is a static page (no backend, no database, no accounts). A student pastes or drags in their code and gets it off the lab computer three ways:

- **QR code** — scan with a phone camera, no app needed
- **Email** — either instantly (if the site owner sets up a free EmailJS account) or by opening their own mail app
- **Download** — saves the file locally, useful alongside the other two

Nothing is ever written to a server. Everything happens inside the browser tab, and closing the tab leaves nothing behind.

## 1. Host it on GitHub Pages (free, ~5 minutes)

1. Create a new **public** GitHub repository (e.g. `codeout`).
2. Upload these five files to the root of the repo: `index.html`, `styles.css`, `app.js`, `config.js`, `README.md`.
3. Go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
5. Save. GitHub gives you a URL like `https://yourusername.github.io/codeout/` within a minute or two.

That's it — QR codes, download, and "open in mail app" all work immediately with zero configuration.

## 2. (Optional) Turn on instant email sending

By default the "Send instantly" button is disabled and the site just shows "open in mail app" instead. To enable one-click emailing:

1. Create a free account at [emailjs.com](https://www.emailjs.com/) — the free tier includes 200 emails/month, which is plenty for a lab computer.
2. Under **Email Services**, connect an email account (Gmail, Outlook, etc.) and note the **Service ID**.
3. Under **Email Templates**, create a template that uses these variables: `{{to_email}}`, `{{subject}}`, `{{message}}`. Note the **Template ID**.
4. Under **Account → General**, copy your **Public Key**.
5. Open `config.js` in your repo and fill in the three values:

   ```js
   window.CODEOUT_CONFIG = {
     EMAILJS_PUBLIC_KEY: "your_public_key",
     EMAILJS_SERVICE_ID: "your_service_id",
     EMAILJS_TEMPLATE_ID: "your_template_id"
   };
   ```

6. Commit the change. Instant sending turns itself on automatically — no other code changes needed.

**A note on the public key:** EmailJS's public key is designed to be used in client-side code like this, but because it's visible to anyone who views the page source, it's worth turning on EmailJS's built-in **domain restriction** (Account → Security) so the key only works when called from your GitHub Pages URL, which prevents strangers from using your free email quota.

## 3. Customize (optional)

- **Colors / fonts**: all in `styles.css`, defined as CSS variables at the top of the file.
- **Languages list**: edit the `LANGUAGES` array at the top of `app.js` to add or remove file types.
- **QR size limits**: `QR_SAFE_LIMIT` and `QR_CHUNK_SIZE` in `app.js` control when the site switches from one QR code to a scannable multi-part sequence. Lower them if you find codes aren't scanning reliably on the phones your students use.

## Why this approach

GitHub Pages only serves static files — there's no server to store anything on, which is exactly the point: nobody has to trust this site with a login or a database of pasted code. QR codes and `mailto:` links work with literally no setup. EmailJS is the one piece that needs a few minutes of configuration, and it's optional.

## A couple of honest limits

- QR codes have a size limit. Long files get split into several QR codes shown one at a time — fine for a few hundred lines, clunky for huge files. Email or download is more reliable for big files.
- `mailto:` links have a length limit that varies by browser/OS (roughly 1800–2000 characters is a safe bet), and only work if the lab computer has a mail client or default mail handler configured.
- This tool doesn't do anything to bypass a lab's network policy — if the lab blocks outgoing email or blocks GitHub entirely, none of this will work, and that's by design (it's not trying to get around IT restrictions, just avoiding logins).
