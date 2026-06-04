const { ipcMain, dialog, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Καταχωρεί όλους τους IPC Handlers για την επικοινωνία Frontend-Backend.
 * 
 * @param {FileService} fileService - Το instance της υπηρεσίας διαχείρισης αρχείων
 * @param {PdfService} pdfService - Το instance της υπηρεσίας δημιουργίας PDF
 */
function registerIpcHandlers(fileService, pdfService) {
    
    // --- Handlers Φόρτωσης και Αποθήκευσης Δεδομένων ---

    ipcMain.handle('load-data', async () => {
        try {
            return fileService.loadData();
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Φόρτωσης", `Αδυναμία φόρτωσης των δεδομένων: ${error.message}`);
            return fileService.getDefaultTreeData();
        }
    });

    ipcMain.on('save-data', (event, treeData) => {
        try {
            fileService.saveData(treeData);
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Αποθήκευσης", `Αδυναμία αποθήκευσης των δεδομένων: ${error.message}`);
        }
    });

    // --- Handlers Διαχείρισης Αρχείων και Διαλόγων ---

    ipcMain.handle('open-file-dialog', async (event) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        
        const result = await dialog.showOpenDialog(browserWindow, {
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            return { 
                filePath: filePath, 
                fileName: path.basename(filePath) 
            };
        }
        return null;
    });

    ipcMain.handle('copy-file', async (event, sourcePath) => {
        try {
            return fileService.copyFile(sourcePath);
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Αντιγραφής", `Αδυναμία αντιγραφής του αρχείου στα Έγγραφα: ${error.message}`);
            return null;
        }
    });

    ipcMain.on('open-file', (event, filePath) => {
        if (!filePath || typeof filePath !== 'string') {
            console.error('Μη έγκυρη διαδρομή αρχείου:', filePath);
            return;
        }

        try {
            if (fs.existsSync(filePath)) {
                shell.openPath(filePath).then(errorMessage => {
                    if (errorMessage) {
                        dialog.showErrorBox("Σφάλμα Ανοίγματος", `Αδυναμία ανοίγματος του αρχείου: ${path.basename(filePath)}\n${errorMessage}`);
                    }
                });
            } else {
                dialog.showErrorBox("Το αρχείο δεν βρέθηκε", `Το αρχείο "${path.basename(filePath)}" δεν βρέθηκε στην τοποθεσία:\n${filePath}`);
            }
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Ανοίγματος", `Προέκυψε απρόσμενο σφάλμα κατά το άνοιγμα του αρχείου: ${error.message}`);
        }
    });

    ipcMain.on('delete-node-files', (event, filePaths) => {
        const result = fileService.deleteFiles(filePaths);
        
        // Αν προκύψουν σφάλματα κατά τη διαγραφή, ενημερώνουμε τον χρήστη με προειδοποίηση
        if (!result.success && result.errors.length > 0) {
            const browserWindow = BrowserWindow.fromWebContents(event.sender);
            dialog.showMessageBox(browserWindow, {
                type: 'warning',
                title: 'Ζητήματα Διαγραφής Αρχείων',
                message: 'Ορισμένα αρχεία δεν ήταν δυνατόν να διαγραφούν από τον δίσκο.',
                detail: result.errors.join('\n')
            });
        }
    });

    ipcMain.on('clear-all-data', (event) => {
        try {
            const freshData = fileService.clearAllData();
            // Αποστολή απάντησης πίσω στο renderer για επαναφορά του δέντρου
            event.sender.send('reset-tree', freshData);
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Καθαρισμού", `Αδυναμία καθαρισμού των δεδομένων: ${error.message}`);
        }
    });

    // --- Handler Εξαγωγής PDF ---

    ipcMain.handle('export-pdf', async (event) => {
        const browserWindow = BrowserWindow.fromWebContents(event.sender);
        try {
            const result = await pdfService.exportPdf(browserWindow);

            if (result.success) {
                dialog.showMessageBox(browserWindow, {
                    type: 'info',
                    title: 'Επιτυχής Εξαγωγή',
                    message: 'Το PDF εξήχθη με επιτυχία!',
                    detail: `Το αρχείο αποθηκεύτηκε ως Α3 Landscape στη διαδρομή:\n${result.path}`
                });
            }
            return result;
        } catch (error) {
            dialog.showErrorBox("Σφάλμα Εξαγωγής PDF", `Αδυναμία εξαγωγής του PDF: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerIpcHandlers };