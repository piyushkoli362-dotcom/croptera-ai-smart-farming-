# Croptera AI public website

This workspace contains the Croptera AI marketing site and a **local-only** form collector. Agricultural product features remain labelled as research or planned.

## Local forms and Excel workbook

Run:

```powershell
npm run dev
```

Open `http://localhost:3000`. In this local preview, the three forms submit to `/api/submit` and save to a private Excel workbook:

`outputs/01a14bb4-619f-7b02-956a-0d044f0b2e4b/Croptera_Leads.xlsx`

The workbook has separate tabs:

- **Pre-Registrations** — farmer and prospective-user early access interest.
- **Enquiries** — research and partnership enquiries.
- **Talent Interest** — careers expressions of interest.

The same private folder contains `submissions.jsonl`, the source record used to rebuild the workbook. Submission IDs and UTC timestamps help locate entries. The folder is excluded from Git and from the public `dist/` build. The local server binds only to `127.0.0.1`, validates input, limits request size and rate, and serves only allowlisted public files. Keep the workbook and record file private and backed up. Do not put them in a public repository or share them as public links.

`npm run export:excel` rebuilds the workbook from the private record file. To honor a verified deletion request, run `node scripts/delete-submission.mjs <submission-id>` while the server is stopped; then check the workbook. This removes the entry from the local record file and workbook. It does not remove copies made elsewhere.

The Excel export uses the `@oai/artifact-tool` bundled with this Codex workspace. The ignored `node_modules` junction points to that local dependency. On another computer, provide a compatible artifact-tool installation before using the local form collector.

## Public submissions and where to view them

The website includes a Vercel `/api/submit` function and a Google Sheets Apps Script writer. The production connection is active on `https://croptera-ai-smart-farming.vercel.app/`. The public forms check `/api/status` and stay disabled if either server environment variable is missing. The private Google Sheet has three tabs: **Pre-Registrations**, **Enquiries**, and **Talent Interest**. Open that sheet in Google Drive to view new entries. Do not share it publicly.

### Connect your private Google Sheet

1. In the Google account that should own the data, create a new private Google Sheet named `Croptera AI Responses`.
2. In that sheet choose **Extensions → Apps Script**. Replace `Code.gs` with the contents of [`google-sheets/Code.gs`](google-sheets/Code.gs) and save.
3. In Apps Script choose **Project Settings → Script properties**. Add `SHEET_WRITE_SECRET` with a long random value (at least 32 random characters). Keep this secret private.
4. In the Apps Script editor, select `setupSheets` and click **Run** once. Grant the spreadsheet access it requests. This creates the three tabs and their headers.
5. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Deploy and copy the `/exec` web app URL. Access is limited in code by the secret; the sheet itself remains private. If you edit `Code.gs` later, create a new deployment version.
6. In Vercel project settings, add `GOOGLE_SHEETS_WEB_APP_URL` = the `/exec` URL and `GOOGLE_SHEETS_SECRET` = exactly the `SHEET_WRITE_SECRET` value. Add these as **server environment variables**, never in browser files or Git. Redeploy the site.
7. Submit one test entry in each form on the deployed HTTPS site. Confirm each appears in the matching private sheet tab, then delete those test rows. Only treat the form system as live after this check succeeds.

The server endpoint validates fields, checks same-origin browser submissions, and waits for a confirmed write before saying “Saved successfully.” The secret is only sent from the Vercel function to Apps Script. The public website does not expose your Google Sheet link or secret. A deployment without these settings serves the site with submissions disabled. Public entries do **not** appear in the localhost Excel file.

### Deploy the website

1. Push project source to Git, **without** `outputs/` or the local workbook.
2. Import the repository into Vercel. Use build command `npm run build`, output directory `dist`, and framework preset **Other**. The root `api/` directory provides the two serverless functions.
3. Set `SITE_URL` to the actual HTTPS site URL and redeploy for canonical URLs and `sitemap.xml`.
4. Complete the private Google Sheet setup above and verify real delivery.

## Search visibility

The production build uses `SITE_URL` to add canonical links, Open Graph and social preview tags, and an XML sitemap. The home page also includes truthful organization, founder, and website structured data. The placeholder updates page has `noindex,follow` and is omitted from the sitemap until real articles are published. After deployment, verify the site in Google Search Console and submit `https://croptera-ai-smart-farming.vercel.app/sitemap.xml`. Sitemap submission requests crawling; it does not guarantee indexing or rankings.

Before collecting real personal data, review who can access the Google Sheet, how long entries are kept, how deletion requests are handled, and whether your privacy notice reflects your actual setup. The public endpoint has basic validation and a honeypot, but no durable bot rate limit yet; monitor for spam after launch.

## Checks and environment

Run `npm run check` and `npm run build` before deployment.

| Name | Purpose | Required |
| --- | --- | --- |
| `PORT` | Local server port; default `3000` | No |
| `CROPTERA_DATA_DIR` | Private local workbook and record directory | No |
| `SITE_URL` | Real public HTTPS origin for SEO metadata | After public deployment |
| `GOOGLE_SHEETS_WEB_APP_URL` | Private Apps Script `/exec` writer URL | For public forms |
| `GOOGLE_SHEETS_SECRET` | Matches Apps Script `SHEET_WRITE_SECRET` | For public forms |

The public site has no authenticated product application route because no existing Croptera application was present in this workspace.
