# YKE Sales Compass

I want to build a custom CRM / Sales Operating System for Yo-Kai Express (YKE), a global food-tech company.

This is NOT intended to be a generic Salesforce clone. It should be designed around a real sales workflow that our US and Asia teams can actually use.

IMPORTANT:

- Build the frontend and product experience first.

- Do NOT use Google Sheets as the UI.

- The eventual source of truth will be a relational PostgreSQL database (likely Supabase), but for now focus on the frontend, UX, data model assumptions, and workflows.

- The system should be designed so the backend/database can be connected later without rebuilding the frontend.

- Make the UI production-quality, clean, modern, and simple enough for non-technical sales users.

==================================================

1. CORE CRM DATA MODEL

==================================================

The system should have these core objects:

1. Accounts

2. Leads

3. Contacts

4. Opportunities

5. Interactions / Activities

6. Tasks / Follow-ups

7. Users

8. Campaigns

Relationships:

Account

 ├── Contacts

 ├── Leads

 ├── Opportunities

 └── Interactions

Lead

 ├── can originate from Wix, events, social media, referrals, outbound, etc.

 ├── has a lifecycle stage

 ├── can be assigned to a sales owner

 └── can be converted into an existing or new Account + Contact + Opportunity

Opportunity

 ├── belongs to an Account

 ├── can have a primary Contact

 ├── has a sales stage

 ├── has value / probability / expected close date

 └── has Activities / Tasks

Interactions

 ├── can be associated with Lead

 ├── Account

 ├── Contact

 └── Opportunity

Do NOT treat these as separate disconnected spreadsheets.

The UI should feel like one unified system.

==================================================

2. LEAD LIFECYCLE

==================================================

The CRM should support this lifecycle:

New

→ MQL

→ SAL

→ SQL

→ Converted

Definitions:

New:

A new prospect has entered the system but has not been qualified.

MQL:

Marketing has determined that the prospect is worth Sales reviewing.

SAL:

Sales has accepted the lead and is responsible for following up.

SQL:

Sales has qualified the prospect and confirmed meaningful business potential.

Converted:

The lead has been converted into an Account / Contact and, when appropriate, an Opportunity.

IMPORTANT:

MQL, SAL, and SQL are lifecycle stages/statuses of a Lead.

They should NOT be separate database tables.

==================================================

3. LEAD CONVERSION

==================================================

This is one of the most important workflows.

Create a clear "Convert Lead" action.

When a Sales user clicks "Convert Lead":

1. Search for an existing Account using company name / domain / other identifiers.

2. If Account exists, link the Lead to the existing Account.

3. If Account does not exist, create a new Account.

4. Search for an existing Contact using email / name / account.

5. If Contact exists, link the Lead to the existing Contact.

6. If Contact does not exist, create a new Contact.

7. Give the user the option to create an Opportunity.

8. Link the Opportunity to the Account and Contact.

9. Mark the original Lead as Converted.

10. Preserve the original Lead record and its source information.

NEVER require the user to manually copy information between tables.

The Lead should retain:

- Lead ID

- Source

- Campaign

- Original created date

- Lifecycle history

- Converted Account ID

- Converted Contact ID

- Opportunity ID if created

The goal is to reproduce the feeling of Salesforce-style lead conversion without copying or deleting records manually.

==================================================

4. LEAD SOURCES

==================================================

Leads can come from:

- Wix website inquiry

- Event registration

- Trade shows

- LinkedIn

- Instagram / social media

- Referral

- Partner

- Outbound sales

- Manual entry

- Other marketing campaigns

Every Lead should have:

- Source

- Source Detail

- Campaign

- Created Date

Do NOT automatically create a Lead for passive social activity such as likes or follows.

A Lead should generally represent meaningful commercial interest.

==================================================

5. ACCOUNT SCORING

==================================================

The existing YKE system already has an Account scoring model.

Preserve this concept.

The Account should have an "Account Fit Score".

This represents:

"How well does this company fit YKE's ideal customer profile?"

This is different from Lead qualification.

Lead Score:

"How qualified / actionable is this specific prospect?"

Account Fit Score:

"How attractive is this company as a target account?"

Make these visually distinct.

==================================================

6. SALES HOME / DAILY WORKSPACE

==================================================

The Sales user's homepage should NOT look like a spreadsheet.

It should answer:

"What do I need to do today?"

Create a Sales Home dashboard with:

- Overdue Follow-ups

- Due Today

- Upcoming Tasks

- New Leads

- High Priority Leads

- My Opportunities

- Pipeline Value

- Recent Activity

Example:

GOOD MORNING, CINDY

Overdue

3

Due Today

7

New Leads

4

High Priority

5

My Pipeline

$420K

Then show actionable lists.

==================================================

7. FOLLOW-UP SYSTEM

==================================================

Tasks should include:

- Task ID

- Owner

- Related Lead

- Related Account

- Related Contact

- Related Opportunity

- Task Type

- Due Date

- Status

- Next Action

Task types can include:

- Call

- Email

- Meeting

- Follow-up

- Send Proposal

- Demo

- Other

The system should automatically surface:

- Overdue

- Due Today

- Upcoming

A sales rep should be able to complete a task directly from the dashboard.

==================================================

8. INTERACTION / ACTIVITY LOG

==================================================

The existing YKE CRM already has an Interaction Log.

Preserve this concept.

Interactions can include:

- Email

- Call

- Meeting

- Demo

- LinkedIn

- Event

- Other

Each Interaction should support:

- Date

- Owner

- Related Account

- Related Contact

- Related Lead

- Related Opportunity

- Notes

- Next Steps

- Next Action

- Due Date

