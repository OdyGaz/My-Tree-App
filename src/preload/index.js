const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Αιτήματα διπλής κατεύθυνσης (Promises / Invoke) ---
    
    /**
     * Φορτώνει τα δεδομένα του δέντρου από το backend.
     * @returns {Promise<Object>}
     */
    loadData: () => ipcRenderer.invoke('load-data'),

    /**
     * Ανοίγει το παράθυρο διαλόγου επιλογής αρχείου.
     * @returns {Promise<{filePath: string, fileName: string}|null>}
     */
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

    /**
     * Ζητά την αντιγραφή ενός αρχείου στον φάκελο της εφαρμογής.
     * @param {string} sourcePath - Η πηγή του αρχείου
     * @returns {Promise<string|null>} Η νέα διαδρομή του αρχείου
     */
    copyFile: (sourcePath) => ipcRenderer.invoke('copy-file', sourcePath),

    /**
     * Ζητά την εξαγωγή του δέντρου σε PDF (A3 Landscape).
     * @returns {Promise<{success: boolean, path?: string, error?: string}>}
     */
    exportPdf: () => ipcRenderer.invoke('export-pdf'),


    // --- Μηνύματα μονής κατεύθυνσης (Send) ---

    /**
     * Στέλνει τα δεδομένα του δέντρου για αποθήκευση.
     * @param {Object} treeData 
     */
    saveData: (treeData) => ipcRenderer.send('save-data', treeData),

    /**
     * Ζητά τον καθαρισμό όλων των αποθηκευμένων δεδομένων.
     */
    clearAllData: () => ipcRenderer.send('clear-all-data'),

    /**
     * Ζητά το άνοιγμα ενός αρχείου με την προεπιλεγμένη εφαρμογή του συστήματος.
     * @param {string} filePath 
     */
    openFile: (filePath) => ipcRenderer.send('open-file', filePath),

    /**
     * Ζητά τη διαγραφή των αρχείων που σχετίζονται με έναν κόμβο.
     * @param {string[]} filePaths 
     */
    deleteNodeFiles: (filePaths) => ipcRenderer.send('delete-node-files', filePaths),


    // --- Λήψη μηνυμάτων από το Backend (Listeners) ---

    /**
     * Ακούει για το event επαναφοράς του δέντρου (reset-tree).
     * @param {Function} callback - Η συνάρτηση που θα εκτελεστεί με τα νέα δεδομένα
     * @returns {Function} Μια συνάρτηση για την αφαίρεση του listener (cleanup)
     */
    onResetTree: (callback) => {
        const subscription = (event, defaultTreeData) => callback(defaultTreeData);
        ipcRenderer.on('reset-tree', subscription);
        
        // Επιστρέφουμε συνάρτηση αφαίρεσης για αποφυγή διαρροών μνήμης (memory leaks)
        return () => {
            ipcRenderer.removeListener('reset-tree', subscription);
        };
    }
});

contextBridge.exposeInMainWorld('utils', {
    /**
     * Παράγει ένα μοναδικό ID για τους νέους κόμβους.
     * @returns {string}
     */
    generateId: () => `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
});