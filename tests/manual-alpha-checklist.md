# v2.0-alpha.3 Manual Checklist

1. Open `index.html` or the deployed Vercel URL.
2. Save a daily goal, refresh the page, and verify the goal remains visible.
3. Save a capture with each available source and verify it appears in the capture inbox.
4. Convert an inbox capture and edit its title, priority, due date, and today flag.
5. Verify the converted capture is marked as converted and the task appears in the selected group.
6. Edit an existing task and change its title, priority, due date, today flag, and status.
7. Mark a task as completed and verify its completion timestamp and completed group entry.
8. Verify today, pending, and completed task groups remain distinct after refresh.
9. Verify daily review lists today's completed tasks, today's incomplete tasks, and today's captures.
10. Save a tomorrow goal, refresh the page, and verify it remains in the daily review.
11. Verify old `localStorage.goal`, `notes`, and `decisions` content is still visible after migration.
12. Check the layout at a narrow mobile viewport and confirm there is no horizontal overflow.
13. Create a note with a title, body, tags, goal, and project context; refresh and verify it remains.
14. Edit that note and verify its title, content, tags, and updated timestamp change.
15. Search by note title, body text, and tag; verify matching notes appear.
16. Select a tag filter and verify only notes with that tag appear.
17. Convert an inbox capture to a note, then verify the capture is marked as converted and the note retains its source.
18. Archive a note, verify it remains visible under “全部状态” and “已归档”, then restore it and verify the record count does not change.
19. In the browser console, call `PersonalAIStorage.getAIContext({ scope: "dashboard" })` and `PersonalAIStorage.getAIContext({ scope: "all" })`; verify both return serializable JSON without modifying data.
20. Verify capture filters show inbox, converted, and archived records, with “全部状态” selected by default.
21. Complete and cancel tasks; verify completed and cancelled groups remain visible after refresh and can be isolated with the status filter.
22. Verify the decision center shows both pending-review and reviewed decisions without hiding either by default.
23. Save daily reviews on different dates and verify “复盘历史” shows every saved review, with an optional today-only filter.
24. Leave the daily goal blank and submit; verify the existing goal remains unchanged and an explanatory error appears.
25. Confirm the browser makes no network requests while creating, filtering, archiving, restoring, or reviewing records.
