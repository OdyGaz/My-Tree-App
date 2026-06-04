import { apiService } from './services/api.js';
import { TreeChart } from './tree/chart.js';
import { NodePopup } from './ui/popup.js';
import { RootRename } from './ui/rename.js';

// Καθολικές μεταβλητές κατάστασης (State) του Frontend
let treeData = null;
let chart = null;
let popup = null;
let rootRename = null;

/**
 * Φορτώνει τα δεδομένα του δέντρου κατά την εκκίνηση της εφαρμογής.
 */
async function loadInitialData() {
    try {
        treeData = await apiService.loadData();
        chart.update(treeData);
    } catch (error) {
        console.error("Αδυναμία αρχικής φόρτωσης δεδομένων:", error);
        alert("Προέκυψε σφάλμα κατά τη φόρτωση του δέντρου.");
    }
}

/**
 * Αποστέλλει τα τρέχοντα δεδομένα του δέντρου στο backend για αποθήκευση.
 */
function saveData() {
    if (treeData) {
        apiService.saveData(treeData);
    }
}

/**
 * Βρίσκει και επιστρέφει όλες τις διαδρομές αρχείων ενός κόμβου και των απογόνων του.
 * Χρησιμοποιείται για τη διαγραφή αρχείων από τον δίσκο όταν σβήνεται ένας κλάδος.
 * 
 * @param {Object} nodeData - Τα δεδομένα του κόμβου
 * @returns {string[]} Πίνακας με διαδρομές αρχείων
 */
function getAllFilePaths(nodeData) {
    let paths = nodeData.files ? nodeData.files.map(f => f.path) : [];
    if (nodeData.children) {
        nodeData.children.forEach(child => {
            paths = paths.concat(getAllFilePaths(child));
        });
    }
    return paths.filter(p => !!p);
}

/**
 * Αναζητά έναν κόμβο και τον γονέα του στη μνήμη με βάση το ID του.
 * 
 * @param {Object} node - Ο κόμβος έναρξης της αναζήτησης
 * @param {string} nodeId - Το ID του κόμβου προς εύρεση
 * @returns {{node: Object, parent: Object|null}|null}
 */
