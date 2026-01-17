document.addEventListener('DOMContentLoaded', function() {
    const compoundSelect = document.getElementById('compound-select');
    const stockSolutionsTable = document.getElementById('stock-solutions-table').getElementsByTagName('tbody')[0];
    const molecularWeightInput = document.getElementById('molecular-weight');
    const concentrationInput = document.getElementById('concentration');
    const unitToggle = document.getElementById('unit-toggle');
    const unitLabel = document.getElementById('unit-label');
    const volumeInput = document.getElementById('volume');
    const weighInMassSpan = document.getElementById('weigh-in-mass');
    const weighInMassGSpan = document.getElementById('weigh-in-mass-g');
    const actualWeighInInput = document.getElementById('actual-weigh-in');
    const requiredVolumeSpan = document.getElementById('required-volume');
    const saveStockButton = document.getElementById('save-stock');
    const toggleStockButton = document.getElementById('toggle-stock-solutions');
    const stockSolutionsWrapper = document.getElementById('stock-solutions-wrapper');
    const calculationOverview = document.getElementById('calculation-overview');
    const overviewName = document.getElementById('overview-name');
    const overviewConcentration = document.getElementById('overview-concentration');
    const overviewVolume = document.getElementById('overview-volume');


    let selectedCompound = null;

    // Fetch stock solutions and populate table
    function fetchStockSolutions() {
        fetch('/api/stock-solutions')
            .then(response => response.json())
            .then(data => {
                stockSolutionsTable.innerHTML = '';
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
        if (!selectedOption.value) {
            selectedCompound = null;
            molecularWeightInput.value = '';
            concentrationInput.value = '';
            volumeInput.value = '';
            actualWeighInInput.value = '';
            requiredVolumeSpan.textContent = '0';
            weighInMassSpan.textContent = '0';
            weighInMassGSpan.textContent = '0';
            calculationOverview.style.display = 'none';
            return;
        }

        selectedCompound = {
            id: selectedOption.value,
            abbr_name: selectedOption.dataset.name,
            molecular_weight: parseFloat(selectedOption.dataset.mw),
            default_conc_mM: parseFloat(selectedOption.dataset.concMm),
            default_conc_mg_ml: parseFloat(selectedOption.dataset.concMgml),
            default_volume: parseFloat(selectedOption.dataset.vol)
        };

        molecularWeightInput.value = selectedCompound.molecular_weight;
        concentrationInput.value = unitToggle.checked ? selectedCompound.default_conc_mg_ml : selectedCompound.default_conc_mM;
        volumeInput.value = selectedCompound.default_volume;
        calculateWeighIn();
        calculateRequiredVolume();
    }

    function calculateWeighIn() {
        if (!selectedCompound) return;

        const mw = parseFloat(molecularWeightInput.value);
        let conc = parseFloat(concentrationInput.value);
        const vol = parseFloat(volumeInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(vol)) {
            weighInMassSpan.textContent = '0';
            weighInMassGSpan.textContent = '0';
            return;
        };

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
        if (!selectedCompound) return;

        const mw = parseFloat(molecularWeightInput.value);
        let conc = parseFloat(concentrationInput.value);
        const actualWeighIn = parseFloat(actualWeighInInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(actualWeighIn)) {
            requiredVolumeSpan.textContent = '0';
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
        if (!selectedCompound) {
            calculationOverview.style.display = 'none';
            return;
        }

        const conc = parseFloat(concentrationInput.value);
        const vol = parseFloat(requiredVolumeSpan.textContent) || parseFloat(volumeInput.value);
        const unit = unitLabel.textContent;
        
        if(isNaN(conc) || isNaN(vol)) {
            calculationOverview.style.display = 'none';
            return;
        }

        overviewName.textContent = selectedCompound.abbr_name;
        overviewConcentration.textContent = `${conc.toFixed(2)} ${unit}`;
        
        if (parseFloat(requiredVolumeSpan.textContent) > 0) {
            overviewVolume.textContent = `${parseFloat(requiredVolumeSpan.textContent).toFixed(2)} ml`;
        } else {
             overviewVolume.textContent = `${parseFloat(volumeInput.value).toFixed(2)} ml`;
        }


        calculationOverview.style.display = 'block';
    }

    unitToggle.addEventListener('change', () => {
        const isMgMl = unitToggle.checked;
        unitLabel.textContent = isMgMl ? 'mg/ml' : 'mM';
        
        if(selectedCompound) {
            concentrationInput.value = isMgMl ? selectedCompound.default_conc_mg_ml : selectedCompound.default_conc_mM;
        }
        calculateWeighIn();
        calculateRequiredVolume();
    });

    toggleStockButton.addEventListener('click', () => {
        const isVisible = stockSolutionsWrapper.style.display === 'block';
        stockSolutionsWrapper.style.display = isVisible ? 'none' : 'block';
    });

    compoundSelect.addEventListener('change', selectCompound);
    concentrationInput.addEventListener('input', () => { calculateWeighIn(); calculateRequiredVolume(); });
    volumeInput.addEventListener('input', () => { calculateWeighIn(); calculateRequiredVolume(); });
    actualWeighInInput.addEventListener('input', calculateRequiredVolume);

    saveStockButton.addEventListener('click', () => {
        if (!selectedCompound) {
            alert('Please select a compound first.');
            return;
        }

        const concentration = parseFloat(concentrationInput.value);
        const weighedIn = parseFloat(actualWeighInInput.value);
        
        if (isNaN(weighedIn) || weighedIn <= 0) {
            alert('Please enter a valid actual weigh-in amount.');
            return;
        }
        
        const volume = parseFloat(requiredVolumeSpan.textContent);


        let concentration_mM = 0;
        let concentration_mg_ml = 0;

        if (unitToggle.checked) { // mg/ml
            concentration_mg_ml = concentration;
            concentration_mM = (concentration / selectedCompound.molecular_weight) * 1000;
        } else { // mM
            concentration_mM = concentration;
            concentration_mg_ml = (concentration / 1000) * selectedCompound.molecular_weight;
        }


        const solution = {
            compound_name: selectedCompound.abbr_name,
            concentration_mM: concentration_mM,
            concentration_mg_ml: concentration_mg_ml,
            volume: volume,
            weighed_in_mg: weighedIn
        };

        fetch('/api/stock-solutions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(solution)
        })
        .then(response => response.json())
        .then(() => {
            fetchStockSolutions();
            alert('Stock solution saved!');
        });
    });

    fetchStockSolutions();
});
