/**
 * Διαχειριστής του Αναδυόμενου Παραθύρου (Popup) λεπτομερειών των κόμβων.
 */
export class NodePopup {
    /**
     * @param {HTMLElement} container - Το κεντρικό container της εφαρμογής (#app-container)
     * @param {Object} callbacks - Συναρτήσεις callback για την ενημέρωση του δέντρου
     * @param {Function} callbacks.onSave - Εκτελείται όταν αλλάζουν τα δεδομένα (όνομα, κείμενο, αρχεία)
     * @param {Function} callbacks.onAddBranch - Εκτελείται κατά τη δημιουργία νέου υπο-κλάδου
     * @param {Function} callbacks.onDeleteNode - Εκτελείται κατά τη διαγραφή του κόμβου
     * @param {Object} apiService - Η υπηρεσία επικοινωνίας με το backend (api.js)
     */
    constructor(container, callbacks = {}, apiService) {
        this.container = container;
        this.callbacks = callbacks;
        this.api = apiService;
        
        this.activePopup = null;
        this.activeNodeD3 = null;
        this.activeTargetElement = null;

        // Δέσμευση του context της μεθόδου για τη σωστή λειτουργία του global event listener
        this.globalClickListener = this.handleClickOutside.bind(this);
    }

    /**
     * Εμφανίζει το popup για έναν συγκεκριμένο κόμβο.
     * @param {SVGElement} targetElement - Ο κύκλος (D3 circle) που πατήθηκε
     * @param {Object} d - Τα δεδομένα ιεραρχίας D3 του κόμβου
     */
    show(targetElement, d) {
        this.hide(); // Κλείσιμο τυχόν προηγούμενου popup

        this.activeNodeD3 = d;
        this.activeTargetElement = targetElement;

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('node-actions');
        // Αποτροπή κλεισίματος όταν ο χρήστης κάνει κλικ μέσα στο ίδιο το popup
        actionsDiv.onclick = (e) => e.stopPropagation();

        const isRoot = d.depth === 0;
        const deleteButtonHtml = isRoot
            ? `<button class="delete-button" disabled title="Δεν είναι δυνατή η διαγραφή του αρχικού κόμβου">Διαγραφή Κόμβου</button>`
            : `<button class="delete-button" id="delete-node-btn">Διαγραφή Κόμβου</button>`;

        actionsDiv.innerHTML = `
            <div>
                <label for="node-name-input">Όνομα Κόμβου:</label>
                <input type="text" id="node-name-input">
            </div>
            <div>
                <label for="node-text-area">Περιγραφή / Σημειώσεις:</label>
                <textarea id="node-text-area" rows="3"></textarea>
            </div>
            <div class="files-section">
                <label>Επισυναπτόμενα Αρχεία:</label>
                <ul class="files-list" id="files-list"></ul>
                <button id="add-file-btn" style="margin-top: 5px;">+ Προσθήκη Αρχείου</button>
            </div>
            <div class="action-buttons">
                <button id="add-branch-btn">+ Νέος Κλάδος</button>
                ${deleteButtonHtml}
                <button id="close-popup-btn">Κλείσιμο</button>
            </div>
        `;

        this.container.appendChild(actionsDiv);
        this.activePopup = actionsDiv;

        // Ασφαλής ανάθεση τιμών (αποφυγή HTML/XSS injection)
        const nameInput = actionsDiv.querySelector('#node-name-input');
        const textArea = actionsDiv.querySelector('#node-text-area');
        nameInput.value = d.data.name || '';
        textArea.value = d.data.text || '';

        // Εμφάνιση της λίστας αρχείων
        this.renderFilesList(d.data.files);

        // Αναμονή ενός frame για να αποδοθεί το στοιχείο (DOM render) 
        // ώστε να υπολογιστούν σωστά οι διαστάσεις του για τη χωροθέτηση
        requestAnimationFrame(() => {
            if (this.activePopup === actionsDiv) {
                this.position(targetElement);
                actionsDiv.classList.add('visible');
            }
        });

        this.setupListeners(actionsDiv, d);

        // Προσθήκη listener για το κλείσιμο με κλικ εκτός του popup
        document.addEventListener('click', this.globalClickListener, true);
    }

    /**
     * Υπολογίζει και ρυθμίζει τη θέση του popup ώστε να παραμένει εντός ορίων της οθόνης.
     * @param {SVGElement} targetElement 
     */
    position(targetElement) {
        if (!this.activePopup) return;

        const circleRect = targetElement.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        const popupWidth = this.activePopup.offsetWidth;
        const popupHeight = this.activePopup.offsetHeight;

        // Δοκιμή τοποθέτησης στα δεξιά του κόμβου με απόσταση 10px
        let x = circleRect.right - containerRect.left + 10;
        let y = circleRect.top - containerRect.top + (circleRect.height / 2) - (popupHeight / 2);

        // Έλεγχος οριζόντιων ορίων: αν βγαίνει δεξιά, το τοποθετούμε στα αριστερά του κόμβου
        if (x + popupWidth > containerRect.width - 10) {
            x = circleRect.left - containerRect.left - popupWidth - 10;
        }
        
        // Διασφάλιση ότι δεν θα βγει αριστερά από το παράθυρο
        if (x < 10) {
            x = 10;
        }

        // Έλεγχος κατακόρυφων ορίων (πάνω και κάτω)
        if (y < 10) {
            y = 10;
        } else if (y + popupHeight > containerRect.height - 10) {
            y = containerRect.height - popupHeight - 10;
        }

        this.activePopup.style.left = `${x}px`;
        this.activePopup.style.top = `${y}px`;
    }

