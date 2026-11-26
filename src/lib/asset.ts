// A file in public/, from the site's base: "/img/…" on the real site, "./img/…" in the Claude preview.
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
