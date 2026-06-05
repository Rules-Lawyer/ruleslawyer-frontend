// HeroUI v3 (and parts of the react-aria stack) publish ESM-only packages whose
// `exports` expose only an `import` condition. To resolve those, jest needs the
// `import` condition active — but enabling it globally makes every *dual*-build
// dependency (synckit, dedent, @adobe/css-tools, ...) resolve to ESM too, which
// then explodes under jest's CommonJS runtime.
//
// So resolve CJS-first using the environment's default conditions, and only when
// that fails (an ESM-only package) retry with `import` added. Those ESM-only
// packages are matched by transformIgnorePatterns and compiled to CJS.
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    return options.defaultResolver(request, {
      ...options,
      conditions: [...(options.conditions || []), "import"],
    });
  }
};