The existing system also uses Gemini to summarize meeting notes from a Google Doc.

Design the UI so an interaction can eventually support:

Google Doc URL

→ AI Summary

→ Notes

→ Next Steps

→ Next Action

→ Due Date

For now, build the UI and workflow assuming this AI integration will be connected later.

==================================================

9. ACCOUNT DETAIL PAGE

==================================================

Create a powerful Account 360 page.

Example:

ABC HOTEL

Account Fit Score: 92

Region: US

Owner: Cindy

Status: Active Prospect

Contacts

- John Smith — VP Operations

- Sarah Chen — F&B Director

Open Opportunities

- $80K — Proposal

- $30K — Discovery

Recent Activities

- Aug 17 — Meeting

- Aug 15 — Email

- Aug 12 — Call

Next Follow-ups

- Send proposal — Aug 19

- Follow up with John — Aug 21

The user should be able to navigate naturally between Account → Contact → Opportunity → Activity.

==================================================

10. OPPORTUNITY PIPELINE

==================================================

Create a Pipeline view.

Stages:

Discovery

→ Proposal

→ Negotiation

→ Won

→ Lost

Each Opportunity should display:

- Account

- Primary Contact

- Owner

- Stage

- Amount

- Probability

- Expected Close Date

- Next Action

Create a Kanban-style pipeline view as well as a table view.

==================================================

11. MARKETING / LEAD FUNNEL

==================================================

Create a Marketing / Manager dashboard showing:

Total Leads

MQL

SAL

SQL

Opportunities

Won

Example funnel:

1,000 Leads

↓

320 MQL

↓

180 SAL

↓

95 SQL

↓

42 Opportunities

↓

12 Won

Also show Lead Source performance:

Wix

Events

LinkedIn

Referral

Outbound

Social

Metrics:

- Lead volume

- MQL conversion

- SQL conversion

- Opportunity conversion

- Won conversion

==================================================

12. MANAGER DASHBOARD

==================================================

Managers should see the entire team's performance.

Include:

- Total Accounts

- New Leads

- MQL

- SAL

- SQL

- Open Opportunities

- Pipeline Value

- Won Revenue

- Lost Revenue

- Conversion Rates

Charts:

- Lead funnel

- Leads by source

- Pipeline by stage

- Pipeline by region

- Pipeline by sales rep

- Account Fit Score distribution

- Won revenue by month

Also highlight exceptions:

- Overdue follow-ups

- Leads not contacted within SLA

- Opportunities with no next action

- Opportunities past expected close date

==================================================

13. USERS / ROLE-BASED VIEWS

==================================================

The same underlying data should power different views.

Roles:

Sales Rep

Manager

Marketing

Admin

Sales Rep:

- My Leads

- My Accounts

- My Contacts

- My Opportunities

- My Follow-ups

Manager:

- Team Leads

- Team Pipeline

- Team Activities

- Dashboard

- All Accounts

Marketing:

- Leads

- Campaigns

- Lead Sources

- MQL performance

Admin:

- Full system access

The data should remain centralized.

Do NOT create separate copies of data for different teams.

==================================================

14. GLOBAL SEARCH

==================================================

Create a global search that can search:

- Account

- Contact

- Lead

- Opportunity

Example:

Search "Hilton"

→ Hilton Account

→ Related Contacts

→ Related Leads

→ Related Opportunities

→ Recent Activities

==================================================

15. UX PRINCIPLES

==================================================

The product should feel:

- Modern

- Fast

- Clean

- Professional

- Enterprise-ready

- Easy for sales reps

- Less complicated than Salesforce

Avoid making it look like a spreadsheet.

Use:

- Clear cards

- Tables where appropriate

- Kanban pipeline

- Timeline activity feed

- Filters

- Search

- Status badges

- Score indicators

- Charts

- Side navigation

Prioritize usability over visual decoration.

==================================================

16. IMPORTANT PRODUCT PRINCIPLE

==================================================

This should be designed as a "Sales Operating System", not just a database.

The core workflow is:

Marketing / Inbound / Outbound

→ Lead

→ MQL

→ SAL

→ SQL

→ Conversion

→ Account + Contact + Opportunity

→ Activities

→ Follow-ups

→ Won / Lost

The most important question for Sales should always be:

"What should I do next?"

The most important question for Managers should be:

"Where are our leads, pipeline, and revenue coming from, and what needs attention?"

Build the frontend around these two questions.

==================================================

17. DATA / BACKEND PREPARATION

==================================================

Even though the first version is frontend-focused, structure the application so that the following PostgreSQL/Supabase tables can be connected later:

accounts

leads

contacts

opportunities

interactions

tasks

users

campaigns

Use stable IDs and explicit relationships.

Do not hard-code fake relationships into the UI.

Use realistic mock data for the prototype.

The architecture should make it easy to replace mock data with Supabase/PostgreSQL later.

==================================================

18. FIRST VERSION PRIORITY

==================================================

Do NOT try to build every integration immediately.

First make these workflows work perfectly in the prototype:

1. Sales Home

2. Leads

3. Lead Detail

4. MQL → SAL → SQL

5. Convert Lead

6. Account 360

7. Contacts

8. Opportunities

9. Interaction Timeline

10. Today's Follow-ups

11. Manager Dashboard

After these workflows are stable, we will add:

- Wix integration

- Event registration integration

- LinkedIn Lead Gen

- Social integrations

- Gemini

- Google Sheets sync

- Email/calendar integrations

- Automated lead scoring

- Automated assignment

The product should be architected so these integrations can be added later without changing the core data model.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/99884665-f2a9-4f02-b109-938b62f0e766).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
