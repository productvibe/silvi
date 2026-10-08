# Silvi

A reporting starter kit: an app of reports on your own data, which you build
on with Claude. It runs on your own machine.

Start an app with the connectors your reports read from:

```
npx github:productvibe/silvi init my-reports --connectors csv
```

Pick the connectors and the look on [silvi.dev](https://silvi.dev), which
gives you the command to run.

- `code/`: the kit, the app every Silvi app starts from
- `cli/`: the `silvi` command (`init`, `list`, `add`, `remove`, `update`, `apply`)

This repo is published from Silvi's own repo, so pull requests are copied
across by hand.