function findNodeAndParent(node, nodeId) {
    if (node.id === nodeId) {
        return { node: node, parent: null };
    }
    if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.id === nodeId) {
                return { node: child, parent: node };
            }
            const found = findNodeAndParent(child, nodeId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Επανασχεδιάζει το δέντρο και ενημερώνει τη θέση του popup 
 * αν αυτό είναι ανοιχτό, ώστε να ακολουθήσει τις νέες συντεταγμένες των κόμβων.
 */
function updateAndReposition() {
    chart.update(treeData);
    
    if (popup.isOpen()) {
        const activeNodeId = popup.getActiveNodeId();
        const circleElement = chart.getNodeCircleElement(activeNodeId);
        
        if (circleElement) {
            popup.position(circleElement);
        } else {
            popup.hide();
        }
    }
}

// --- Ορισμός Callbacks για τη σύνδεση των Modules ---

const chartCallbacks = {
    onNodeClick: (event, d, circleElement) => {
        if (rootRename.isOpen()) rootRename.hide();

        // Αν πατηθεί ο ήδη ανοιχτός κόμβος, κλείνει το popup. Αλλιώς, ανοίγει το νέο.
        if (popup.isOpen() && popup.getActiveNodeId() === d.data.id) {
            popup.hide();
        } else {
            popup.show(circleElement, d);
        }
    },
    onRootDbClick: (event, d, textElement) => {
        popup.hide();
        rootRename.show(textElement, d);
    }
};

const popupCallbacks = {
    onSave: () => {
        saveData();
        updateAndReposition();
    },
    onAddBranch: (parentNodeD3) => {
        if (!parentNodeD3.data.children) {
            parentNodeD3.data.children = [];
        }
        const childCount = parentNodeD3.data.children.length;
        
        parentNodeD3.data.children.push({
            id: window.utils.generateId(),
            name: `Branch ${childCount + 1}`,
            text: null,
            files: [],
            children: []
        });

        chart.update(treeData);
        saveData();
    },
    onDeleteNode: (nodeToDeleteD3) => {
        const nodeId = nodeToDeleteD3.data.id;
        
        if (nodeToDeleteD3.depth === 0) {
            alert("Δεν είναι δυνατή η διαγραφή του αρχικού κόμβου.");
            return;
        }

        const confirmMsg = `Είστε σίγουροι ότι θέλετε να διαγράψετε τον κόμβο "${nodeToDeleteD3.data.name}", καθώς και όλους τους υπο-κλάδους και τα επισυναπτόμενα αρχεία του; Η ενέργεια αυτή δεν αναιρείται.`;
        if (confirm(confirmMsg)) {
            const filePathsToDelete = getAllFilePaths(nodeToDeleteD3.data);
            const result = findNodeAndParent(treeData, nodeId);

            if (result && result.parent) {
                // Αφαίρεση του κόμβου από τη μνήμη
                result.parent.children = result.parent.children.filter(child => child.id !== nodeId);

                // Ενημέρωση του backend για διαγραφή των φυσικών αρχείων από τον δίσκο
                if (filePathsToDelete.length > 0) {
                    apiService.deleteNodeFiles(filePathsToDelete);
                }

                chart.update(treeData);
                saveData();
            } else {
                console.error("Δεν βρέθηκε ο γονικός κόμβος για το ID:", nodeId);
                alert("Σφάλμα: Αδυναμία εύρεσης του γονικού κόμβου.");
            }
        }
    }
};

const rootRenameCallbacks = {
    onSave: (newName) => {
        saveData();
        chart.update(treeData);
    },
    onCancel: () => {
        chart.update(treeData);
    }
};

// --- Αρχικοποίηση Διεπαφής κατά τη φόρτωση του DOM ---

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const rootRenameInput = document.getElementById('root-rename-input');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const clearBtn = document.getElementById('clear-all-btn');
    const exportStatusSpan = document.getElementById('export-status');

    // Αρχικοποίηση των Modules
    chart = new TreeChart('#tree-svg', chartCallbacks);
    popup = new NodePopup(appContainer, popupCallbacks, apiService);
    rootRename = new RootRename(rootRenameInput, appContainer, rootRenameCallbacks);

    // Event Listener για την εξαγωγή PDF
    exportPdfBtn.addEventListener('click', async () => {
        popup.hide();
        rootRename.hide();

        if (exportStatusSpan) {
            exportStatusSpan.textContent = 'Δημιουργία PDF...';
            exportStatusSpan.style.display = 'inline';
            exportStatusSpan.style.color = '';
        }
        exportPdfBtn.disabled = true;

        try {
            // Μικρή καθυστέρηση για να καθαρίσει η οθόνη από τυχόν ανοιχτά μενού πριν την εκτύπωση
            await new Promise(resolve => setTimeout(resolve, 150));

            const result = await apiService.exportPdf();

            if (result.success) {
                if (exportStatusSpan) exportStatusSpan.textContent = 'Επιτυχής εξαγωγή PDF!';
                setTimeout(() => {
                    if (exportStatusSpan) exportStatusSpan.style.display = 'none';
                }, 3000);
            } else {
                if (exportStatusSpan) {
                    exportStatusSpan.textContent = `Σφάλμα: ${result.error || 'Ακυρώθηκε'}`;
                    exportStatusSpan.style.color = 'red';
                }
            }
        } catch (error) {
            console.error('Σφάλμα κατά την εξαγωγή PDF:', error);
            if (exportStatusSpan) {
                exportStatusSpan.textContent = 'Σφάλμα κατά την εξαγωγή.';
                exportStatusSpan.style.color = 'red';
            }
        } finally {
            exportPdfBtn.disabled = false;
        }
    });

    // Event Listener για τον πλήρη καθαρισμό δεδομένων
    clearBtn.addEventListener('click', () => {
        const confirmMsg = "Είστε απόλυτα σίγουροι ότι θέλετε να διαγράψετε όλα τα δεδομένα (τη δομή του δέντρου και τα αρχεία στα Έγγραφα); Αυτή η ενέργεια δεν αναιρείται.";
        if (confirm(confirmMsg)) {
            popup.hide();
            rootRename.hide();
            apiService.clearAllData();
        }
    });

    // Ακρόαση (Listener) για το καθολικό reset-tree (εκτελείται μετά τον καθαρισμό)
    const unsubscribeReset = apiService.onResetTree((defaultTreeData) => {
        treeData = defaultTreeData;
        popup.hide();
        rootRename.hide();
        chart.update(treeData);
        alert("Όλα τα δεδομένα διαγράφηκαν επιτυχώς.");
    });

    // Καθολικός Listener για το πλήκτρο Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (popup.isOpen()) popup.hide();
            if (rootRename.isOpen()) rootRename.hide();
        }
    });

    // Έναρξη φόρτωσης των δεδομένων
    loadInitialData();
});