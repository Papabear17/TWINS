/* admin-only/features/notes/notes.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["notes"] = {
    init() {
        if (typeof renderNotes === "function") renderNotes();
    }
};
