# WebTop Homework Logger — Setup Guide for Parents

Turn every WebTop (SmartSchool) homework notification on your iPhone into a row in a shared Google Sheet — with the assignment text, the class, a due date computed as the next lesson of that class, and a **Done** checkbox both parents can tick.

Each family sets up its **own private copy**: your own Sheet, your own script, your own secret word. Nothing is shared between families.

Example of a row the system creates:

| Done | Text | Date | Class | Due date | Due Day |
|---|---|---|---|---|---|
| ☐ | עמ 150-151 | 19/10 | מתמטיקה | 22/10 | יום ה |

## Before you start

You need:

- An **iPhone with iOS 27** — the Shortcuts "Notification" automation trigger only exists on iOS 27.
- The **Shortcuts** app installed.
- The **WebTop** app installed and signed in.
- A **Google account**.

One setting that decides whether this works at all:

> ⚠️ **iPhone Settings → Notifications → WebTop** must include **Lock Screen** and/or **Notification Center**. If it's set to Banners only, the automation silently never runs.

## Step 1 — Clone the Sheet template

1. Open the [HW Template](https://docs.google.com/spreadsheets/d/1E3sH6_dzw2FXLnDpGIB7zxyvvsnf6614H6ci5UDdRuM/copy) link and confirm the copy prompt. The copy that opens is your own Sheet.
2. Share your copied Sheet with the other parent as **Editor**, so they can tick Done.
3. Keep the copied Sheet open — in Step 2 you'll need its ID, from the URL between `/d/` and `/edit`.

What the template already holds:

- The first tab, with the homework headers (`Done | Text | Date | Class | Due date | Due Day`) and the gray-out formatting for ticked rows — the script finds the columns by header name, so don't rename them.
- A **Timetable** tab with the class schedule filled in — due dates are computed from it (the next lesson of the same class). Change a cell only if your child's schedule differs.

## Step 2 — The script

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Delete the sample code and paste in the **entire** contents of [Code.gs](https://github.com/SilverWaveGL/webtop-homework-tracker/blob/main/Code.gs) — open the link, click **Raw**, and copy all of it. Copying the raw text matters: copying code out of a document or chat can turn straight quotes into "smart quotes" and break the script. (No need to download the repository — just that one file.)
3. In the top two lines, replace the placeholders:
   - `SHEET_ID` — the long ID in your Sheet's URL, between `/d/` and `/edit`.
   - `SECRET` — any secret word you invent. Remember it; you'll need the exact same word in the shortcut.

## Step 3 — First test (inside the editor)

1. At the top of the editor, select the function **testDoPost** and press **Run**.
2. Approve the Google permission prompt (the script asks for access to your spreadsheets — it's your own script).
3. Expected result: a new row in your Sheet — Date **19/10**, Text **עמ 150-151**, Class **מתמטיקה**, Due date **22/10**, Due Day **יום ה**.
4. Delete that test row.

## Step 4 — Publish the script

1. **Deploy → New deployment** → type **Web app**.
2. **Execute as:** Me. **Who has access:** Anyone.
3. **Deploy**, and copy the Web app URL (it ends in `/exec`).

> ⚠️ **After any future change to the code:** use **Deploy → Manage deployments → edit → Version: New version**. The URL stays the same. A brand-new deployment creates a **new** URL and breaks the shortcut. Deployments are frozen snapshots — editing the code alone does not update what the phone calls.

## Step 5 — Install the shortcut and switch it on

Everything on the phone side comes as one ready-made shortcut named **HW** — the posting action *and* the notification automation that triggers it.

1. On the iPhone, open the shared shortcut link: [HW shortcut](https://www.icloud.com/shortcuts/589d75b61df34b6eb6dac934f6d8f889) → **Add Shortcut**.
2. Open **HW** in Shortcuts and replace its two `TODO_FILL` placeholders:
   - The URL → your `/exec` URL from Step 4.
   - The `key` field's value → your SECRET word from Step 2 (the field name stays lowercase `key`, exactly).
   - Leave the `text` field as it is. And leave the action's **Headers** section **completely empty**: a stray header row makes Google reject the request with a 400 error page.
3. At the top of **HW** sits its automation — "When I receive a notification from **WebTop**", with a **Message contains `שיעורי-בית`** filter, so only homework notifications trigger it. Shared automations arrive switched **off**: flip its toggle **on**.
   - If iOS shows a "Configure 'Title' to enable this automation" banner, first delete the leftover **Title** filter row inside the automation — only the Message filter is needed — then switch it on.

## Step 6 — Test from the phone

Run the **HW** shortcut once manually from the Shortcuts list. The expected reply is **`empty`** — that means success: the secret matched and there was simply no notification text in a manual run. Then wait for the next real WebTop notification and watch a row land in the Sheet.

## How it works day to day

- New rows are inserted at the top, then everything re-sorts: **open homework first, then by due date**.
- The **Text** column holds only the quoted assignment text; the class and dates are pulled into their own columns.
- **Due date** = the next lesson of the same class, from your Timetable tab. If the class isn't found there, it falls back to the next school day (Saturday is never a school day).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Shortcut replies `unauthorized` | The `key` doesn't match your SECRET | Check the field name is lowercase `key` and the word is identical in the script and the shortcut |
| Google 400 error page | Something is sitting in the action's Headers section | Delete every Headers row in the Get Contents of URL action |
| A notification arrived but no row — and no run on the script's **Executions** page | The phone side didn't fire | Check the WebTop notification setting (Lock Screen / Notification Center) and that the automation at the top of **HW** is switched on |
| The automation shows a "Configure … to enable this automation" banner | A filter inside HW's automation was left half-configured | Open **HW**, delete the unfinished **Title** filter row in the automation at the top — the **Message contains `שיעורי-בית`** filter is the only one you need — then switch the automation on |
| Rows land, but with old behavior after a code change | The deployment is a frozen snapshot | Redeploy as a **New version** (Step 4 warning) |
| `error: missing header column` | Row 1 headers are wrong | Row 1 must contain **Text**, **Done** and **Date** (or **Due date**), spelled exactly |
| Due date is wrong for one subject | The subject name doesn't match the Timetable | Fix the name in the Timetable tab, or add a **Mapping** row |

## Privacy & safety

- Every family creates their **own** Sheet, script and SECRET — never reuse someone else's.
- Never post your **SECRET** or your **/exec URL** publicly; together they are the key to your log.
- The Sheet contains only your own child's homework notifications.
