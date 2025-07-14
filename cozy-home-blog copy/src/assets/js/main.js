\// This is for the smooth scroll for the hero button (optional, from original template)
document.addEventListener('DOMContentLoaded', () => {
    const exploreButton = document.querySelector('.hero-content .button.primary');
    if (exploreButton) {
        exploreButton.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
});

// === Custom Emoji Cursor Logic ===

const emojis = [
    '👋', // Waving Hand
    '👉', // Backhand Index Pointing Right
    '☝️', // Index Pointing Up
    '👇', // Index Pointing Down
    '✋', // Raised Hand
    '👍', // Thumbs Up
    '🤞', // Crossed Fingers
    '💖', // Sparkling Heart (not a hand, but could be "cozy" vibe)
    '✨'  // Sparkles (also not a hand, but for a "cozy" vibe)
];

let currentEmojiIndex = 0;
const body = document.body; // Get the body element

// Function to create the custom cursor URL for a given emoji
function createEmojiCursor(emoji) {
    // SVG template for the emoji cursor
    // width/height/viewBox define the canvas size.
    // text x/y/font-size position and size the emoji within the SVG.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="0" y="20" font-size="20">${emoji}</text></svg>`;
    
    // The `12 12` are the X and Y coordinates of the "hotspot" (the clickable point) of the cursor.
    // For a 24x24 SVG, 12 12 centers it. Adjust these if your emoji is off-center or you want a different pointer.
    // `auto` is the fallback cursor if the custom one fails to load.
    return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 12 12, auto`;
}

// Function to cycle through emojis and update the cursor
function cycleEmojiCursor() {
    // Set the cursor style for the body
    body.style.cursor = createEmojiCursor(emojis[currentEmojiIndex]);
    
    // Move to the next emoji, loop back to start if at the end of the array
    currentEmojiIndex = (currentEmojiIndex + 1) % emojis.length;
}

// Set the interval for how often the cursor changes
// Try:
// 10ms for very rapid (can be flickering/distracting)
// 50ms for rapid
// 100ms for fast
// 200ms for moderate
// 500ms for slow and subtle
const intervalTime = 100; // milliseconds - adjust this value!

// Start the cursor cycling as soon as the script runs
// Call it once immediately to set the first cursor
cycleEmojiCursor();
// Then set the interval for continuous cycling
setInterval(cycleEmojiCursor, intervalTime);
