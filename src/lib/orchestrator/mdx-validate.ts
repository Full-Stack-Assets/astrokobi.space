// Generation-time MDX compile check.
//
// A body can pass PostSchema and have perfectly balanced component tags and
// *still* fail to parse as MDX — e.g. a `<Question q="…">` opened inline inside
// a paragraph whose closing tag lands at block position. Such a post sails
// through generation, gets committed, and then aborts the *production build* at
// prerender time (one bad post breaks the whole deploy). Compiling the body
// through the site's own MDX pipeline at generation time turns that class of
// failure into an ordinary retry with the compiler's error fed back to the model.
//
// `next-mdx-remote/serialize` is ESM-only; a static import would crash the
// tsx-run pipeline at module load, so it's loaded via a dynamic `import()`.

/** Returns the MDX compiler's error message for `body`, or null when it compiles. */
export async function mdxCompileError(body: string): Promise<string | null> {
  try {
    const { serialize } = await import('next-mdx-remote/serialize');
    await serialize(body);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
