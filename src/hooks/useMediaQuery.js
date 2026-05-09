import { useState, useEffect } from 'react';

/**
 * Hook reutilizable para media queries.
 * Evita duplicar el patrón matchMedia + addEventListener en cada página.
 *
 * @param {string} query - Media query CSS, ej: '(max-width: 768px)'
 * @returns {boolean} true si la query coincide con el viewport actual
 */
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const media = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, [query]);

    return matches;
};

export default useMediaQuery;
