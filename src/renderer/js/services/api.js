/**
 * Υπηρεσία (Service) επικοινωνίας με την Κύρια Διεργασία (Main Process).
 * Λειτουργεί ως επίπεδο αφαίρεσης (abstraction layer) πάνω από το window.electronAPI.
 */
export const apiService = {
    /**
     * Φορτώνει τη δομή του δέντρου από το backend.
     * @returns {Promise<Object>} Τα δεδομένα του δέντρου
     */
    async loadData() {
        return await window.electronAPI.loadData();
    },

    /**
     * Στέλνει τα δεδομένα του δέντρου για αποθήκευση.
     * @param {Object} treeData - Η δομή του δέντρου
     */
    saveData(treeData) {
        window.electronAPI.saveData(treeData);
    },

    /**
     * Ανοίγει τον εγγενή διάλογο επιλογής αρχείου.
     * @returns {Promise<{filePath: string, fileName: string}|null>}
     */
    async openFileDialog() {
        return await window.electronAPI.openFileDialog();
    },

    /**
     * Αντιγράφει ένα επιλεγμένο αρχείο τοπικά στον φάκελο της εφαρμογής.
     * @param {string} sourcePath - Η πηγή του αρχείου
     * @returns {Promise<string|null>} Η νέα διαδρομή του αρχείου
     */
    async copyFile(sourcePath) {
        return await window.electronAPI.copyFile(sourcePath);
    },

    /**
     * Ζητά το άνοιγμα ενός αρχείου με την προεπιλεγμένη εφαρμογή του συστήματος.
     * @param {string} filePath 
     */
    openFile(filePath) {
        window.electronAPI.openFile(filePath);
    },

    /**
     * Ζητά τη διαγραφή αρχείων από τον δίσκο.
     * @param {string[]} filePaths - Πίνακας με τις διαδρομές των αρχείων προς διαγραφή
     */
    deleteNodeFiles(filePaths) {
        window.electronAPI.deleteNodeFiles(filePaths);
    },

    /**
     * Ζητά τον πλήρη καθαρισμό όλων των τοπικών δεδομένων.
     */
    clearAllData() {
        window.electronAPI.clearAllData();
    },

    /**
     * Ζητά την εξαγωγή του δέντρου σε μορφή PDF (Α3 Landscape).
     * @returns {Promise<{success: boolean, path?: string, error?: string}>}
     */
    async exportPdf() {
        return await window.electronAPI.exportPdf();
    },

    /**
     * Καταχωρεί μια συνάρτηση (callback) για το event επαναφοράς του δέντρου.
     * @param {Function} callback 
     * @returns {Function} Συνάρτηση ακύρωσης του listener (cleanup)
     */
    onResetTree(callback) {
        return window.electronAPI.onResetTree(callback);
    }
};