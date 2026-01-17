document.addEventListener('DOMContentLoaded', function() {
    
    function init() {
        document.getElementById('refresh-button').addEventListener('click', () => location.reload(true));
        // --- Element Selection ---
        const elements = {
            compoundSelect: document.getElementById('compound-select'),
            compoundNameInput: document.getElementById('compound-name'),
            molecularWeightInput: document.getElementById('molecular-weight'),
            concentrationInput: document.getElementById('concentration'),
            volumeInput: document.getElementById('volume'),
            actualWeighInInput: document.getElementById('actual-weigh-in'),
            unitToggle: document.getElementById('unit-toggle'),
            unitLabel: document.getElementById('unit-label'),
            weighInMassSpan: document.getElementById('weigh-in-mass'),
            weighInMassGSpan: document.getElementById('weigh-in-mass-g'),
            requiredVolumeSpan: document.getElementById('required-volume'),
            requiredVolumeUl: document.getElementById('required-volume-ul'),
            calculationOverview: document.getElementById('calculation-overview'),
            overviewName: document.getElementById('overview-name'),
            overviewConcentration: document.getElementById('overview-concentration'),
            overviewVolume: document.getElementById('overview-volume'),
            saveStockButton: document.getElementById('save-stock'),
            stockSolutionsTable: document.getElementById('stock-solutions-table')?.getElementsByTagName('tbody')[0],
            toggleStockButton: document.getElementById('toggle-stock-solutions'),
            stockSolutionsWrapper: document.getElementById('stock-solutions-wrapper'),
        };

        // Check if all crucial elements exist
        for (const key in elements) {
            if (!elements[key]) {
                console.error(`Initialization failed: Element with key '${key}' not found.`);
                // alert(`An error occurred loading the page. A required element ('${key}') was not found. Please try again.`);
                return; // Stop execution if a crucial element is missing
            }
        }

        // --- State ---
        let selectedCompound = null;

        // --- Functions ---
        function fetchStockSolutions() {
            fetch('/api/stock-solutions')
                .then(response => response.json())
                .then(data => {
                    elements.stockSolutionsTable.innerHTML = '';
                    data.sort((a, b) => new Date(b.date) - new Date(a.date));
                    data.forEach(solution => {
                        let row = elements.stockSolutionsTable.insertRow();
                        row.insertCell(0).textContent = new Date(solution.date).toLocaleString();
                        row.insertCell(1).textContent = solution.compound_name;
                        row.insertCell(2).textContent = solution.concentration_mM.toFixed(2);
                        row.insertCell(3).textContent = solution.concentration_mg_ml.toFixed(2);
                        row.insertCell(4).textContent = solution.volume.toFixed(2);
                        row.insertCell(5).textContent = solution.weighed_in_mg.toFixed(2);
                    });
                }).catch(error => console.error('Error fetching stock solutions:', error));
        }

        function selectCompound() {
            const selectedOption = elements.compoundSelect.options[elements.compoundSelect.selectedIndex];
            if (!selectedOption.value) {
                selectedCompound = null;
                elements.compoundNameInput.value = '';
                elements.molecularWeightInput.value = '';
                elements.concentrationInput.value = '';
                elements.volumeInput.value = '';
                elements.actualWeighInInput.value = '';
                calculateWeighIn();
                calculateRequiredVolume();
                return;
            }

            const mw = parseFloat(selectedOption.dataset.mw);
            const concMm = parseFloat(selectedOption.dataset.concMm);
            const concMgml = parseFloat(selectedOption.dataset.concMgml);
            const vol = parseFloat(selectedOption.dataset.vol);

            selectedCompound = {
                id: selectedOption.value,
                abbr_name: selectedOption.dataset.name,
                molecular_weight: mw,
                default_conc_mM: concMm,
                default_conc_mg_ml: concMgml,
                default_volume: vol
            };

            elements.compoundNameInput.value = selectedCompound.abbr_name;
            elements.molecularWeightInput.value = isNaN(mw) ? '' : mw;
            elements.concentrationInput.value = elements.unitToggle.checked ? (isNaN(concMgml) ? '' : concMgml) : (isNaN(concMm) ? '' : concMm);
            elements.volumeInput.value = isNaN(vol) ? '' : vol;
            
            calculateWeighIn();
            calculateRequiredVolume();
        }

        function calculateWeighIn() {
            const mw = parseFloat(elements.molecularWeightInput.value);
            const conc = parseFloat(elements.concentrationInput.value);
            const vol = parseFloat(elements.volumeInput.value);

            if (isNaN(mw) || isNaN(conc) || isNaN(vol)) {
                elements.weighInMassSpan.textContent = '0';
                elements.weighInMassGSpan.textContent = '0';
                updateOverview();
                return;
            }

            let weighInMg = 0;
            if (elements.unitToggle.checked) { weighInMg = conc * vol; } 
            else { weighInMg = (conc / 1000) * mw * vol; }

            elements.weighInMassSpan.textContent = weighInMg.toFixed(2);
            elements.weighInMassGSpan.textContent = (weighInMg / 1000).toFixed(4);
            updateOverview();
        }

        function calculateRequiredVolume() {
            const mw = parseFloat(elements.molecularWeightInput.value);
            const conc = parseFloat(elements.concentrationInput.value);
            const actualWeighIn = parseFloat(elements.actualWeighInInput.value);

            if (isNaN(mw) || isNaN(conc) || isNaN(actualWeighIn)) {
                elements.requiredVolumeSpan.textContent = '0';
                elements.requiredVolumeUl.textContent = '0';
                updateOverview();
                return;
            }

            let reqVol = 0;
            if (elements.unitToggle.checked) { // mg/ml
                reqVol = actualWeighIn / conc;
            } else { // mM
                reqVol = (actualWeighIn / mw) / (conc / 1000);
            }

            elements.requiredVolumeSpan.textContent = reqVol.toFixed(2);
            elements.requiredVolumeUl.textContent = Math.round(reqVol * 1000);
            updateOverview();
        }
        
        function updateOverview() {
            const name = elements.compoundNameInput.value;
            const conc = parseFloat(elements.concentrationInput.value);
            const mw = parseFloat(elements.molecularWeightInput.value);
            const reqVol = parseFloat(elements.requiredVolumeSpan.textContent);
            const desiredVol = parseFloat(elements.volumeInput.value);
            
            if (!name || isNaN(conc) || (reqVol <= 0 && isNaN(desiredVol)) || isNaN(mw)) {
                elements.calculationOverview.style.display = 'none';
                return;
            }
            
            const finalVol = reqVol > 0 ? reqVol : desiredVol;
            if (isNaN(finalVol)) {
                 elements.calculationOverview.style.display = 'none';
                 return;
            }

            let concentrationText = '';
            if (elements.unitToggle.checked) { // mg/ml
                const concInM = (conc / mw).toFixed(4);
                concentrationText = `${Math.round(conc)} mg/ml (${concInM} M)`;
            } else { // mM
                const concInM = (conc / 1000).toFixed(4);
                concentrationText = `${Math.round(conc)} mM (${concInM} M)`;
            }

            elements.overviewName.textContent = name;
            elements.overviewConcentration.textContent = concentrationText;
            elements.overviewVolume.textContent = `${finalVol.toFixed(2)} ml`;
            elements.calculationOverview.style.display = 'block';
        }

        // --- Event Listeners ---
        elements.unitToggle.addEventListener('change', () => {
            elements.unitLabel.textContent = elements.unitToggle.checked ? 'mg/ml' : 'mM';
            if (selectedCompound) {
                const concMm = selectedCompound.default_conc_mM;
                const concMgml = selectedCompound.default_conc_mg_ml;
                elements.concentrationInput.value = elements.unitToggle.checked ? (isNaN(concMgml) ? '' : concMgml) : (isNaN(concMm) ? '' : concMm);
            }
            calculateWeighIn();
            calculateRequiredVolume();
        });

        elements.toggleStockButton.addEventListener('click', () => {
            const isVisible = elements.stockSolutionsWrapper.style.display === 'block';
            elements.stockSolutionsWrapper.style.display = isVisible ? 'none' : 'block';
        });

        elements.compoundSelect.addEventListener('change', selectCompound);
        
        const inputsToTrack = [
            elements.compoundNameInput, elements.molecularWeightInput, 
            elements.concentrationInput, elements.volumeInput, elements.actualWeighInInput
        ];
        inputsToTrack.forEach(input => {
            input.addEventListener('input', () => {
                calculateWeighIn();
                calculateRequiredVolume();
            });
        });

        elements.saveStockButton.addEventListener('click', () => {
            const compoundName = elements.compoundNameInput.value;
            const molecularWeight = parseFloat(elements.molecularWeightInput.value);
            const concentration = parseFloat(elements.concentrationInput.value);
            const weighedIn = parseFloat(elements.actualWeighInInput.value);
            const volume = parseFloat(elements.requiredVolumeSpan.textContent);

            if (!compoundName) { return alert('Please enter a compound name.'); }
            if (isNaN(molecularWeight) || molecularWeight <= 0) { return alert('Please enter a valid molecular weight.'); }
            if (isNaN(weighedIn) || weighedIn <= 0) { return alert('Please enter a valid actual weigh-in amount.'); }
            if (isNaN(volume) || volume <= 0) { return alert('Calculated volume is invalid. Please check your inputs.'); }

            let concentration_mM = elements.unitToggle.checked ? (concentration / molecularWeight) * 1000 : concentration;
            let concentration_mg_ml = elements.unitToggle.checked ? concentration : (concentration / 1000) * molecularWeight;

            const solution = {
                compound_name: compoundName,
                concentration_mM: concentration_mM,
                concentration_mg_ml: concentration_mg_ml,
                volume: volume,
                weighed_in_mg: weighedIn
            };

            fetch('/api/stock-solutions', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(solution)
            })
            .then(response => {
                if (!response.ok) { throw new Error('Failed to save stock solution'); }
                return response.json();
            })
            .then(() => {
                fetchStockSolutions();
                alert('Stock solution saved!');
            })
            .catch(error => {
                console.error('Error saving stock solution:', error);
                alert('Error saving stock solution. See console for details.');
            });
        });

        // --- Initial Load ---
        fetchStockSolutions();
    }

    init(); // Run the app
});