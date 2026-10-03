# CRM, DB Search and Documents: the A to Z plan

This plan covers 104 checked audit points. Two were dropped because a checker refuted them: the claim that unassigned portal leads go unnoticed, and the redesign of the phone "Everything" menu.

## 1. Remove or merge

- **On/off switch in Team.** The same switch exists in Access and activity under a different name, and the two screens can disagree. Keep it in Access and activity only.
- **Sign-in history in Agent performance.** Access and activity already shows it with filters and export. Keep one copy.
- **Two agent performance tables.** Reports and Team monitor show overlapping numbers over different date ranges. Keep one table in Reports and leave Team monitor for who is online.
- **Colleague leaderboard for agents.** Agents see every colleague with zero deals and zero earnings, which is false. Show each agent only their own row.
- **Double names for admin screens.** "Integrations" and "Lead sources" are the same screen, and so are "Team documents" and "Documents". Pick one name each.
- **Off-market checkbox on listings.** There is already an off-market status, and the checkbox promises to hide the listing from a public site that does not read it.
- **Second "create invoice from deal" path.** Two buttons build the same invoice with different defaults. Keep one, and fill the legal name and tax number from the client's ID file.
- **Standalone mortgage payment card.** Fold it into the cost sheet so the client gets one set of numbers.
- **Deal value field on the lead.** It duplicates the budget. Let budget carry the pipeline value.
- **Co-broker block on every lead.** It only matters at offer stage. Hide it behind a "Co-broker deal?" toggle.
- **Website service label and raw form fields on leads.** They mean nothing for portal leads. Show the short brief (sale or rent, area, beds, budget) instead.
- **Vastu and sun tool in DB Search.** It is not linked to any unit or owner. Remove it from the Tools menu, or move it to Documents as a buyer page.
- **"Show them" re-search in DB Search.** Showing records with no phone runs and charges a whole new search. Make it a simple show or hide.
- **Unused phone target bar.** It was built but never shown. Show it on the phone Home screen, or delete it.
- **Templates screen for agents.** Agents see greyed-out boxes they cannot edit. Hide it, or show a read-only list with a copy button.
- **Sign-in limits that reset themselves.** Two of the three attempt counters do not work on the live site. Keep only the one that works.

## 2. Add

Ranked by how much each helps close deals.

1. **Buyers who fit this listing.** When a listing is saved, show the leads and contacts who asked for something like it, with a WhatsApp send button.
2. **Viewing reminder with client phone.** The bell warns an hour before a viewing. The event shows Call and WhatsApp, with a ready confirmation message.
3. **Viewing outcome prompt.** Marking a viewing done asks for feedback and the next step: move to Offer, set a follow-up, or book another viewing.
4. **Photo upload from the phone.** Agents pick listing photos from the camera roll instead of pasting links.
5. **Ready WhatsApp opener and Copy button in DB Search.** The chat opens with the agent's name and the unit already written. A revealed number can be copied.
6. **Owner view from every search card.** Before calling, the agent sees "sold since 2023" or "also owns 3 units".
7. **Campaign follow-up list.** Every campaign send becomes a temp lead with the message and campaign name, so someone can chase replies next day.
8. **No-answer counter.** Show "Attempt 3 of 3" and then offer "Mark unreachable". Late evening follow-ups move to 9:30 next morning.
9. **Portal feed for Property Finder and Bayut.** Enter a listing once and it goes to the portals. Enquiries then route to the right agent. This is the biggest job on the list.
10. **Client ID upload on the spot.** Photograph the passport or Emirates ID straight into the client's ID file. This stops the ID check from delaying deal entry.
11. **Files on a deal.** Attach the signed Form F, NOC, SPA and deposit proof to the deal next to each checklist item.
12. **One-click tenancy renewal.** "Renew tenancy" creates the new year from the old one with a new rent. The notice message includes the proposed rent.
13. **Cheques due list.** One row per cheque due in 14 days, with tenant, bank, amount and Deposited, Cleared or Bounced buttons.
14. **Receipt for deposits and cheques.** A numbered receipt for the client, printed from the deal or the cheque row.
15. **Tenancy contract and Ejari certificate on the tenancy.** The Ejari pill turns green only when the certificate is attached.
16. **Reschedule a task.** "Tomorrow" and "Next week" buttons and a date edit. The owner can reassign.
17. **Why we lost, and viewing conversion.** A report of lost reasons by source and agent, plus viewings booked and viewings that became offers.
18. **More template fields.** Templates can use area, budget, beds, sale or rent, and the agent's phone, with a preview from a real lead.
19. **Quarter-end slab review.** One screen shows each agent's current slab, result and proposed new slab, with an Apply button.
20. **Missing and expiring team documents.** One view shows which agent still owes which document and what has expired.
21. **Agents change their own password, plus "Forgot password".** No more passwords sent over WhatsApp.
22. **Sign out of everything.** One button ends every open session for a person. A password reset does the same.
23. **Remember this device.** One emailed code per phone per month for the CRM. DB Search and Documents keep the code.

