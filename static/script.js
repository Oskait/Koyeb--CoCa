document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selection ---
    const compoundSelect = document.getElementById('compound-select');
    const compoundNameInput = document.getElementById('compound-name');
    const molecularWeightInput = document.getElementById('molecular-weight');
    const concentrationInput = document.getElementById('concentration');
    const volumeInput = document.getElementById('volume');
    const actualWeighInInput = document.getElementById('actual-weigh-in');
    
    const unitToggle = document.getElementById('unit-toggle');
    const unitLabel = document.getElementById('unit-label');
    
    const weighInMassSpan = document.getElementById('weigh-in-mass');
    const weighInMassGSpan = document.getElementById('weigh-in-mass-g');
    const requiredVolumeSpan = document.getElementById('required-volume');
    
    const calculationOverview = document.getElementById('calculation-overview');
    const overviewName = document.getElementById('overview-name');
    const overviewConcentration = document.getElementById('overview-concentration');
    const overviewVolume = document.getElementById('overview-volume');
    
    const saveStockButton = document.getElementById('save-stock');
    
    const stockSolutionsTable = document.getElementById('stock-solutions-table').getElementsByTagName('tbody')[0];
    const toggleStockButton = document.getElementById('toggle-stock-solutions');
    const stockSolutionsWrapper = document.getElementById('stock-solutions-wrapper');

    // --- State ---
    let selectedCompound = null;

    // --- Functions ---

    function fetchStockSolutions() {
        fetch('/api/stock-solutions')
            .then(response => response.json())
            .then(data => {
                stockSolutionsTable.innerHTML = '';
                data.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
                data.forEach(solution => {
                    let row = stockSolutionsTable.insertRow();
                    row.insertCell(0).textContent = new Date(solution.date).toLocaleString();
                    row.insertCell(1).textContent = solution.compound_name;
                    row.insertCell(2).textContent = solution.concentration_mM.toFixed(2);
                    row.insertCell(3).textContent = solution.concentration_mg_ml.toFixed(2);
                    row.insertCell(4).textContent = solution.volume.toFixed(2);
                    row.insertCell(5).textContent = solution.weighed_in_mg.toFixed(2);
                });
            });
    }

    function selectCompound() {
        const selectedOption = compoundSelect.options[compoundSelect.selectedIndex];
        // -- New Compound -- is selected
        if (!selectedOption.value) {
            selectedCompound = null;
            compoundNameInput.value = '';
            molecularWeightInput.value = '';
            concentrationInput.value = '';
            volumeInput.value = '';
            actualWeighInInput.value = '';
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

        compoundNameInput.value = selectedCompound.abbr_name;
        molecularWeightInput.value = isNaN(mw) ? '' : mw;
        concentrationInput.value = unitToggle.checked ? (isNaN(concMgml) ? '' : concMgml) : (isNaN(concMm) ? '' : concMm);
        volumeInput.value = isNaN(vol) ? '' : vol;
        
        calculateWeighIn();
        calculateRequiredVolume();
    }

    function calculateWeighIn() {
        const mw = parseFloat(molecularWeightInput.value);
        const conc = parseFloat(concentrationInput.value);
        const vol = parseFloat(volumeInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(vol)) {
            weighInMassSpan.textContent = '0';
            weighInMassGSpan.textContent = '0';
            updateOverview();
            return;
        }

        let weighInMg = 0;
        if (unitToggle.checked) { // mg/ml
            weighInMg = conc * vol;
        } else { // mM
            weighInMg = (conc / 1000) * mw * vol;
        }

        weighInMassSpan.textContent = weighInMg.toFixed(2);
        weighInMassGSpan.textContent = (weighInMg / 1000).toFixed(4);
        updateOverview();
    }

    function calculateRequiredVolume() {
        const mw = parseFloat(molecularWeightInput.value);
        const conc = parseFloat(concentrationInput.value);
        const actualWeighIn = parseFloat(actualWeighInInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(actualWeighIn)) {
            requiredVolumeSpan.textContent = '0';
            updateOverview();
            return;
        }

        let reqVol = 0;
        if (unitToggle.checked) { // mg/ml
            reqVol = actualWeighIn / conc;
        } else { // mM
            reqVol = (actualWeighIn / mw) / (conc / 1000);
        }

        requiredVolumeSpan.textContent = reqVol.toFixed(2);
        updateOverview();
    }
    
    function updateOverview() {
        const name = compoundNameInput.value;
        const conc = parseFloat(concentrationInput.value);
        const reqVol = parseFloat(requiredVolumeSpan.textContent);
        const desiredVol = parseFloat(volumeInput.value);
        const unit = unitLabel.textContent;
        
        if (!name || isNaN(conc) || (isNaN(reqVol) && isNaN(desiredVol))) {
            calculationOverview.style.display = 'none';
            return;
        }
        
        const finalVol = reqVol > 0 ? reqVol : desiredVol;
        if(isNaN(finalVol)){
             calculationOverview.style.display = 'none';
             return;
        }

        overviewName.textContent = name;
        overviewConcentration.textContent = `${conc.toFixed(2)} ${unit}`;
        overviewVolume.textContent = `${finalVol.toFixed(2)} ml`;
        calculationOverview.style.display = 'block';
    }

    // --- Event Listeners ---

    unitToggle.addEventListener('change', () => {
        const isMgMl = unitToggle.checked;
        unitLabel.textContent = isMgMl ? 'mg/ml' : 'mM';
        
        if (selectedCompound) {
            const concMm = selectedCompound.default_conc_mM;
            const concMgml = selectedCompound.default_conc_mg_ml;
            concentrationInput.value = isMgMl ? (isNaN(concMgml) ? '' : concMgml) : (isNaN(concMm) ? '' : concMm);
        }
        calculateWeighIn();
        calculateRequiredVolume();
    });

    toggleStockButton.addEventListener('click', () => {
        const isVisible = stockSolutionsWrapper.style.display === 'block';
        stockSolutionsWrapper.style.display = isVisible ? 'none' : 'block';
    });

    compoundSelect.addEventListener('change', selectCompound);
    
    // Add listeners to all calculator inputs
    [compoundNameInput, molecularWeightInput, concentrationInput, volumeInput, actualWeighInInput].forEach(input => {
        input.addEventListener('input', () => {
            calculateWeighIn();
            calculateRequiredVolume();
        });
    });

    saveStockButton.addEventListener('click', () => {
        const compoundName = compoundNameInput.value;
        const molecularWeight = parseFloat(molecularWeightInput.value);
        const concentration = parseFloat(concentrationInput.value);
        const weighedIn = parseFloat(actualWeighInInput.value);
        const volume = parseFloat(requiredVolumeSpan.textContent);

        if (!compoundName) {
            alert('Please enter a compound name.');
            return;
        }
        if (isNaN(molecularWeight)) {
            alert('Please enter a valid molecular weight.');
            return;
        }
        if (isNaN(weighedIn) || weighedIn <= 0) {
            alert('Please enter a valid actual weigh-in amount.');
            return;
        }
        if (isNaN(volume) || volume <= 0) {
            alert('Calculated volume is invalid. Please check your inputs.');
            return;
        }

        let concentration_mM = 0;
        let concentration_mg_ml = 0;

        if (unitToggle.checked) { // mg/ml
            concentration_mg_ml = concentration;
            concentration_mM = (concentration / molecularWeight) * 1000;
        } else { // mM
            concentration_mM = concentration;
            concentration_mg_ml = (concentration / 1000) * molecularWeight;
        }

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
});