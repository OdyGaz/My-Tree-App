const fs = require('fs');
const path = require('path');

class FileService {
    /**
     * @param {string} userDataPath - Η διαδρομή των δεδομένων χρήστη (app.getPath('userData'))
     * @param {string} documentsPath - Η διαδρομή των εγγράφων χρήστη (app.getPath('documents'))
     */
    constructor(userDataPath, documentsPath) {
        this.treeDataPath = path.join(userDataPath, 'tree-data.json');
        this.uploadedFilesPath = path.join(documentsPath, 'my_tree_app');
    }

    /**
     * Ελέγχει και δημιουργεί τον φάκελο αποθήκευσης εγγράφων αν δεν υπάρχει.
     */
    ensureUploadDirExists() {
        try {
            if (!fs.existsSync(this.uploadedFilesPath)) {
                fs.mkdirSync(this.uploadedFilesPath, { recursive: true });
                console.log(`Δημιουργήθηκε ο φάκελος αποθήκευσης στο: ${this.uploadedFilesPath}`);
            }
        } catch (error) {
            throw new Error(`Αδυναμία δημιουργίας του φακέλου αποθήκευσης: ${error.message}`);
        }
    }

    /**
     * Φορτώνει και αναλύει τα δεδομένα του δέντρου. 
     * Αν δεν υπάρχει το αρχείο ή προκύψει σφάλμα, επιστρέφει τη βασική/προεπιλεγμένη δομή.
     * @returns {Object} Τα δεδομένα του δέντρου
     */
    loadData() {
        try {
            if (fs.existsSync(this.treeDataPath)) {
                const rawData = fs.readFileSync(this.treeDataPath, 'utf-8');
                const parsedData = JSON.parse(rawData);

                if (parsedData && parsedData.id) {
                    // Εκτέλεση ελέγχου και μεταφοράς (migration) παλαιότερων δομών
                    this._migrateNodeFormat(parsedData);
                    return parsedData;
                }
            }
        } catch (error) {
            console.warn("Προέκυψε σφάλμα κατά την ανάγνωση των δεδομένων. Επιστροφή στην προεπιλεγμένη δομή:", error);
        }
        return this.getDefaultTreeData();
    }

    /**
     * Αποθηκεύει τη δομή του δέντρου στο αρχείο JSON.
     * @param {Object} treeData - Η δομή του δέντρου προς αποθήκευση
     */
    saveData(treeData) {
        try {
            const dataString = JSON.stringify(treeData, null, 2);
            fs.writeFileSync(this.treeDataPath, dataString, 'utf-8');
        } catch (error) {
            throw new Error(`Αδυναμία αποθήκευσης δεδομένων: ${error.message}`);
        }
    }

    /**
     * Αντιγράφει ένα εξωτερικό αρχείο στον ασφαλή φάκελο της εφαρμογής στα Έγγραφα.
     * @param {string} sourcePath - Η πλήρης διαδρομή του πηγαίου αρχείου
     * @returns {string} Η νέα, μοναδική διαδρομή του αντιγραμμένου αρχείου
     */
    copyFile(sourcePath) {
        try {
            this.ensureUploadDirExists();
            const originalFileName = path.basename(sourcePath);
            const uniqueFileName = `${Date.now()}_${originalFileName}`;
            const destPath = path.join(this.uploadedFilesPath, uniqueFileName);

            fs.copyFileSync(sourcePath, destPath);
            return destPath;
        } catch (error) {
            throw new Error(`Αδυναμία αντιγραφής του αρχείου ${sourcePath}: ${error.message}`);
        }
    }

    /**
     * Διαγράφει αρχεία από τον δίσκο. 
     * Περιέχει έλεγχο ασφαλείας ώστε να επιτρέπεται η διαγραφή μόνο αρχείων εντός του προκαθορισμένου φακέλου.
     * @param {string[]} filePaths - Πίνακας με τις διαδρομές των αρχείων προς διαγραφή
     * @returns {Object} Αποτέλεσμα που περιέχει τυχόν σφάλματα κατά τη διαγραφή
     */
    deleteFiles(filePaths) {
        const errors = [];
        const uploadDirResolved = path.resolve(this.uploadedFilesPath);

        filePaths.forEach(filePath => {
            if (!filePath || typeof filePath !== 'string') return;

            try {
                const resolvedPath = path.resolve(filePath);

                if (fs.existsSync(resolvedPath)) {
                    // Έλεγχος Ασφαλείας: Το αρχείο πρέπει να βρίσκεται εντός του φακέλου "my_tree_app"
                    if (resolvedPath.startsWith(uploadDirResolved)) {
                        fs.unlinkSync(resolvedPath);
                    } else {
                        errors.push(`Ασφάλεια: Απορρίφθηκε η διαγραφή αρχείου εκτός εξουσιοδοτημένου φακέλου: ${path.basename(filePath)}`);
                    }
                }
            } catch (error) {
                errors.push(`Αποτυχία διαγραφής του αρχείου ${path.basename(filePath)}: ${error.message}`);
            }
        });

        return {
            success: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Διαγράφει όλα τα δεδομένα της εφαρμογής (αρχείο JSON και αποθηκευμένα αρχεία εγγράφων).
     * @returns {Object} Μια νέα, προεπιλεγμένη δομή δέντρου
     */
    clearAllData() {
        try {
            if (fs.existsSync(this.treeDataPath)) {
                fs.unlinkSync(this.treeDataPath);
            }

            if (fs.existsSync(this.uploadedFilesPath)) {
                fs.rmSync(this.uploadedFilesPath, { recursive: true, force: true });
            }

            this.ensureUploadDirExists();
        } catch (error) {
            throw new Error(`Αδυναμία καθαρισμού δεδομένων: ${error.message}`);
        }

        return this.getDefaultTreeData();
    }

    /**
     * Παράγει την προεπιλεγμένη δομή του δέντρου κατά την πρώτη εκκίνηση ή μετά από καθαρισμό.
     * @returns {Object} Προεπιλεγμένο δέντρο
     */
    getDefaultTreeData() {
        const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
            id: generateId(),
            name: 'Root',
            text: null,
            files: [],
            children: [
                { id: generateId(), name: 'Branch 1', text: null, files: [], children: [] },
                { id: generateId(), name: 'Branch 2', text: null, files: [], children: [] }
            ]
        };
    }

    /**
     * Εσωτερική μέθοδος για τη μεταφορά και εναρμόνιση παλαιότερων σχημάτων δεδομένων (Data Migration).
     * @private
     */
    _migrateNodeFormat(node) {
        if (!node || typeof node !== 'object') return;

        // Μετατροπή παλαιού σχήματος (content/type) σε νέο (text/files)
        if (node.content !== undefined && node.files === undefined) {
            if (node.type === 'text') {
                node.text = node.content;
            } else if (node.type === 'file') {
                node.files = [{ path: node.content, originalName: path.basename(node.content || 'unknown_file') }];
            }
            delete node.content;
            delete node.type;
        }

        if (node.files === undefined) node.files = [];
        if (node.text === undefined) node.text = null;

        // Διασφάλιση σωστής δομής του πίνακα files
        if (Array.isArray(node.files)) {
            node.files = node.files.map(file => {
                if (typeof file === 'string') {
                    return { path: file, originalName: path.basename(file || 'unknown_file') };
                }
                if (typeof file === 'object' && file !== null && file.path && file.originalName) {
                    return file;
                }
                return null;
            }).filter(file => file !== null);
        } else {
            node.files = [];
        }

        if (node.children && node.children.length > 0) {
            node.children.forEach(child => this._migrateNodeFormat(child));
        }
    }
}

module.exports = FileService;