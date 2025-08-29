const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(eleventyConfig) {
    eleventyConfig.addPlugin(pluginRss);

    // Correct passthrough copy for your project structure
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addPassthroughCopy("src/admin");

    // Date filter (already working)
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

    // === ADD THIS NEW LIMIT FILTER ===
    eleventyConfig.addFilter("limit", function(arr, limit) {
        return arr.slice(0, limit);
    });
    // =================================

    // Collections (already working)
    eleventyConfig.addCollection("posts", function(collection) {
        return collection.getFilteredByGlob("src/_posts/*.md");
    });

    eleventyConfig.addCollection("postsForRss", function(collectionApi) {
        // Return only posts, sorted newest to oldest, and only if they have a 'title' and date is in the past/present
        return collectionApi.getFilteredByGlob("src/_posts/*.md").filter(item => item.data.title && item.data.date <= new Date()).reverse();
    });

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
