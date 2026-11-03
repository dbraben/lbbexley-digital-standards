# Cookies and analytics

The Privacy and Electronic Communications Regulations (PECR, regulation 6) cover cookies and anything similar that stores or reads information on someone's device: local storage, pixels, fingerprinting and tracking scripts.

## What needs consent

| Purpose | Consent? |
|---|---|
| Strictly necessary for a service the person asked for. This includes sign-in, remembering answers in a form, security, preventing fraud and detecting technical faults | No |
| Analytics whose only purpose is to improve the council's own site or service | No, but only if people get clear information and a simple, free way to object. The data can be shared only with someone helping to make those improvements, so a tool that also uses it for its own purposes still needs consent |
| Remembering the person's choices about how the site looks or works, such as text size or language | No, if people get clear information and a simple, free way to object |
| Advertising, cross-site tracking, social media pixels, embedded content that tracks | Yes, always, before anything is set |

The analytics and appearance exceptions, and the clearer list of strictly necessary purposes, apply from 5 February 2026 (section 112 of the Data (Use and Access) Act 2025, which added Schedule A1 to PECR). Information Governance decides how they apply to the council's sites.

## Rules for builds

1. **Don't add analytics, tracking or advertising scripts yourself.** The council's analytics approach is set centrally. The standards check flags common tracking hosts (Google Tag Manager, Google Analytics, Microsoft Clarity, Hotjar, Facebook and LinkedIn pixels).
2. **No Google Fonts or other third-party font links.** They send each visitor's IP address to a third party. Self-host Lato (brand skill).
3. **Embedded media** (YouTube, maps, social posts) can set tracking cookies. Use privacy-enhanced modes (such as youtube-nocookie.com) and show a placeholder until the person chooses to load it.
4. **List every cookie** the site sets on the cookies page, with its purpose and how long it lasts. Check in the browser's developer tools (Application > Cookies) on a fresh visit.
5. **Consent means a real choice.** Equal "Accept" and "Reject" buttons, nothing non-essential set before a choice, and an easy way to change it later.

## Power Pages

Power Pages sets essential cookies for sign-in, security and load balancing. Record them on the cookies page. Anything you add on top follows the table above.
