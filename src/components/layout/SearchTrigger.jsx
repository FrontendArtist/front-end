'use client';

export default function     SearchTrigger({ className, ...props }) {
    const handleClick = () => {
        // Dispatch custom event to open the SearchOverlay
        window.dispatchEvent(new Event('open-search-overlay'));
    };

    // Using the SVG from the original layout
    return (
        <button
            onClick={handleClick}
            aria-label="جستجو"
            className={className}
            {...props}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
        </button>
    );
}
