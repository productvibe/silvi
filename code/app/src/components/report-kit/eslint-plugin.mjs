// The report-kit's lint rule (docs/report-kit.md → Checks), wired in
// eslint.config.js at the app root.
//
//   report-kit/no-server-runtime a view never imports a runtime value from a
//                                `*.server` module: it is stripped from the
//                                client bundle and arrives `undefined`,
//                                silently (docs/redshift-data-rules.md).

const isServer = (src) => /\.server(\.[jt]sx?)?$/.test(src)

/** An import whose every binding is a type (or `import type`). */
function typeOnly(node) {
  if (node.importKind === "type") return true
  return (
    node.specifiers.length > 0 &&
    node.specifiers.every((s) => s.importKind === "type")
  )
}

const noServerRuntime = {
  meta: {
    type: "problem",
    docs: { description: "No runtime import from a .server module in a view" },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source.value
        if (isServer(src) && !typeOnly(node))
          context.report({
            node,
            message: `A view imports only types from ${src}: a runtime value from a .server module is undefined in the browser. Put shared constants in a client-safe file.`,
          })
      },
    }
  },
}

export default {
  meta: { name: "report-kit" },
  rules: {
    "no-server-runtime": noServerRuntime,
  },
}
