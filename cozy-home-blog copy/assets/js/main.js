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

const emojis = [
    '👋',
    '👉',
    '☝️',
    '👇',
    '✋',
    '👍',
    '🤞',
    '👌',
    '✊',
    '🫴',
    '🫷'
];

let currentEmojiIndex = 0;
const body = document.body;

function createEmojiCursor(emoji) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="0" y="20" font-size="20">${emoji}</text></svg>`;
    return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 12 12, auto`;
}

function cycleEmojiCursor() {
    body.style.cursor = createEmojiCursor(emojis[currentEmojiIndex]);
    currentEmojiIndex = (currentEmojiIndex + 1) % emojis.length;
}

const intervalTime = 100;

cycleEmojiCursor();
setInterval(cycleEmojiCursor, intervalTime);
