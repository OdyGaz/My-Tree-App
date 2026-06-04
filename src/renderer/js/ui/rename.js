/**
 * Διαχειριστής της inline μετονομασίας του αρχικού κόμβου (Root).
 */
export class RootRename {
    /**
     * @param {HTMLInputElement} inputElement - Το HTML στοιχείο input (#root-rename-input)
     * @param {HTMLElement} container - Το κεντρικό app-container της εφαρμογής (#app-container)
     * @param {Object} callbacks - Συναρτήσεις callback για την ενημέρωση του δέντρου
     * @param {Function} callbacks.onSave - Εκτελείται όταν η μετονομασία ολοκληρωθεί επιτυχώς
     * @param {Function} callbacks.onCancel - Εκτελείται σε περίπτωση ακύρωσης
     */
    constructor(inputElement, container, callbacks = {}) {
        this.input = inputElement;
        this.container = container;
        this.callbacks = callbacks;

        this.activeNodeD3 = null;
        this.activeTextElement = null;
    }

    /**
     * Εμφανίζει το πεδίο εισαγωγής ακριβώς επάνω από το όνομα του Root κόμβου.
     * @param {SVGTextElement} textElement - Το SVG στοιχείο κειμένου του Root κόμβου
     * @param {Object} d - Τα δεδομένα ιεραρχίας D3 του Root κόμβου
     */
    show(textElement, d) {
        this.hide(); // Καθαρισμός τυχόν προηγούμενης εκκρεμούς μετονομασίας

        this.activeNodeD3 = d;
        this.activeTextElement = textElement;

        const textRect = textElement.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        // Υπολογισμός των ακριβών διαστάσεων για την τέλεια επικάλυψη
        const textWidth = textRect.width;
        const inputWidth = Math.max(80, textWidth + 10); // Δίνουμε λίγο padding αριστερά-δεξιά

        // Υπολογισμός θέσης Top & Left σε σχέση με το container
        const inputTop = textRect.top - containerRect.top;
        const inputLeft = (textRect.left - containerRect.left) - (inputWidth / 2) + (textWidth / 2);

        // Ρύθμιση στυλ και τοποθέτηση του HTML Input
        this.input.style.top = `${inputTop}px`;
        this.input.style.left = `${inputLeft}px`;
        this.input.style.width = `${inputWidth}px`;
        this.input.style.display = 'block';
        
        // Ασφαλής ανάθεση τιμής και αυτόματη επιλογή του κειμένου
        this.input.value = d.data.name;
        this.input.focus();
        this.input.select();

        // Απόκρυψη του SVG Text για να μην φαίνεται διπλό το κείμενο από πίσω
        this.activeTextElement.style.display = 'none';

        // Σύνδεση προσωρινών event listeners
        this.input.onblur = this.handleFinish.bind(this);
        this.input.onkeydown = this.handleKeyDown.bind(this);
    }

    /**
     * Ελέγχει αν η διαδικασία μετονομασίας είναι ενεργή.
     * @returns {boolean}
     */
    isOpen() {
        return this.input.style.display === 'block';
    }

    /**
     * Αποκρύπτει το input και καθαρίζει τις αναφορές.
     */
    hide() {
        this.input.style.display = 'none';
        this.input.onblur = null;
        this.input.onkeydown = null;
        
        this.activeNodeD3 = null;
        this.activeTextElement = null;
    }

    /**
     * Ολοκληρώνει τη διαδικασία μετονομασίας και αποθηκεύει αν υπάρχει αλλαγή.
     * @private
     */
    handleFinish() {
        const newName = this.input.value.trim();
        const originalName = this.activeNodeD3 ? this.activeNodeD3.data.name : '';

        // Επαναφορά της εμφάνισης του SVG Text
        if (this.activeTextElement) {
            this.activeTextElement.style.display = '';
        }

        this.hide();

        // Έλεγχος αν όντως άλλαξε το όνομα και αν δεν είναι κενό
        if (newName && newName !== originalName) {
            this.activeNodeD3.data.name = newName;
            if (this.callbacks.onSave) {
                this.callbacks.onSave(newName);
            }
        } else if (this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }
    }

    /**
     * Διαχειρίζεται τα πλήκτρα Enter (αποδοχή) και Escape (ακύρωση).
     * @private
     */
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleFinish();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            
            // Επαναφορά της εμφάνισης του SVG Text χωρίς αλλαγή ονόματος
            if (this.activeTextElement) {
                this.activeTextElement.style.display = '';
            }
            
            this.hide();
            
            if (this.callbacks.onCancel) {
                this.callbacks.onCancel();
            }
        }
    }
}