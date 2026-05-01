module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/.claude");

  // Préserve les chemins .html d'origine (pas de pretty URLs)
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