## 3. Improve

Real bugs for each area are in section 4.

### Home
- Count a lead as "waiting for a first reply" only if nobody has contacted it. Tapping Call or WhatsApp should log the contact and move the lead to Contacted.
- Show whether the agent is on pace for the quarter, and how much per week keeps the bonus. Use the same pace view for the owner.
- Make every bell item open the thing it is about. Give the owner his own overdue tasks, not the whole team's.

### Leads
- Shorten the lead panel as listed in section 1, so Call, WhatsApp and Stage come first.
- In the open pool, show the brief and the source so agents know what they are claiming.
- Split lost reasons into junk (spam, wrong number, another agent) and real losses. Leave junk out of the win rate.
- Count "Don't have stock" by area so the owner knows what stock to find.

### People
- Match on sale or rent, and require both area and beds when both are set. Today a tenant is offered sale listings.
- Add Send and Send all on a contact's matches, the same as on a lead.
- Show the listings a contact owns on their card.

### Listings
- Add filters for sale or rent, bedrooms, community and "my listings", plus sort by price or newest.
- Show the key status on the card.
- Show the owner's phone and WhatsApp next to the owner on the listing.
- When a listing comes from an owner request, link or create the owner as a contact.

### Deals and rentals
- Off-plan: tick the commission trigger automatically when the buyer has paid enough. Hide off-plan deals from "not invoiced yet" until then.
- Off-plan: show instalments due in the next 14 days so the agent chases the buyer first.
- Take the developer invoice status from the real invoice instead of a separate field.
- Fill "Client pays by" from the client's ID file instead of asking twice.
- Show the cheque's bank field, or drop it.
- Add "Amount received" and "Balance due" to the printed invoice, with bank details filled in by default.

### Calendar and tasks
- Show who each task is about, with Call and WhatsApp on the row. Tapping the name opens the lead or contact.
- Count viewings in the past 30 days only. Today the number also includes the next 30 days.

### Reports
- Add calls, WhatsApp, untouched leads, overdue tasks and viewings to the one agent table, all following the date range picker.
- Label win rate clearly, or base it on deals closed in the period.

### Tools
- Add "Send on WhatsApp" to the calculators with a lead picker, and log it on the lead.
- Add a "Cost sheet" link on the lead that opens with the lead's budget.
- Let the cost sheet take the rate, the term, and first or additional property.
- Quick WhatsApp: replace the pop-up loop with one button per chat ("Open chat 3 of 27"). Ask for confirmation above about 50.
- Quick WhatsApp: add "My open leads" and skip people messaged in the last 7 days.
- Search box: include the calling list and owner requests. A listing result should open that listing.

### Team and rules
- Requests: let the owner write the note agents see. Show pending first, show the listing for video shoots, and add a pending count.
- Audit log: add person, period and text filters, readable details and a spreadsheet export.
- Access and activity: put locked people at the top with the reason and an Unlock button.
- Team documents: let the owner upload for an agent and delete wrong files.
- Ask for the expiry date when a visa, ID or licence is uploaded, and feed it into the alerts.
- Split document types into passport, Emirates ID, visa, BRN card, RERA certificate, employment contract and commission agreement.
- Replace the password reset pop-up with a proper field that explains the 10 character minimum.

