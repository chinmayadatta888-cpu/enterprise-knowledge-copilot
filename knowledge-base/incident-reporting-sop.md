# Incident Reporting Standard Operating Procedure

**Document ID:** SOP-INC-002  
**Version:** 1.5  
**Last Updated:** 2024-01-18  
**Owner:** Security & Operations

## Purpose

This SOP defines the process for identifying, reporting, classifying, and escalating security incidents and operational issues to ensure rapid response and compliance with regulatory requirements.

## Scope

Applies to all employees, contractors, and third-party vendors who discover or suspect a security incident, data breach, system outage, or operational anomaly.

## Incident Classification

### Severity Levels

| Level | Name | Response Time | Examples |
|-------|------|----------------|----------|
| **P1** | Critical | 15 minutes | Data breach, ransomware, complete system outage, unauthorized access |
| **P2** | High | 1 hour | Partial service degradation, suspicious activity, failed authentication attempts |
| **P3** | Medium | 4 hours | Configuration drift, minor security alert, performance degradation |
| **P4** | Low | 24 hours | Informational alerts, policy violations, documentation issues |

### Incident Categories

- **Security:** Unauthorized access, malware, phishing, data exfiltration
- **Availability:** System outage, service degradation, performance issues
- **Compliance:** Policy violation, audit finding, regulatory concern
- **Operational:** Configuration error, deployment issue, process failure

---

## Reporting Process

### Step 1: Identify & Assess (Employee)

**Timeline:** Immediate upon discovery

When you discover a potential incident:

1. **Do NOT ignore it.** Even minor anomalies may indicate a larger issue.
2. **Assess severity** using the classification table above.
3. **Preserve evidence** – do not modify, delete, or restart systems without guidance.
4. **Document observations:**
   - What did you notice? (e.g., unusual network traffic, failed login, system error)
   - When did it occur? (timestamp)
   - Who was affected? (users, systems, data)
   - What actions have you taken? (if any)

**Example:**
```
Observation: Multiple failed login attempts to admin account from IP 203.0.113.45
Time: 2024-01-18 14:32 UTC
Affected: Admin account (admin@company.com)
Actions: Locked account, did not investigate further
```

---

### Step 2: Report Incident (Employee → Security Team)

**Timeline:** Within 15 minutes for P1, 1 hour for P2, 4 hours for P3/P4

**Reporting Channels:**

| Severity | Channel | Contact |
|----------|---------|---------|
| **P1** | Phone + Email | Security Hotline: +1-555-0100 / security-critical@company.com |
| **P2** | Email + Slack | security-team@company.com / #security-incidents |
| **P3/P4** | Email | security-team@company.com |

**Report Template:**

```
Subject: [INCIDENT] [P1/P2/P3/P4] Brief Description

To: security-team@company.com

Incident Summary:
- Category: [Security / Availability / Compliance / Operational]
- Severity: [P1 / P2 / P3 / P4]
- Discovered: [Date/Time UTC]
- Reported By: [Your Name, Department]

Description:
[Detailed description of what was observed]

Evidence:
- Screenshots: [attached or links]
- Logs: [file names or excerpts]
- Affected Systems: [list]
- Affected Users: [list]

Actions Taken:
[What have you done so far?]

Contact Info:
- Phone: [your number]
- Email: [your email]
```

---

### Step 3: Triage & Escalation (Security Team)

**Timeline:** Within 30 minutes of report

Security team will:

1. **Acknowledge receipt** of the report
2. **Verify severity** and re-classify if needed
3. **Assign incident ID** (e.g., INC-2024-001234)
4. **Escalate to Incident Commander** if P1 or P2
5. **Notify stakeholders** (department lead, affected users, compliance if needed)

**Escalation Matrix:**

| Severity | Escalates To | Notification |
|----------|--------------|--------------|
| **P1** | CISO + VP Ops + Legal | Immediate |
| **P2** | Security Manager + Department Lead | Within 1 hour |
| **P3** | Security Team Lead | Within 4 hours |
| **P4** | Security Team | Within 24 hours |

---

### Step 4: Investigation & Containment (Incident Response Team)

**Timeline:** Ongoing; updates every 2 hours for P1/P2

The incident response team will:

1. **Isolate affected systems** (if necessary to prevent spread)
2. **Collect forensic evidence** (logs, memory dumps, network captures)
3. **Determine root cause** and scope of impact
4. **Implement containment measures** (block IPs, revoke credentials, patch systems)
5. **Log all actions** in incident tracking system (reference Atlas API v2 for automated logging if applicable)

**Incident Tracking:**
- All incidents are logged in the centralized incident management system
- For API-related incidents, use [Atlas API v2](./atlas-api-v2.md) endpoints to query incident logs and generate reports
- See [Employee Onboarding SOP](./employee-onboarding-sop.md) for API access provisioning

---

### Step 5: Communication & Updates

**Timeline:** Ongoing

- **P1/P2:** Status updates every 2 hours to stakeholders
- **P3:** Daily updates
- **P4:** Updates as needed

**Communication Channels:**
- Slack: #incident-response (internal team)
- Email: Stakeholder notifications
- War Room: Conference bridge for P1 incidents

---

### Step 6: Resolution & Closure

**Timeline:** After containment and verification

1. **Verify remediation** – confirm incident is resolved
2. **Notify stakeholders** of resolution
3. **Document lessons learned** – what went wrong, how to prevent recurrence
4. **Update incident record** with final status and root cause
5. **Schedule post-incident review** (P1/P2 only) within 5 business days

**Post-Incident Review Agenda:**
- Timeline of events
- Root cause analysis
- Preventive measures
- Action items and owners
- Training recommendations

---

## Escalation Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| CISO | David Park | +1-555-0101 | david.park@company.com |
| Security Manager | Elena Vasquez | +1-555-0102 | elena.vasquez@company.com |
| VP Operations | Jennifer Liu | +1-555-0103 | jennifer.liu@company.com |
| IT Director | Marcus Rodriguez | +1-555-0104 | marcus.rodriguez@company.com |

---

## Related Documents

- [Employee Onboarding SOP](./employee-onboarding-sop.md)
- [Atlas API v2 Documentation](./atlas-api-v2.md) (for incident logging)
- Security Policy (internal wiki)
- Data Breach Response Plan (internal wiki)

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CISO | David Park | 2024-01-18 | ✓ |
| VP Operations | Jennifer Liu | 2024-01-18 | ✓ |
| Legal Counsel | Robert Chen | 2024-01-18 | ✓ |
