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
    "T0883":     ["Internet Accessible Device (ATT&CK for ICS)", "ICS: Initial Access", "exploit"],
    "T0812":     ["Default Credentials (ATT&CK for ICS)", "ICS: Lateral Movement", "exploit"],
    "T0836":     ["Modify Parameter (ATT&CK for ICS)", "ICS: Impair Process Control", "actions"],
    "T0829":     ["Loss of View (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "T0831":     ["Manipulation of Control (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "T0880":     ["Loss of Safety (ATT&CK for ICS)", "ICS: Impact", "actions"],
    "AML.T0051.001": ["LLM Prompt Injection: Indirect (MITRE ATLAS)", "ATLAS: Execution", "exploit"],
    "AML.T0057": ["LLM Data Leakage (MITRE ATLAS)", "ATLAS: Exfiltration", "actions"]
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
const SHARED = {
    PREP: {
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
    PIR: {
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
    FAIL: {
        id: "FAIL", ph: "recover", title: "Overwhelmed",
        text: "{org} is overwhelmed. Systems are down across the business, the story is on the front page and the board has brought in an external firm to take over the response. The incident is no longer being managed, it is being survived. Time for the honest part.",
        opts: [ { t: "Go to lessons learned" } ]
    }
};
