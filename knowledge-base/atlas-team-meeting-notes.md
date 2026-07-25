# Atlas Team Meeting Notes

**Date:** 2024-01-16  
**Time:** 10:00 AM – 11:30 AM UTC  
**Location:** Conference Room B / Zoom  
**Attendees:** Marcus Rodriguez (IT Director), Elena Vasquez (Security Manager), Sarah Chen (HR Director), David Park (CISO), Alex Kim (API Lead), Jennifer Liu (VP Operations)

---

## Agenda

1. Atlas API v2 rollout status
2. v1 deprecation timeline and migration support
3. Security enhancements in v2
4. Q&A and action items

---

## Discussion Notes

### 1. Atlas API v2 Rollout Status

**Alex Kim (API Lead):**
- v2 released to production on 2024-02-01 (on schedule)
- Current adoption: ~35% of internal integrations migrated
- Target: 80% migration by 2024-05-01
- Remaining blockers: 3 legacy systems still on v1, awaiting vendor updates

**Key Points:**
- v2 is stable and performing well in production
- OAuth 2.0 authentication is working as expected
- New `requestId` and `timestamp` fields are helping with debugging and audit trails
- Rate limits increased from 1000 to 5000 requests/hour (positive feedback from teams)

**Action Item:** Alex to follow up with vendor teams on legacy system migrations by 2024-02-15

---

### 2. v1 Deprecation Timeline & Migration Support

**Marcus Rodriguez (IT Director):**
- v1 sunset date: **2024-06-30** (confirmed)
- All v1 endpoints will return `410 Gone` after sunset
- Migration guide published: [Atlas API v2 Documentation](./atlas-api-v2.md)

**Migration Support:**
- API support team available for questions: api-support@atlas.internal
- Weekly migration office hours: Tuesdays 2:00 PM UTC
- Slack channel: #atlas-api-migration (for peer support)

**Elena Vasquez (Security Manager):**
- v1 API keys will be revoked on 2024-06-30
- All teams must rotate to OAuth 2.0 tokens before sunset
- Security audit of remaining v1 integrations scheduled for 2024-04-01

**Action Item:** Marcus to send migration reminder email to all API consumers by 2024-02-05

---

### 3. Security Enhancements in v2

**David Park (CISO):**
- OAuth 2.0 requirement improves security posture significantly
- Dual-auth mode (API key + OAuth) available for transitional period only
- New `requestId` field enables better audit logging and incident tracking

**Elena Vasquez (Security Manager):**
- v2 integrates with incident logging system (see [Incident Reporting SOP](./incident-reporting-sop.md))
- All API calls now logged with `requestId` for forensic analysis
- Compliance team can query logs via [Atlas API v2](./atlas-api-v2.md) endpoints

**Deprecation Warning:**
- `legacyId` field removed in v2 (no longer returned in responses)
- Any code referencing `legacyId` will break; teams must update parsers

**Action Item:** Elena to schedule security training on OAuth 2.0 for API consumers (2024-02-20)

---

### 4. Onboarding & Training

**Sarah Chen (HR Director):**
- New employees will be provisioned with v2 API access only (see [Employee Onboarding SOP](./employee-onboarding-sop.md))
- Onboarding SOP updated to reference v2 documentation
- Training materials updated and available on internal wiki

**Action Item:** Sarah to update onboarding checklist to include v2 API training by 2024-02-10

---

## Key Decisions

| Decision | Owner | Deadline |
|----------|-------|----------|
| v1 sunset date confirmed: 2024-06-30 | Marcus Rodriguez | Effective immediately |
| All new integrations must use v2 | Alex Kim | Effective immediately |
| Dual-auth mode available until 2024-05-01 | David Park | Effective 2024-02-01 |
| Security training on OAuth 2.0 required for all API consumers | Elena Vasquez | 2024-02-20 |
| Onboarding SOP updated to reference v2 | Sarah Chen | 2024-02-10 |

---

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | Follow up with vendors on legacy system migrations | Alex Kim | 2024-02-15 | Pending |
| 2 | Send migration reminder email to API consumers | Marcus Rodriguez | 2024-02-05 | Pending |
| 3 | Schedule security training on OAuth 2.0 | Elena Vasquez | 2024-02-20 | Pending |
| 4 | Update onboarding checklist with v2 API training | Sarah Chen | 2024-02-10 | Pending |
| 5 | Publish v2 migration FAQ on internal wiki | Alex Kim | 2024-02-08 | Pending |

---

## Next Steps

1. **All teams:** Review [Atlas API v2 Documentation](./atlas-api-v2.md) and [Migration Guide](./atlas-api-v2.md#migration-guide)
2. **API consumers:** Plan migration from v1 to v2 (target: 2024-05-01)
3. **Security team:** Conduct audit of remaining v1 integrations (2024-04-01)
4. **HR:** Update onboarding materials and training (2024-02-10)

---

## Attachments

- [Atlas API v1 Documentation](./atlas-api-v1.md) (deprecated)
- [Atlas API v2 Documentation](./atlas-api-v2.md) (current)
- [Employee Onboarding SOP](./employee-onboarding-sop.md)
- [Incident Reporting SOP](./incident-reporting-sop.md)

---

## Notes for Next Meeting

- Review migration progress (target: 80% by 2024-05-01)
- Discuss any blockers or challenges
- Plan post-sunset support (2024-07-01 onwards)

**Next Meeting:** 2024-02-20, 10:00 AM UTC

---

**Minutes Prepared By:** Alex Kim  
**Approved By:** Marcus Rodriguez  
**Date:** 2024-01-16