### DB Search
- Use one reveal step everywhere. Reveal all of an owner's numbers at once and remember the last reason for the session.
- After adding a lead, stay on the list and show "Added as a lead. Open". Do not jump to the CRM.
- Link Unit history to "Listed right now?" and back, with the unit carried over.
- Add Unit history to the Tools menu.
- Open the Portfolio finder to agents, and make a row open the owner directly.
- Show reveals used next to searches used, with a warning before a lock.
- Add area suggestions to the Market sales picker.

### Campaign
- Add a "WhatsApp campaign" button on the Area calling list that carries the ticked owners over.
- Say "first 100 selected" when the cap is hit.
- Show an "in CRM" chip on unticked rows, with an Open link.
- Add a copy of the send list as a spreadsheet.
- Show reveals left today next to the send button, and block a queue bigger than the budget.

### Documents
- Open the document generators from a deal, tenancy or listing with the names, unit and price already filled in. Let agents generate but not edit templates. This is a large job.
- Make the Documents session last as long as the CRM session.

### Sign-in and security
- When the CRM is already signed in with a code, ask DB Search for the password only when re-entering.
- Show failed sign-in attempts per account to the owner.

### Phone
- Swap the DB Search bottom tab for People. Keep DB Search as the first item under More.
- Show task counts in the normal colour so red means urgent.
- Use stacked rows with Call and WhatsApp on Contacts, Deals, Rentals, Temp leads and Owner requests, instead of sideways tables.
- Leads list: show search and Add only, with filters behind one button. Add Call and WhatsApp to each card and bring back the overdue count.
- Lead panel: one row of icon buttons with WhatsApp and Call first.
- DB Search: fold the top bar into one menu so the search box is visible first.
- DB Search cards: make Call, WhatsApp and "Add to CRM" full-size buttons.

## 4. Fix now

### Security and access
- **Signing out of the CRM leaves Documents open for up to four hours.** DB Search stays open too. Sign out should close all three.
- **One hidden setting turns off the emailed code everywhere**, including owner data and Documents, and nothing on screen shows it. Limit it to the CRM on test sites and show a red warning when it is on.
- **The owner's password snaps back to the original setup password.** Anyone who ever learned it keeps a permanent admin login.
- **A password reset does not end open sessions.** A leaving agent stays signed in for up to 10 hours.
- **Anyone who knows an agent's email can lock them out** for 15 minutes, again and again, with 8 wrong passwords.
- **Agents can permanently delete their own compliance documents.** Only the owner should be able to remove them.
- **Agents can mark their own client as sanctions clear and low risk**, which opens the deal gate. Only the owner should set these, and the deal should wait for approval.

### Leads lost or double-worked
- **The temp lead Promote button does nothing.** The agent lands on an unchanged leads screen and must retype everything.
- **WhatsApp buttons fail for numbers typed as 050.** This affects every WhatsApp button in the CRM.
- **Manual and bulk lead imports never check for duplicates.** Two agents can work the same client. Leads added from DB Search skip the check too.
- **New contacts are never checked for duplicates.** One client ends up with two cards.
- **Starring a lead or editing a note restarts the 48 hour clock.** An agent can hold a lead forever without calling.
- **Release and reclaim resets the clock.** "Not interested" and "low budget" also send dead leads back to the pool instead of to Lost.
- **Imported leads can go to an agent with an expired BRN**, and they never join the 48 hour rule.
- **Pool leads show Call and WhatsApp buttons that dial hidden digits.** The "Claim" button only opens the panel.
- **Quick WhatsApp leaves nothing on the lead.** The same people get messaged again tomorrow.
- **Agents' bulk sends are not logged at all.** The save fails silently, so the owner sees only his own.
- **Quick WhatsApp's "New leads" list includes unclaimed pool leads.** Two agents can message the same client the same morning.
- **A number typed by hand into a campaign skips the do-not-contact list.**
- **Campaign templates send a literal "{agent}"** to owners.
- **A campaign in progress is wiped** by going back to Search, opening an owner or the 20 minute timeout.
- **The campaign pace guard misses reveals made elsewhere**, so agents get locked mid-campaign.
- **Tasks delete with one tap and no undo**, right beside the tick box on phones.
- **The "listing rejected" alert goes to the admin who rejected it**, not to the agent.
- **"Send test lead" puts a fake lead on a real agent** with a live 48 hour clock.

