/**
 * Υπηρεσία Σχεδίασης Δέντρου χρησιμοποιώντας τη βιβλιοθήκη D3.js.
 * Διαχειρίζεται αποκλειστικά την παραγωγή του SVG, των κόμβων και των συνδέσμων.
 */
export class TreeChart {
    /**
     * @param {string} svgSelector - Ο CSS επιλογέας για το στοιχείο SVG (π.χ. '#tree-svg')
     * @param {Object} callbacks - Συναρτήσεις callback για τα συμβάντα των κόμβων
     * @param {Function} callbacks.onNodeClick - Εκτελείται στο απλό κλικ επάνω σε κύκλο κόμβου
     * @param {Function} callbacks.onRootDbClick - Εκτελείται στο διπλό κλικ επάνω στο όνομα του Root
     */
    constructor(svgSelector, callbacks = {}) {
        this.svg = d3.select(svgSelector);
        this.callbacks = callbacks;

        // Ανάγνωση των διαστάσεων απευθείας από τις CSS μεταβλητές του style.css
        const style = getComputedStyle(document.documentElement);
        this.nodeRadius = parseFloat(style.getPropertyValue('--node-radius')) || 12;
        this.verticalSpacing = parseFloat(style.getPropertyValue('--vertical-spacing')) || 160;
        this.horizontalNodeSeparation = parseFloat(style.getPropertyValue('--horizontal-node-separation')) || 60;

        // Δημιουργία των ομάδων σχεδίασης (groups) για συνδέσμους και κόμβους
        this.gLinks = this.svg.append("g").attr("class", "links");
        this.gNodes = this.svg.append("g").attr("class", "nodes");

        // Ρύθμιση του D3 Tree Layout
        this.treeLayout = d3.tree()
            .nodeSize([this.horizontalNodeSeparation, this.verticalSpacing])
            .separation((a, b) => (a.parent === b.parent ? 1.7 : 2.2));

        // Γεννήτρια κατακόρυφων καμπυλών (Vertical Links)
        this.linkGenerator = d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y);
    }

    /**
     * Σχεδιάζει ή ανανεώνει το δέντρο με βάση τα τρέχοντα δεδομένα.
     * @param {Object} treeData - Η ιεραρχική δομή δεδομένων του δέντρου
     */
    update(treeData) {
        if (!treeData) return;

        // Δημιουργία ιεραρχίας D3
        const rootNodeD3 = d3.hierarchy(treeData);
        this.treeLayout(rootNodeD3);

        const nodes = rootNodeD3.descendants();
        const links = rootNodeD3.links();

        // Υπολογισμός των ορίων (Bounding Box) του δέντρου για την αυτόματη προσαρμογή του SVG
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(d => {
            if (d.x < minX) minX = d.x;
            if (d.x > maxX) maxX = d.x;
            if (d.y < minY) minY = d.y;
            if (d.y > maxY) maxY = d.y;
        });

        // Διαχείριση της περίπτωσης που υπάρχει μόνο ο αρχικός κόμβος (Root)
        if (nodes.length === 1) {
            minX = nodes[0].x - 100;
            maxX = nodes[0].x + 100;
            minY = nodes[0].y - 50;
            maxY = nodes[0].y + 50;
        }

        const textOffset = this.nodeRadius + 15; // Χώρος που απαιτείται για το κείμενο κάτω από τον τελευταίο κόμβο
        const padding = 60; // Περιθώριο γύρω από το δέντρο εντός του SVG

        // Υπολογισμός των πραγματικών διαστάσεων που απαιτούνται
        const contentWidth = (maxX - minX) + padding * 2;
        const contentHeight = (maxY - minY) + this.nodeRadius + textOffset + padding * 2;

        // Δυναμική προσαρμογή του μεγέθους και του viewBox του SVG
        this.svg
            .attr("width", contentWidth)
            .attr("height", contentHeight)
            .attr("viewBox", `${minX - padding} ${minY - padding} ${contentWidth} ${contentHeight}`);

        // --- Σχεδίαση/Ενημέρωση Συνδέσμων (Links) ---
        this.gLinks.selectAll(".link")
            .data(links, d => d.target.data.id)
            .join("path")
            .attr("class", "link")
            .transition().duration(500)
            .attr("d", this.linkGenerator);

        // --- Σχεδίαση/Ενημέρωση Κόμβων (Nodes) ---
        const nodeGroups = this.gNodes.selectAll("g.node")
            .data(nodes, d => d.data.id);

        // 1. Είσοδος νέων κόμβων (Enter Selection)
        const nodeEnter = nodeGroups.enter().append("g")
            .attr("class", d => (d.depth === 0 ? "node node-root" : "node"))
            .attr("transform", d => `translate(${d.parent ? d.parent.x : d.x}, ${d.parent ? d.parent.y : d.y})`)
            .attr("opacity", 0);

        // Προσθήκη του Κύκλου
        nodeEnter.append("circle")
            .attr("r", this.nodeRadius)
            .on("click", (event, d) => {
                event.stopPropagation();
                if (this.callbacks.onNodeClick) {
                    const circleElement = event.currentTarget;
                    this.callbacks.onNodeClick(event, d, circleElement);
                }
            });

        // Προσθήκη του Κειμένου
        nodeEnter.append("text")
            .attr("class", d => (d.depth === 0 ? "root-name" : null))
            .attr("transform", `translate(0, ${this.nodeRadius + 12})`)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.data.name)
            .on("dblclick", (event, d) => {
                if (d.depth === 0) {
                    event.stopPropagation();
                    if (this.callbacks.onRootDbClick) {
                        const textElement = event.currentTarget;
                        this.callbacks.onRootDbClick(event, d, textElement);
                    }
                }
            });

        // 2. Ενημέρωση υπαρχόντων κόμβων (Update Selection)
        const nodeUpdate = nodeGroups.merge(nodeEnter);

        nodeUpdate.transition().duration(500)
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .attr("opacity", 1);

        nodeUpdate.attr("class", d => (d.depth === 0 ? "node node-root" : "node"));

        nodeUpdate.select("text")
            .text(d => d.data.name)
            .attr("class", d => (d.depth === 0 ? "root-name" : null));

        // 3. Αφαίρεση κόμβων που διαγράφηκαν (Exit Selection)
        nodeGroups.exit()
            .transition().duration(300)
            .attr("opacity", 0)
            .remove();
    }

    /**
     * Βρίσκει και επιστρέφει το DOM στοιχείο κύκλου (circle) ενός συγκεκριμένου κόμβου.
     * Χρήσιμο για τον επαναϋπολογισμό θέσης του popup όταν αλλάζουν τα δεδομένα.
     * @param {string} nodeId 
     * @returns {SVGElement|null}
     */
    getNodeCircleElement(nodeId) {
        const nodeGroup = this.gNodes.selectAll("g.node").filter(d => d.data.id === nodeId);
        if (!nodeGroup.empty()) {
            return nodeGroup.select("circle").node();
        }
        return null;
    }
}