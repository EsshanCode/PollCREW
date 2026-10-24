# PollCREW demo · 2 minutes 40 seconds

Before recording, start both servers, prewarm the embedding model, open the app, and reset the demo. Keep the browser at a desktop width. This script uses the working local app; it does not imply live election data. The optional companion MP4 is a captioned walkthrough assembled from actual app screenshots, not a continuous screen recording.

**0:00–0:20 · National view**

“PollCREW coordinates election-worker staffing across jurisdictions. This is a nonpartisan prototype with 150 synthetic workers in North Carolina, Wisconsin, and Arizona. These markers show demo coverage, not a live national feed.”

Select Wake County.

**0:20–0:55 · Worker skills**

Open Workers and select Jordan Rivera. Enter: “I helped with registration and data entry. I troubleshoot tablets and printers. I led a team of volunteers.” Click Extract suggested skills. Confirm check-in, reject equipment, and confirm leadership. Save the profile.

“Experience becomes suggested skills with supporting text. This demonstration uses visibly labeled offline extraction; a server-side AI extraction option is available. Workers choose what to confirm. Rejected and unconfirmed skills cannot influence matching.”

**0:55–1:20 · Generate and explain**

Click Generate assignments. Open Assignments.

“CP-SAT builds the plan from confirmed skills, full-shift availability, training, travel limits, and coordinator-defined staffing requirements. Wake can deploy six extra check-in workers; the solver puts them where they cut long-line risk the most. Each assignment explains the match. The LLM does not assign anyone.”

Approve the plan. Open Overview.

**1:20–1:40 · Risk and baseline**

“Queue risk comes from 5,000 seeded no-show scenarios, checked against an exact calculation. With no extra staff, there’s a 52% chance some Wake site has a modeled wait over thirty minutes. Spreading six extra workers evenly gets that to about 11%. PollCREW places the same six and gets it to under 3%.”

Open Evaluation. Point to the trade-off chart and the exact line-risk row. It is not an individual voter’s wait probability.

**1:40–2:15 · Cancellation recovery**

Click Simulate 3 cancellations. Show 31 preserved assignments and risk jumping to 100%: one site no longer has enough check-in capacity. Click Recover with backups. Show three replacements, all 31 unaffected assignments preserved, and risk back near 2%.

“Three workers cancel. They stay unavailable. We re-solve with backups and lock every unaffected approved assignment. If the requirements cannot be met, the app returns an actionable error instead of breaking constraints.”

Optional, if time allows: instead of the button, open **Poll worker view**, find NC-002, and tap **I can't make it** to show the cancellation coming from a worker's phone in plain language, with a Spanish toggle and large text.

**2:15–2:40 · Coordinator control**

Click Approve revised plan, then Overview.

“The coordinator reviews and approves the revised plan. The same engine supports different staffing counts and skills across these demo jurisdictions. Reset makes the presentation reproducible. This project was built with substantial AI assistance, fully disclosed in the README.”

End on the approved recovery dashboard. No public deployment or submission is authorized by this script.