    /**
     * Επαναϋπολογίζει τη θέση του popup (χρήσιμο κατά την ανανέωση του δέντρου).
     */
    updatePosition() {
        if (this.activePopup && this.activeTargetElement) {
            this.position(this.activeTargetElement);
        }
    }

    /**
     * Ελέγχει αν το popup είναι ανοιχτό.
     * @returns {boolean}
     */
    isOpen() {
        return this.activePopup !== null;
    }

    /**
     * Επιστρέφει το ID του κόμβου που επεξεργάζεται αυτή τη στιγμή.
     * @returns {string|null}
     */
    getActiveNodeId() {
        return this.activeNodeD3 ? this.activeNodeD3.data.id : null;
    }

    /**
     * Κλείνει το popup και αφαιρεί τους listeners.
     */
    hide() {
        if (this.activePopup) {
            const popupToRemove = this.activePopup;
            popupToRemove.classList.remove('visible');

            // Αναμονή ολοκλήρωσης του CSS transition πριν την αφαίρεση από το DOM
            setTimeout(() => {
                if (popupToRemove.parentNode) {
                    popupToRemove.parentNode.removeChild(popupToRemove);
                }
            }, 150);
        }
        this.activePopup = null;
        this.activeNodeD3 = null;
        this.activeTargetElement = null;

        document.removeEventListener('click', this.globalClickListener, true);
    }

    /**
     * Δημιουργεί δυναμικά τη λίστα των επισυναπτόμενων αρχείων.
     * @param {Object[]} files 
     */
    renderFilesList(files) {
        if (!this.activePopup) return;
        const filesList = this.activePopup.querySelector('#files-list');
        filesList.innerHTML = '';

        if (!files || files.length === 0) {
            filesList.innerHTML = '<li><small>Δεν υπάρχουν επισυναπτόμενα αρχεία.</small></li>';
            return;
        }

        files.forEach(file => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = file.originalName;
            span.title = file.path;
            
            // Κλικ για το άνοιγμα του αρχείου μέσω του OS
            span.onclick = () => this.api.openFile(file.path);

            li.appendChild(span);
            filesList.appendChild(li);
        });
    }

    /**
     * Ρυθμίζει τους event listeners για τα στοιχεία της φόρμας.
     * @private
     */
    setupListeners(popupDiv, d) {
        const nameInput = popupDiv.querySelector('#node-name-input');
        const textArea = popupDiv.querySelector('#node-text-area');
        const addFileBtn = popupDiv.querySelector('#add-file-btn');
        const addBranchBtn = popupDiv.querySelector('#add-branch-btn');
        const deleteNodeBtn = popupDiv.querySelector('#delete-node-btn');
        const closeBtn = popupDiv.querySelector('#close-popup-btn');

        // Αποθήκευση ονόματος στο Blur (χάσιμο εστίασης) ή με Enter
        const saveName = () => {
            const newName = nameInput.value.trim();
            if (newName && newName !== d.data.name) {
                d.data.name = newName;
                if (this.callbacks.onSave) this.callbacks.onSave();
            } else {
                nameInput.value = d.data.name; // Επαναφορά παλαιού ονόματος αν αφεθεί κενό
            }
        };

        nameInput.addEventListener('blur', saveName);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
                nameInput.blur();
            } else if (e.key === 'Escape') {
                nameInput.value = d.data.name;
                nameInput.blur();
                this.hide();
            }
        });

        // Αποθήκευση περιγραφής στο Blur
        const saveText = () => {
            const newText = textArea.value;
            if (newText !== (d.data.text || '')) {
                d.data.text = newText ? newText : null;
                if (this.callbacks.onSave) this.callbacks.onSave();
            }
        };

        textArea.addEventListener('blur', saveText);
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                textArea.value = d.data.text || '';
                textArea.blur();
                this.hide();
            }
        });

        // Προσθήκη Αρχείου
        addFileBtn.onclick = async () => {
            try {
                const fileInfo = await this.api.openFileDialog();
                if (fileInfo) {
                    const copiedPath = await this.api.copyFile(fileInfo.filePath);
                    if (copiedPath) {
                        d.data.files.push({ 
                            path: copiedPath, 
                            originalName: fileInfo.fileName 
                        });
                        
                        if (this.callbacks.onSave) this.callbacks.onSave();
                        this.renderFilesList(d.data.files);
                    }
                }
            } catch (err) {
                console.error("Σφάλμα προσθήκης αρχείου:", err);
                alert(`Προέκυψε σφάλμα κατά την επισύναψη του αρχείου: ${err.message}`);
            }
        };

        // Δημιουργία Νέου Κλάδου (Child)
        addBranchBtn.onclick = () => {
            if (this.callbacks.onAddBranch) {
                this.callbacks.onAddBranch(d);
                this.hide();
            }
        };

        // Διαγραφή Κόμβου (αν επιτρέπεται)
        if (deleteNodeBtn) {
            deleteNodeBtn.onclick = () => {
                if (this.callbacks.onDeleteNode) {
                    this.callbacks.onDeleteNode(d);
                    this.hide();
                }
            };
        }

        // Κλείσιμο παραθύρου
        closeBtn.onclick = () => this.hide();
    }

    /**
     * Διαχειρίζεται το κλείσιμο του popup όταν γίνεται κλικ εκτός αυτού.
     * @private
     */
    handleClickOutside(event) {
        if (this.activePopup && !this.activePopup.contains(event.target)) {
            // Κλείσιμο μόνο αν το κλικ δεν έγινε σε κάποιον άλλον κύκλο (circle) κόμβου
            const clickedCircle = event.target.closest('g.node > circle');
            if (!clickedCircle) {
                this.hide();
            }
        }
    }
}