### Money and numbers
- **The deal form defaults every agent to a 50% split** instead of their slab. Company and agent shares are wrong unless retyped.
- **Deal "paid" and invoice "paid" are separate.** The two money screens disagree until both are clicked.
- **The quarterly slab card goes blank or shows one month** when a month filter is picked.
- **The printed tax invoice loses its brand colour and table lines.**
- **The cost sheet always assumes 4.5%, 25 years and a first property.** A second-home buyer gets a wrong cash figure under the company name.
- **The reports funnel leaves out every lost lead**, so "New" is smaller than "Leads".

### Listings and uploads
- **Editing a live listing is refused until every document is perfect**, even for a typo. A new listing with no documents goes live with no check.
- **iPhone photos of documents will not open on a Windows laptop.** Convert them on upload.

### DB Search
- **Reveal then "Add as lead" costs two reveals.** Eight owners revealed and saved in ten minutes locks the agent out.
- **The Phone tab makes the agent spend a reveal on the number they just typed.**
- **Top area buttons run a text search that misses records.** They should list the whole community.
- **Switching tabs throws away the results**, and searching again costs quota.
- **The 20 minute idle timeout wipes the list the agent is calling from.** Keep the results and show sign-in on top.
- **Opening the Market tool costs a search**, and so does flipping between Sales and Rents.

### Phone
- **The DB Search button opens a new browser tab every time.** Open it in place on phones.
- **The Back gesture does not close a lead or contact panel.** The agent loses their place.

## 5. Suggested order

The order puts small fixes that stop lost leads and close security gaps first, then money accuracy, then the tools that help close deals.

| # | What | Effort | Why here |
|---|---|---|---|
| 1 | Make sign out close CRM, DB Search and Documents | S | Smallest fix for the biggest exposure. |
| 2 | Limit the "codes off" setting and show a warning | S | Protects owner data from one forgotten setting. |
| 3 | Stop the owner password snapping back | S | Closes a permanent back door. |
| 4 | Stop agents deleting compliance documents and clearing their own sanctions check | S to M | Protects the owner's legal record. |
| 5 | Fix WhatsApp links for 050 numbers | S | Every WhatsApp button depends on it. |
| 6 | Make Promote create the lead | S | Qualified cold calls are being lost today. |
| 7 | Fix the 48 hour clock, release reasons and reclaim | S | Makes the pool rule real. |
| 8 | Check duplicates on leads and contacts | M | Stops two agents working one client. |
| 9 | Fix pool Call buttons and one-tap claim | S | Removes dead taps on the Home screen. |
| 10 | Log Quick WhatsApp on each lead, save agents' sends, own leads only | S | Stops repeat and double messaging. |
| 11 | Use the agent's slab on deals and sync paid status | S | Makes commission numbers trustworthy. |
| 12 | Fix the listing edit gate and check new listings | S | Unblocks daily edits and stops non-compliant stock. |
| 13 | Stop double reveal charges, show reveals left, fix the Phone tab | S | Agents stop being locked out for normal work. |
| 14 | Viewing reminder with client phone, plus outcome prompt | M | Fewer no-shows and every viewing gets a next step. |
| 15 | Buyers who fit this listing, plus photo upload from the phone | M | Sends new stock to the right buyers the same day. |

After these, the next steps are the phone layout fixes, then keeping DB Search results and campaigns alive across tab switches and timeouts, then the campaign follow-up list. The two large jobs come last: the portal feed and opening Documents from a deal.