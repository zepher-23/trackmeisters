/**
 * Helper to parse FPV Drone Video selections and details from registration records
 * Handles both legacy Firestore records (where only raw mediaSelections existed)
 * and newly updated records (with mediaCount, totalMediaAmount, etc.)
 */
export const parseMediaDetails = (reg) => {
    if (!reg) return null;

    const hasMedia = !!(
        reg.optInMedia ||
        (reg.mediaSelections && Object.keys(reg.mediaSelections).length > 0) ||
        (reg.mediaCount && reg.mediaCount > 0) ||
        (reg.totalMediaAmount && reg.totalMediaAmount > 0)
    );

    if (!hasMedia) return null;

    let count = reg.mediaCount || 0;
    let totalAmount = reg.totalMediaAmount || 0;
    let classes = Array.isArray(reg.mediaClasses) ? [...reg.mediaClasses] : [];

    // Parse raw mediaSelections if available to extract class names and count
    if (reg.mediaSelections && typeof reg.mediaSelections === 'object') {
        const fpvEntries = Object.entries(reg.mediaSelections).filter(([_, sel]) => sel && (sel.fpv === true || sel === true));
        if (fpvEntries.length > 0) {
            count = fpvEntries.length;
            totalAmount = count * 1500;
            const selectedClassesArr = Array.isArray(reg.selectedClasses) ? reg.selectedClasses : [];
            classes = fpvEntries.map(([key]) => {
                const matched = selectedClassesArr.find(c => c.selectionId === key || c.name === key || `${c.originalClass}:${c.subclass}` === key);
                return matched ? matched.name : (key.includes(':') ? key.replace(':', ' - ') : key);
            });
        }
    }

    if (count === 0 && !reg.optInMedia) return null;

    const formattedText = reg.formattedMediaSelections || (
        count > 0
            ? `${count} FPV Video${count > 1 ? 's' : ''} (₹${totalAmount || count * 1500})${classes.length > 0 ? ` - ${classes.join(', ')}` : ''}`
            : 'Opted in'
    );

    return {
        opted: true,
        count: count,
        totalAmount: totalAmount || (count * 1500),
        classes: classes,
        formattedText: formattedText
    };
};
