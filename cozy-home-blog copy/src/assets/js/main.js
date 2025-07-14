// You can add any custom JavaScript here for interactivity.
// For now, it's just an empty file.
// Example: Smooth scroll for hero button
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
