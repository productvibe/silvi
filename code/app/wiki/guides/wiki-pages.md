---
title: Write wiki pages
description: Add your own pages to this wiki by asking Claude.
order: 5
---

The wiki is yours. Keep what you learn about your data here: what a status
means, which table to trust, how a figure is counted.

## Ask for a page

> "Add a wiki page about our order statuses: what each one means and which
> ones count as sold."

> "Make a wiki section called Our data, with a page per source system."

Claude writes the page as a file in `app/wiki/`, adds it to its section's
table of contents, and checks it. A new section is a folder with its own
index page.

## What a page may hold

Plain text, headings, lists, tables, links, images and code, and a
set-off note (a quote that starts with `[!NOTE]`). Every
[metric](/wiki/advanced/metrics) is written out on the
[Metrics](/wiki/reference/metrics) page by itself.

The full rules are in [Writing pages](/wiki/about/ai-instructions).

## Images

Put an image in the chat, or say where it is, and ask Claude to add it to a
page. It saves it under `app/public/wiki/` and shows it with a caption.
