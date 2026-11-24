# Roadmap

- [x] PR #187's whiteboards migration is no longer needed: whiteboards are stored in wiki_pages (see fix/whiteboard-wiki-storage).
- [x] Triage the uploaded task report without changing application code: assignee values exist in the database, but project task rows do not visibly render them; future due dates are omitted by the current date badges.
- [ ] Confirm the preview typecheck after the fixes; blocked because the automatic typecheck has not rerun and the current log only repeats prior errors.
