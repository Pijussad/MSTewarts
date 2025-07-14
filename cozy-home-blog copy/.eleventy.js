const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
    // Pass through static assets
    // Copies `src/assets` to `public/assets`
    eleventyConfig.addPassthroughCopy("src/assets");
    // Copies `src/admin` (Netlify CMS files) to `public/admin`
    eleventyConfig.addPassthroughCopy("src/admin");

    // Add a date filter using Luxon for consistent date formatting
    // Example usage: {{ myDate | date("MMMM dd, yyyy") }}
    // Or for the current year: {{ "now" | date("yyyy") }}
    eleventyConfig.addFilter("date", (dateInput, format = "yyyy") => {
        let dateObj;
        if (dateInput instanceof Date) {
            // Handle JavaScript Date objects
            dateObj = DateTime.fromJSDate(dateInput);
        } else if (typeof dateInput === 'string' && dateInput.toLowerCase() === 'now') {
            // Special keyword 'now' to get current date/time
            dateObj = DateTime.local(); // Use local for "now"
        } else if (typeof dateInput === 'string') {
            // Try to parse string dates (ISO, RFC2822, etc.)
            dateObj = DateTime.fromISO(dateInput);
            if (!dateObj.isValid) {
                dateObj = DateTime.fromRFC2822(dateInput);
            }
            if (!dateObj.isValid) {
                // Fallback for custom string formats if necessary (e.g., "MM/DD/YYYY")
                // You'd need to know the specific format for fromFormat:
                // dateObj = DateTime.fromFormat(dateInput, "MM/dd/yyyy");
            }
        } else {
            // If it's not a Date object or string, try to treat as ISO string anyway
            dateObj = DateTime.fromISO(dateInput);
        }

        if (dateObj.isValid) {
            // Customize timezone if needed, e.g., { zone: 'America/New_York' }
            return dateObj.toFormat(format);
        } else {
            console.warn(`[Eleventy Date Filter] Invalid date input or format: ${dateInput}`);
            return dateInput; // Return original input if Luxon can't parse it
        }
    });

    // Define the 'posts' collection
    // This tells Eleventy to gather all Markdown files from src/_posts/
    // and make them available as 'collections.posts' in your templates.
    eleventyConfig.addCollection("posts", function(collection) {
        // `getFilteredByGlob` looks for files matching the pattern
        return collection.getFilteredByGlob("src/_posts/*.md");
    });

    // Set the input and output directories
    return {
        dir: {
            input: "src",    // Eleventy will look for content in the `src` folder
            output: "public",// Eleventy will output the built site to the `public` folder
            // === IMPORTANT ADDITION FOR _includes PATH RESOLUTION ===
            includes: "_includes" // This tells Eleventy to look for includes in `src/_includes/`
            // ========================================================
        },
        // Specify which template engines to use for different file types
        templateFormats: ["njk", "md", "html"],
        // Process Markdown files using Nunjucks for front matter and includes
        markdownTemplateEngine: "njk",
        // Process HTML files using Nunjucks (for layouts/includes)
        htmlTemplateEngine: "njk",
        // Process data files (like _data/site.json) using Nunjucks
        dataTemplateEngine: "njk"
    };
};
