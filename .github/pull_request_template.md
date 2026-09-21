## Summary

Describe what changed and why.

## Safety checklist

- [ ] This change does not enable live billing, live line activation, or live eSIM ordering.
- [ ] No secrets, credentials, customer data, or private provider information are committed.
- [ ] GitHub Actions remain pinned to full commit SHAs.
- [ ] Workflow permissions are least-privilege.
- [ ] Production deployment provenance checks remain intact.
- [ ] Tests and repository verification pass.

## Security-sensitive files

If this PR changes `.github/**`, `vercel.json`, `Dockerfile`, provider/payment code, or provenance guards, explain the security impact here.
