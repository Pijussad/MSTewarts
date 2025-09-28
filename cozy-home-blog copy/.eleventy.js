const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(eleventyConfig) {
    // Add the RSS plugin
    eleventyConfig.addPlugin(pluginRss);

    // Passthrough copy for assets and admin folders
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addPassthroughCopy("src/admin");

    // Custom filter to limit the number of items in a collection
    eleventyConfig.addFilter("limit", function(arr, limit) {
        return arr.slice(0, limit);
    });

    // Date filter for formatting dates
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

    // === CORRECTED 'posts' COLLECTION FOR HOMEPAGE SORTING ===
    eleventyConfig.addCollection("posts", function(collectionApi) {
        // Get all posts and sort them from newest to oldest
        return collectionApi.getFilteredByGlob("src/_posts/*.md").sort(function(a, b) {
            return b.date - a.date;
        });
    });

    // Collection of posts for the RSS feed (filters out future dates and sorts)
    eleventyConfig.addCollection("postsForRss", function(collectionApi) {
        return collectionApi.getFilteredByGlob("src/_posts/*.md")
            .filter(item => item.data.title && item.date <= new Date())
            .sort(function(a, b) {
                return b.date - a.date;
            });
    });

    // Main configuration object
    return {
        dir: {
            input: "src",
            output: "public",
            includes: "_includes",
            data: "_data"
        },
        templateFormats: ["njk", "md", "html"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk"
    };
};
