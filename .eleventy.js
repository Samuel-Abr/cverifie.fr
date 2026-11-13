module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/images");

  // URL publique propre, telle que Netlify la sert et la lie :
  // /contact.html -> /contact, /index.html -> /, /blog/index.html -> /blog/
  eleventyConfig.addFilter("cleanUrl", (url) =>
    (url || "").replace(/index\.html$/, "").replace(/\.html$/, "")
  );

  // Date ISO (AAAA-MM-JJ) -> "8 janvier 2026"
  eleventyConfig.addFilter("dateFr", (iso) => {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  });

  // Les fichiers restent générés en .html (Netlify les sert sans l'extension)
  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.html`;
  });

  return {
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts"
    }
  };
};
