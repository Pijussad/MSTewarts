const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss"); // Add this line

module.exports = function(eleventyConfig) {
    eleventyConfig.addPlugin(pluginRss); // Add this line (before other config like passthrough or collections)

    eleventyConfig.addPassthroughCopy("assets"); // Changed for flattened repo
    eleventyConfig.addPassthroughCopy("admin");   // Changed for flattened repo

    eleventyConfig.addFilter("date", (dateInput, format = "yyyy") => {
        let dateObj;
        if (dateInput instanceof Date) { dateObj = DateTime.fromJSDate(dateInput); }
        else if (typeof dateInput === 'string' && dateInput.toLowerCase() === 'now') { dateObj = DateTime.local(); }
        else if (typeof dateInput === 'string') {
            dateObj = DateTime.fromISO(dateInput);
            if (!dateObj.isValid) { dateObj = DateTime.fromRFC2822(dateInput); }
        } else { dateObj = DateTime.fromISO(dateInput); }
        if (dateObj.isValid) { return dateObj.toFormat(format); }
        else { console.warn(`[Eleventy Date Filter] Invalid date input or format: ${dateInput}`); return dateInput; }
    });

    eleventyConfig.addCollection("posts", function(collection) {
        return collection.getFilteredByGlob("src/_posts/*.md");
    });

    // === ADD THIS NEW COLLECTION FOR THE RSS FEED ===
    eleventyConfig.addCollection("postsForRss", function(collectionApi) {
        // Return only posts, sorted newest to oldest, and only if they have a 'title' and date is in the past/present
        return collectionApi.getFilteredByGlob("src/_posts/*.md").filter(item => item.data.title && item.data.date <= new Date()).reverse();
    });
    // =================================================

    return {
        dir: {
            input: "src",
            output: "public",
            includes: "_includes"
        },
        templateFormats: ["njk", "md", "html"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        dataTemplateEngine: "njk"
    };
};
