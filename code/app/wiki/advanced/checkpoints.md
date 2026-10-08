---
title: Saved versions
description: Keep a good state of your app, and go back to one.
order: 2
---

Your app is a folder kept in git, which remembers every saved version of
every file. You never use git yourself; you ask Claude.

## Save a version

When a report looks right, ask:

> "Save this version: the Orders report with the category table."

Claude saves every changed file with that note. Save often: after each
change you are happy with.

## See what changed

> "What changed since yesterday?"

> "Show me the difference in the Orders report since the last save."

## Go back

> "Put the Orders report back as it was this morning."

> "Undo the last change."

Claude brings back the earlier version of the files and saves that as a new
version, so nothing is lost.

## Try something risky

> "Try a version of the Orders report with weekly tiles, separately, so I
> can compare before we keep it."

Claude works on a separate line of versions and brings it in only when you
say so.

> [!NOTE]
> **What is never saved.** `app/.env`, with your passwords, is never saved
> to git.
