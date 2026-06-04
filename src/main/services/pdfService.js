const fs = require('fs');
const path = require('path');

class PdfService {
    /**
     * @param {Object} app - Το instance της εφαρμογής Electron (app)
     * @param {Object} dialog - Το module διαλόγων του Electron (dialog)
     */
    constructor(app, dialog) {
        this.app = app;
        this.dialog = dialog;
    }

    /**
     * Διαχειρίζεται ολόκληρη τη ροή εξαγωγής σε PDF: 
     * Εμφάνιση παραθύρου αποθήκευσης, μετατροπή περιεχομένου σε PDF (A3 Landscape) και εγγραφή στον δίσκο.
     * 
     * @param {BrowserWindow} browserWindow - Το ενεργό παράθυρο από το οποίο θα γίνει η εκτύπωση
     * @returns {Promise<{success: boolean, path?: string, error?: string}>} Το αποτέλεσμα της εξαγωγής
     */
    async exportPdf(browserWindow) {
        if (!browserWindow) {
            throw new Error('Απαιτείται ένα ενεργό παράθυρο (BrowserWindow) για την εξαγωγή PDF.');
        }

        const defaultFileName = 'tree-export-A3.pdf';
        const defaultDirPath = this.app.getPath('documents');
        const defaultPath = path.join(defaultDirPath, defaultFileName);

        // Εμφάνιση του εγγενούς παραθύρου διαλόγου Save Dialog του λειτουργικού συστήματος
        const { canceled, filePath } = await this.dialog.showSaveDialog(browserWindow, {
            title: 'Εξαγωγή Δέντρου ως PDF (A3)',
            defaultPath: defaultPath,
            filters: [
                { name: 'Αρχεία PDF', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, error: 'Η εξαγωγή ακυρώθηκε από τον χρήστη.' };
        }

        try {
            // Μικρή καθυστέρηση για να διασφαλιστεί ότι τυχόν μεταβάσεις (transitions) στο UI έχουν ολοκληρωθεί
            await new Promise(resolve => setTimeout(resolve, 200));

            const pdfOptions = {
                marginsType: 1, // 1 = Χωρίς περιθώρια (None) για μεγιστοποίηση του εκτυπώσιμου χώρου του δέντρου
                pageSize: 'A3', // Μέγεθος σελίδας Α3
                printBackground: true, // Συμπερίληψη χρωμάτων φόντου (CSS)
                landscape: true // Οριζόντιος προσανατολισμός
            };

            // Δημιουργία των δεδομένων PDF από το περιεχόμενο του παραθύρου
            const pdfData = await browserWindow.webContents.printToPDF(pdfOptions);
            
            // Εγγραφή των δεδομένων στο αρχείο
            fs.writeFileSync(filePath, pdfData);

            return { success: true, path: filePath };
        } catch (error) {
            throw new Error(`Αποτυχία κατά τη δημιουργία ή αποθήκευση του PDF: ${error.message}`);
        }
    }
}

module.exports = PdfService;