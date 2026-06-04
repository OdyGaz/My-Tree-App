const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const FileService = require('./services/fileService');
const PdfService = require('./services/pdfService');
const { registerIpcHandlers } = require('./ipcHandlers');

let mainWindow = null;
let fileService = null;
let pdfService = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Σύνδεση με το preload script χρησιμοποιώντας σχετική διαδρομή
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            offscreen: false
        }
    });

    // Φόρτωση του αρχείου HTML
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Μπορείτε να ενεργοποιήσετε την παρακάτω γραμμή κατά τη διάρκεια του development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Εκκίνηση της εφαρμογής
app.whenReady().then(() => {
    // Αρχικοποίηση των υπηρεσιών με τις σωστές διαδρομές (paths) του συστήματος
    fileService = new FileService(app.getPath('userData'), app.getPath('documents'));
    pdfService = new PdfService(app, dialog);

    // Διασφάλιση ύπαρξης του φακέλου αποθήκευσης εγγράφων
    try {
        fileService.ensureUploadDirExists();
    } catch (error) {
        console.error("Σφάλμα κατά την εκκίνηση του FileService:", error.message);
    }

    // Καταχώρηση των IPC Handlers (εκτελείται μόνο μία φορά κατά την έναρξη της εφαρμογής)
    registerIpcHandlers(fileService, pdfService);

    createWindow();
});

// Διαχείριση κλεισίματος όλων των παραθύρων
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Διαχείριση επανενεργοποίησης (κυρίως για macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});