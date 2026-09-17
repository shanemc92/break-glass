/* ================= DATA: CORE =================================================
   Content lives here. Engine rules are in the ENGINE block further down.
   Tokens like {org} or {admin} are filled per run from the context generator.
   ========================================================================== */

const PHASES = [
    ["prep", "Preparation"], ["ident", "Identification"], ["contain", "Containment"],
    ["erad", "Eradication"], ["recover", "Recovery"], ["lessons", "Lessons learned"]
];
const KC = [
    ["recon", "Reconnaissance"], ["weapon", "Weaponisation"], ["delivery", "Delivery"],
    ["exploit", "Exploitation"], ["install", "Installation"], ["c2", "Command and control"],
    ["actions", "Actions on objectives"]
];
const PHNAME = Object.fromEntries(PHASES);
const KCNAME = Object.fromEntries(KC);

/* Organisation posture. Level 0 missing, 1 partial, 2 good. */
const CONTROLS = {
    plan:     { name: "IR plan and playbooks", lv: ["None, winging it", "Exists, never tested", "Tested this year"],
                fix: "Write IR playbooks with named roles, pre-authorised containment, an emergency change path and an out-of-band comms channel. Exercise them at least twice a year." },
    edr:      { name: "Endpoint detection", lv: ["Legacy AV only", "Partial EDR coverage", "EDR on all endpoints and servers"],
                fix: "Deploy EDR in block mode across every endpoint and server, with isolation rights held by the SOC and alternatives (switch-port, firewall) documented." },
    idp:      { name: "Identity controls", lv: ["Passwords and SMS codes", "Push MFA with gaps", "Phishing-resistant MFA and conditional access"],
                fix: "Move admins and finance to phishing-resistant MFA (FIDO2 or passkeys), enforce conditional access with compliant devices, and restrict OAuth consent." },
    logs:     { name: "Logging and SIEM", lv: ["Local logs, 7 days", "SIEM with 30 days and gaps", "SIEM with 12 months of key sources"],
                fix: "Centralise identity, VPN, EDR, email, SaaS and cloud audit logs into the SIEM with at least 12 months of retention, and forward edge device logs off-box." },
    backup:   { name: "Backups", lv: ["On the same network", "Offsite, restores untested", "Immutable, restores tested"],
                fix: "Follow 3-2-1-1-0: three copies, two media, one offsite, one immutable, zero errors on regular timed restore tests." },
    retainer: { name: "IR retainer", lv: ["None", "Insurer panel only", "Retainer with agreed SLAs"],
                fix: "Put an IR retainer in place with agreed response times, aligned with your cyber insurer's panel requirements." }
};

/* Technique library: id -> [name, tactic, kill chain stage]. Used for tags, quizzes and the debrief. */
const TECH = {
    "T1589":     ["Gather Victim Identity Information", "Reconnaissance", "recon"],
    "T1593":     ["Search Open Websites/Domains", "Reconnaissance", "recon"],
    "T1595.002": ["Active Scanning: Vulnerability Scanning", "Reconnaissance", "recon"],
    "T1597.002": ["Search Closed Sources: Purchase Technical Data", "Reconnaissance", "recon"],
    "T1583.001": ["Acquire Infrastructure: Domains", "Resource Development", "weapon"],
    "T1585":     ["Establish Accounts", "Resource Development", "weapon"],
    "T1588.005": ["Obtain Capabilities: Exploits", "Resource Development", "weapon"],
    "T1608.005": ["Stage Capabilities: Link Target", "Resource Development", "weapon"],
    "T1566.002": ["Phishing: Spearphishing Link", "Initial Access", "delivery"],
    "T1566.004": ["Phishing: Spearphishing Voice", "Initial Access", "delivery"],
    "T1656":     ["Impersonation", "Defense Evasion", "delivery"],
    "T1190":     ["Exploit Public-Facing Application", "Initial Access", "exploit"],
    "T1204.004": ["User Execution: Malicious Copy and Paste", "Execution", "exploit"],
    "T1059.001": ["Command and Scripting Interpreter: PowerShell", "Execution", "exploit"],
    "T1557":     ["Adversary-in-the-Middle", "Credential Access", "exploit"],
    "T1539":     ["Steal Web Session Cookie", "Credential Access", "exploit"],
    "T1621":     ["Multi-Factor Authentication Request Generation", "Credential Access", "exploit"],
    "T1552.001": ["Unsecured Credentials: Credentials In Files", "Credential Access", "exploit"],
    "T1003":     ["OS Credential Dumping", "Credential Access", "exploit"],
    "T1110.003": ["Brute Force: Password Spraying", "Credential Access", "exploit"],
    "T1078":     ["Valid Accounts", "Initial Access, Persistence", "exploit"],
    "T1078.004": ["Valid Accounts: Cloud Accounts", "Initial Access, Persistence", "exploit"],
    "T1550.004": ["Use Alternate Authentication Material: Web Session Cookie", "Defense Evasion, Lateral Movement", "exploit"],
    "T1555.003": ["Credentials from Password Stores: Credentials from Web Browsers", "Credential Access", "exploit"],
    "T1505.003": ["Server Software Component: Web Shell", "Persistence", "install"],
    "T1133":     ["External Remote Services", "Persistence, Initial Access", "install"],
    "T1136":     ["Create Account", "Persistence", "install"],
    "T1053.005": ["Scheduled Task/Job: Scheduled Task", "Persistence, Execution", "install"],
    "T1098":     ["Account Manipulation", "Persistence", "install"],
    "T1564.008": ["Hide Artifacts: Email Hiding Rules", "Defense Evasion", "install"],
    "T1528":     ["Steal Application Access Token", "Credential Access", "install"],
    "T1562.001": ["Impair Defenses: Disable or Modify Tools", "Defense Evasion", "install"],
    "T1070.001": ["Indicator Removal: Clear Windows Event Logs", "Defense Evasion", "install"],
    "T1219":     ["Remote Access Tools", "Command and Control", "c2"],
    "T1071.001": ["Application Layer Protocol: Web Protocols", "Command and Control", "c2"],
    "T1105":     ["Ingress Tool Transfer", "Command and Control", "c2"],
    "T1021.001": ["Remote Services: Remote Desktop Protocol", "Lateral Movement", "actions"],
    "T1534":     ["Internal Spearphishing", "Lateral Movement", "actions"],
    "T1213":     ["Data from Information Repositories", "Collection", "actions"],
    "T1114.002": ["Email Collection: Remote Email Collection", "Collection", "actions"],
    "T1114.003": ["Email Collection: Email Forwarding Rule", "Collection", "actions"],
    "T1567":     ["Exfiltration Over Web Service", "Exfiltration", "actions"],
    "T1567.002": ["Exfiltration Over Web Service: Exfiltration to Cloud Storage", "Exfiltration", "actions"],
    "T1484.001": ["Domain or Tenant Policy Modification: Group Policy Modification", "Defense Evasion, Privilege Escalation", "actions"],
    "T1490":     ["Inhibit System Recovery", "Impact", "actions"],
    "T1486":     ["Data Encrypted for Impact", "Impact", "actions"],
    "T1657":     ["Financial Theft", "Impact", "actions"],
    "T1591":     ["Gather Victim Org Information", "Reconnaissance", "recon"],
    "T1593.003": ["Search Open Websites/Domains: Code Repositories", "Reconnaissance", "recon"],
    "T1596.005": ["Search Open Technical Databases: Scan Databases", "Reconnaissance", "recon"],
    "T1583.005": ["Acquire Infrastructure: Botnet", "Resource Development", "weapon"],
    "T1608.001": ["Stage Capabilities: Upload Malware", "Resource Development", "weapon"],
    "T1195.001": ["Supply Chain Compromise: Compromise Software Dependencies and Development Tools", "Initial Access", "delivery"],
    "T1195.002": ["Supply Chain Compromise: Compromise Software Supply Chain", "Initial Access", "actions"],
    "T1110.004": ["Brute Force: Credential Stuffing", "Credential Access", "exploit"],
    "T1580":     ["Cloud Infrastructure Discovery", "Discovery", "exploit"],
    "T1098.001": ["Account Manipulation: Additional Cloud Credentials", "Persistence", "install"],
    "T1098.004": ["Account Manipulation: SSH Authorized Keys", "Persistence", "install"],
    "T1562.008": ["Impair Defenses: Disable or Modify Cloud Logs", "Defense Evasion", "install"],
    "T1219.003": ["Remote Access Tools: Remote Access Hardware", "Command and Control", "install"],
    "T1213.003": ["Data from Information Repositories: Code Repositories", "Collection", "actions"],
    "T1567.001": ["Exfiltration Over Web Service: Exfiltration to Code Repository", "Exfiltration", "actions"],
    "T1496.001": ["Resource Hijacking: Compute Hijacking", "Impact", "actions"],
    "T1485":     ["Data Destruction", "Impact", "actions"],
    "T1498":     ["Network Denial of Service", "Impact", "actions"],
    "T1499.002": ["Endpoint Denial of Service: Service Exhaustion Flood", "Impact", "actions"],
    "T1005":     ["Data from Local System", "Collection", "actions"],
    "T1074.001": ["Data Staged: Local Data Staging", "Collection", "actions"],
    "T1052.001": ["Exfiltration Over Physical Medium: USB", "Exfiltration", "actions"],
    "T1530":     ["Data from Cloud Storage", "Collection", "actions"],
    "T1200":     ["Hardware Additions", "Initial Access", "delivery"],
    "T1090":     ["Proxy", "Command and Control", "c2"],
    "T1011":     ["Exfiltration Over Other Network Medium", "Exfiltration", "actions"],
    "T1046":     ["Network Service Discovery", "Discovery", "exploit"],
    "T1199":     ["Trusted Relationship", "Initial Access", "exploit"],
    "T1072":     ["Software Deployment Tools", "Execution, Lateral Movement", "actions"],
    "T1561":     ["Disk Wipe", "Impact", "actions"],
    "T1529":     ["System Shutdown/Reboot", "Impact", "actions"],
    "T0883":     ["Internet Accessible Device (ATT&CK for ICS)", "ICS: Initial Access", "exploit"],
    "T0812":     ["Default Credentials (ATT&CK for ICS)", "ICS: Lateral Movement", "exploit"],
    "T0836":     ["Modify Parameter (ATT&CK for ICS)", "ICS: Impair Process Control", "actions"],
    "T0829":     ["Loss of View (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "T0831":     ["Manipulation of Control (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "T0880":     ["Loss of Safety (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "AML.T0051.001": ["LLM Prompt Injection: Indirect (MITRE ATLAS)", "ATLAS: Execution", "exploit"],
    "AML.T0057": ["LLM Data Leakage (MITRE ATLAS)", "ATLAS: Exfiltration", "actions"],
    "T1056.003": ["Input Capture: Web Portal Capture", "Collection", "exploit"],
    "T1451":     ["SIM Card Swap (Mobile ATT&CK)", "Impact", "exploit"],
    "T1111":     ["Multi-Factor Authentication Interception", "Credential Access", "exploit"],
    "T1584.001": ["Compromise Infrastructure: Domains", "Resource Development", "weapon"],
    "T1588.004": ["Obtain Capabilities: Digital Certificates", "Resource Development", "weapon"],
    "T1660":     ["Phishing (Mobile ATT&CK)", "Initial Access", "delivery"],
    "T1635":     ["Steal Application Access Token (Mobile ATT&CK)", "Credential Access", "exploit"],
    "T1517":     ["Access Notifications (Mobile ATT&CK)", "Collection", "actions"]
};

/* Run context pools. All organisations are fictional. */
const ORGS = [
    ["Harbourline Logistics", "harbourline", "Logistics and freight", true],
    ["Kestrel Foods", "kestrel", "Food manufacturing", true],
    ["Meridian Health Partners", "meridian", "Private healthcare", true],
    ["Brightwater Utilities", "brightwater", "Water and energy utility", true],
    ["Cobalt and Finch", "cobaltfinch", "Legal services", false],
    ["Northgate Retail Group", "northgate", "Retail", false],
    ["Ashgrove Engineering", "ashgrove", "Precision manufacturing", true],
    ["Tidewell Pharma", "tidewell", "Pharmaceuticals", true],
    ["Quayside Hotels", "quayside", "Hospitality", false],
    ["Lumen Credit Union", "lumen", "Financial services", false],
    /* scenario-only organisations (fifth field): used when a scenario lists them in orgs */
    ["Vantage Software", "vantage", "Software and SaaS", false, true],
    ["Fieldline Analytics", "fieldline", "Data analytics software", false, true]
];
const FIRST = ["Aoife", "Ciaran", "Niamh", "Declan", "Sinead", "Padraig", "Grainne", "Eoin", "Orla", "Fergal",
               "Siobhan", "Colm", "Priya", "Tomasz", "Marta", "Kwame", "Chen", "Luis", "Hannah", "Gareth"];
const LAST  = ["Byrne", "Kelly", "Walsh", "Doyle", "Murphy", "Nolan", "Kavanagh", "Farrell", "Kowalski",
               "Okafor", "Novak", "Reilly", "Brennan", "Quinn", "Lynch", "Dunne"];
const SITES = ["the Mullingar DR site", "the Athlone data centre", "the Cork office", "the Dundalk warehouse"];
const SUPPLIERS = ["Delaney Packaging", "Brightside Components", "Kerr and Sons Freight", "Nordic Pallet Co"];
const SAAS = ["Clientwise CRM", "PipelineHQ", "Relata CRM"];
const PLANTS = ["Navan", "Tullamore", "Carlow", "Ennis"];

/* Generic outcomes when a good action fails its roll. */
const FAILS = [
    "{admin} typed the new password too fast, three times. The account is locked, and so is {admin}'s patience. 30 minutes lost.",
    "The EDR command queued behind 4,000 pending policy updates. It runs, eventually.",
    "Right action, wrong tenant. You had the test tenant open. Fixed 30 minutes later, with a red face.",
    "The script ran on 47 of 48 hosts. The 48th is a Windows Server 2008 box nobody knew existed.",
    "The vendor portal you need is down for 'scheduled maintenance'. It is always scheduled maintenance.",
    "Teams went down, nothing to do with the attacker, just a Tuesday. Coordination slips while everyone finds the backup channel.",
    "The one person with the rights to do it is at the dentist with a mouth full of cotton wool. Instructions are relayed by thumbs.",
    "Autocorrect changed a hostname in the runbook command. It errored loudly and cost 20 minutes.",
    "The approval workflow emailed the approver. The approver's mailbox is one of the ones you just locked.",
    "It works, but the admin laptop picks this exact moment to install 34 Windows updates."
];

/* ---------- shared nodes ---------- */
/* PREP/PIR come in reworded variants; getNode picks one per scenario so the
   opening and closing decisions are not word-for-word identical every run.
   Same underlying action and scoring in each variant. */
const PREP_SET = [
    {
        id: "PREP", ph: "prep", title: "Mobilise",
        text: "Before you touch a single system: the first ten minutes decide how the next ten days go. How do you kick off?",
        disc: "Where is your out-of-band channel, who is in it, and is it written into the IR plan?",
        opts: [
            { q: 3, u: ["plan"], t: "Declare an incident, assign roles and a scribe, and move the team to an out-of-band channel",
              r: "Incident declared ten minutes in. The scribe starts the timeline and the team moves to the out-of-band channel.",
              f: "The out-of-band group chat is up fast. {admin} accidentally adds their mum. She sends a thumbs up. Removing her costs 10 minutes and some dignity.",
              w: "Roles, a timeline and out-of-band comms are the foundations. If the attacker is in email or Teams, they can read your response." },
            { q: 2, t: "Dig in yourself first so you can brief everyone properly once you know what you're dealing with",
              r: "You learn a lot quickly. Nobody else knows the incident exists and nothing is written down.",
              w: "Speed matters, but a lone analyst leaves no timeline, no decision log and no comms. Declare early; you can always stand down." },
            { q: 1, t: "Email the IT team and execs from your corporate mailbox so everyone knows what's going on",
              r: "Everyone knows now, including anyone reading the mailboxes. Two execs reply-all with questions.",
              w: "Corporate email may be compromised. Use an out-of-band channel and a measured first notification." },
            { q: 0, t: "Hold off until tomorrow's stand-up, most of these alerts turn out to be false positives anyway",
              r: "The attacker does not wait for the stand-up.",
              w: "Dwell time is the attacker's best friend. Triage now, even if it turns out benign." }
        ]
    },
    {
        id: "PREP", ph: "prep", title: "First ten minutes",
        text: "Alerts are in and the room is looking at you. Nothing's confirmed, but the clock has started. What's your opening move?",
        disc: "Who can declare an incident in your organisation, and what happens in the first ten minutes after they do?",
        opts: [
            { q: 3, u: ["plan"], t: "Declare an incident, name a lead and scribe, and open an out-of-band channel",
              r: "Minutes in there's a lead, a running timeline and a channel the attacker can't read.",
              f: "The channel's up quickly, then someone adds the wrong 'Dave' from the directory. A minute to undo, some laughs.",
              w: "An incident needs an owner, a written timeline and comms the attacker can't see. Declaring early costs nothing; you can stand down later." },
            { q: 2, t: "Investigate quietly on your own and brief the team once you have the full picture",
              r: "You learn a lot fast. Nobody else knows this is happening and nothing is being recorded.",
              w: "A lone analyst leaves no timeline, no decision log and no cover. Declare early, then dig in." },
            { q: 1, t: "Fire off an all-hands email from your work account so everyone is aware straight away",
              r: "Everyone's aware now, including anyone sitting in the mailboxes. The reply-all pile grows.",
              w: "Corporate email may be compromised and a broadcast just adds noise. Use out-of-band and a measured first note." },
            { q: 0, t: "Give it an hour to see whether the alerts settle down by themselves",
              r: "They don't settle. They multiply.",
              w: "Dwell time favours the attacker. Triage now, even if it turns out to be nothing." }
        ]
    },
    {
        id: "PREP", ph: "prep", title: "Who's in the room",
        text: "This is real enough to act on. Before anyone touches a system, how do you stand the response up?",
        disc: "If this kicked off right now, who would you need in the room in the first fifteen minutes?",
        opts: [
            { q: 3, u: ["plan"], t: "Stand up the incident with clear roles, a scribe and a channel off the corporate network",
              r: "Roles are assigned, the scribe starts logging, and the bridge is somewhere the attacker can't listen in.",
              f: "Solid start, though the only person who knows the bridge PIN is mid-flight. You spin up a chat instead.",
              w: "Clear roles, a timeline and out-of-band comms are the foundation everything else rests on." },
            { q: 2, t: "Pull the key logs together first so that the briefing you give is accurate",
              r: "Good evidence, but the incident still isn't declared and nobody is coordinating.",
              w: "Evidence matters, but someone has to own and record the response from minute one." },
            { q: 1, t: "Loop the executives in by email so they hear about it from you first",
              r: "They hear it, reply with questions, and so does anyone reading their mail.",
              w: "Lead with a controlled out-of-band notification, not a corporate-email broadcast." },
            { q: 0, t: "Hold off until the morning stand-up so you don't raise a false alarm",
              r: "The attacker does not observe your stand-up schedule.",
              w: "Waiting hands the attacker time. Triage now and stand down if it's benign." }
        ]
    },
    {
        id: "PREP", ph: "prep", title: "Break glass",
        text: "The signal's strong enough that ignoring it isn't an option. How do you get the response moving?",
        disc: "Is there a written first-response checklist, and when did anyone last actually run it?",
        opts: [
            { q: 3, u: ["plan"], t: "Call it in: incident declared, roles set, scribe logging, comms moved off-band",
              r: "Ten minutes in you have an owner, a timeline and a channel the intruder can't see.",
              f: "All set, except the scribe's laptop picks now to install updates. Someone grabs a notepad.",
              w: "Declaring gives the response an owner and a record; out-of-band keeps it private if email or chat is compromised." },
            { q: 2, t: "Keep it low-key and dig in solo until you're certain it's genuine",
              r: "You get answers, alone, with nothing written down and no one else aware.",
              w: "A single quiet analyst leaves no log and no cover. Declare, then investigate with the team." },
            { q: 1, t: "Post it in the main IT channel so the whole team can jump straight on it",
              r: "The team jumps on it. So might whoever is already sitting in that channel.",
              w: "The main channel may be watched. Move to out-of-band before you say much." },
            { q: 0, t: "Give it an hour in case it's just some noisy alerting playing up",
              r: "The hour passes. So does your head start.",
              w: "Dwell time is the attacker's friend. Triage immediately." }
        ]
    },
    {
        id: "PREP", ph: "prep", title: "Clock's running",
        text: "Whatever this is, it's moving, and the first calls set the tone for the next ten days. Where do you start?",
        disc: "What are the very first three things your plan says to do, and can the on-call analyst do them alone?",
        opts: [
            { q: 3, u: ["plan"], t: "Declare, assign a lead and scribe, and get everyone onto an out-of-band bridge",
              r: "The incident's live, the timeline's running and the team is talking somewhere private.",
              f: "Bridge is up fast; one person keeps typing in the old channel out of habit. Gently redirected.",
              w: "Roles, a running timeline and private comms are the base. Stand it up first, refine as you learn." },
            { q: 2, t: "Get across the detail yourself before you pull anyone else into it",
              r: "You're well informed and completely alone, with nothing logged.",
              w: "Solo triage leaves no record and no coordination. Declare early and bring people in." },
            { q: 1, t: "Email IT and the execs so the right people are looped in immediately",
              r: "They're looped in, along with anyone reading those inboxes, and the replies start.",
              w: "Corporate mail may be compromised; a broadcast adds noise. Use out-of-band and a measured note." },
            { q: 0, t: "Sit tight for a bit, since most of these turn out to be nothing anyway",
              r: "Not this time. It grows while you wait.",
              w: "Assuming a false positive burns the time that matters most. Triage now." }
        ]
    }
];
const PIR_SET = [
    {
        id: "PIR", ph: "lessons", title: "Post-incident review",
        text: "The incident is closed. Everyone is tired and the business wants to move on. How do you run the post-incident review?",
        disc: "When did your last post-incident review produce an action that was actually funded and closed?",
        opts: [
            { q: 3, t: "Run a blameless review within two weeks, with an owner and date for every action",
              r: "Review held on day 10. 23 actions, each with an owner and a date.",
              w: "Lessons only count when they become funded actions with owners. Blameless reviews get honest timelines." },
            { q: 2, t: "Write up a detailed report yourself and send it to the CISO while the details are fresh",
              r: "The CISO reads it on a train and says 'good stuff'.",
              w: "Better than nothing, but one perspective misses what went wrong in comms, legal and the business." },
            { q: 1, t: "Hold a formal review focused on establishing exactly who made the errors, so accountability is clear",
              r: "Someone is found to blame. Next month, three near misses go unreported.",
              w: "Blame makes people hide mistakes, which lengthens detection next time." },
            { q: 0, t: "Skip the formal review, the team is exhausted and the business needs everyone back on normal work",
              r: "Six months later the same gap is used again.",
              w: "The same gaps will be there for the next attacker, who may well be the same one." }
        ]
    },
    {
        id: "PIR", ph: "lessons", title: "The write-up",
        text: "It's over. Everyone's shattered and the business wants to move on. How do you close it out properly?",
        disc: "After your last incident, what actually changed, and who made sure it did?",
        opts: [
            { q: 3, t: "Hold a blameless review within two weeks, each action with an owner and a due date",
              r: "The review lands on day nine. Every action has a name and a date attached.",
              w: "Lessons only count when they become funded actions with owners. Blameless sessions surface honest timelines." },
            { q: 2, t: "Write the report yourself while it's fresh and send it straight up to the CISO",
              r: "The CISO skims it approvingly. Nothing gets assigned.",
              w: "One person's write-up misses the comms, legal and business angles, and rarely turns into action." },
            { q: 1, t: "Run a review focused on pinning down exactly who slipped up, so it's taken seriously",
              r: "A culprit is found. Next month, the near-misses quietly stop getting reported.",
              w: "Blame teaches people to hide mistakes, which lengthens detection next time." },
            { q: 0, t: "Skip it; the team is exhausted and there's a backlog of normal work to clear",
              r: "The same gap is sitting there waiting to be used again.",
              w: "Skip the review and the next attacker inherits the same open door." }
        ]
    },
    {
        id: "PIR", ph: "lessons", title: "Lessons, or the lack of them",
        text: "The incident's closed and the pressure is off. Do you actually capture what happened, and how?",
        disc: "Where do your incident lessons live now, and has anyone read them since?",
        opts: [
            { q: 3, t: "Run a timely blameless retro with owners and dates, tracked through to completion",
              r: "Actions are logged with owners and dates, and someone is on the hook to close each one.",
              w: "A review is only worth it if the actions get funded, owned and finished. Blameless keeps it honest." },
            { q: 2, t: "Circulate a detailed write-up for people to read through at their own pace",
              r: "It's read, nodded at, and quietly filed away.",
              w: "A document nobody owns changes nothing. Turn findings into assigned actions." },
            { q: 1, t: "Focus the post-mortem on accountability so that it can't just happen again",
              r: "Someone carries the blame. Reporting of small issues dries up.",
              w: "Accountability theatre suppresses the reporting you rely on to detect the next one." },
            { q: 0, t: "Move on; there's real work piling up and everyone knows what went wrong",
              r: "Six months later, they clearly didn't.",
              w: "Unwritten lessons evaporate. The gap stays open for the next attacker." }
        ]
    },
    {
        id: "PIR", ph: "lessons", title: "Before everyone forgets",
        text: "The dust has settled. Memories are already fading and inboxes are full. How do you handle the review?",
        disc: "How long after an incident do you hold the review, and is that soon enough to remember the detail?",
        opts: [
            { q: 3, t: "Run a blameless post-incident review soon, with a funded action for each finding",
              r: "Held while it's fresh; findings come out as funded actions with owners and dates.",
              w: "Reviews create value only when findings become owned, funded actions. Blameless gets you the real story." },
            { q: 2, t: "Send your own thorough report to leadership and consider the incident captured",
              r: "Leadership appreciates it. Nothing changes on the ground.",
              w: "A single-author report misses whole angles and rarely converts into action." },
            { q: 1, t: "Establish who was responsible so that the lessons are properly taken seriously",
              r: "The blame lands. The honesty leaves with it.",
              w: "Fear of blame makes people bury mistakes, slowing you down next time." },
            { q: 0, t: "Let it go; the team needs a break and normal work is already waiting",
              r: "The break is nice. The unfixed gap is still there.",
              w: "Skipping the review guarantees the same weakness greets the next attacker." }
        ]
    }
];
const SHARED = {
    PREP: PREP_SET[0],
    PIR: PIR_SET[0],
    FAIL: {
        id: "FAIL", ph: "recover", title: "Overwhelmed",
        text: "{org} is overwhelmed. Systems are down across the business, the story is on the front page and the board has brought in an external firm to take over the response. The incident is no longer being managed, it is being survived. Time for the honest part.",
        opts: [ { t: "Go to lessons learned" } ]
    }
};
