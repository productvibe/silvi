---
title: Writing pages
description: The rules every wiki page follows, for Claude and for you.
order: 1
---

Claude writes and changes wiki pages by these rules. They are here so you
know what to expect, and so a page you ask for fits the rest.

## The reader

Someone who uses the app in the Code tab of the Claude desktop app. They do
not use a terminal: a page never asks them to type a command. An action is
written as what to ask Claude, in quotes.

## Files and sections

- One page is one file in `app/wiki/`; a folder is a section.
- Every section has an `index.md`: its landing page, with a table that has a
  row and a link for each page in it.
- Every page starts with frontmatter: `title`, `description` (one line) and
  `order` (its place in the section). A section's `index.md` also has an
  `icon`.

## What a page may hold

Plain Markdown: headings, paragraphs, lists, tables, links, images and
code. Besides that, one form for a set-off note:

```md
> [!NOTE]
> **Use a read-only user.** Reports only read.
```

A report's code shown as an example goes in a code fence marked `tsx`; the
wiki prints it as written.

## Style

- Plain words, short sentences, the most useful thing first.
- Tables for anything with more than two parallel items.
- Fictional names and figures in every example.
- One page per idea; link rather than repeat.
