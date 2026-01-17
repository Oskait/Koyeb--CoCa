document.addEventListener('DOMContentLoaded', function() {
    const compoundsTable = document.getElementById('compounds-table').getElementsByTagName('tbody')[0];
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

    let compounds = [];
    let selectedCompound = null;

    // Fetch compounds and populate table
    fetch('/api/compounds')
        .then(response => response.json())
        .then(data => {
            compounds = data;
            compounds.forEach(compound => {
                let row = compoundsTable.insertRow();
                let nameCell = row.insertCell(0);
                let selectCell = row.insertCell(1);
                nameCell.textContent = compound.abbr_name;
                let selectButton = document.createElement('button');
                selectButton.textContent = 'Select';
                selectButton.onclick = () => selectCompound(compound);
                selectCell.appendChild(selectButton);
            });
        });

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

    function selectCompound(compound) {
        selectedCompound = compound;
        molecularWeightInput.value = compound.molecular_weight;
        concentrationInput.value = compound.default_conc_mM;
        volumeInput.value = compound.default_volume;
        unitToggle.checked = false;
        unitLabel.textContent = 'mM';
        calculateWeighIn();
    }

    function calculateWeighIn() {
        if (!selectedCompound) return;

        const mw = parseFloat(molecularWeightInput.value);
        let conc = parseFloat(concentrationInput.value);
        const vol = parseFloat(volumeInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(vol)) return;

        let weighInMg = 0;
        if (unitToggle.checked) { // mg/ml
            weighInMg = conc * vol;
        } else { // mM
            weighInMg = (conc / 1000) * mw * vol;
        }

        weighInMassSpan.textContent = weighInMg.toFixed(2);
        weighInMassGSpan.textContent = (weighInMg / 1000).toFixed(4);
    }

    function calculateRequiredVolume() {
        if (!selectedCompound) return;

        const mw = parseFloat(molecularWeightInput.value);
        let conc = parseFloat(concentrationInput.value);
        const actualWeighIn = parseFloat(actualWeighInInput.value);

        if (isNaN(mw) || isNaN(conc) || isNaN(actualWeighIn)) return;

        let reqVol = 0;
        if (unitToggle.checked) { // mg/ml
            reqVol = actualWeighIn / conc;
        } else { // mM
            reqVol = (actualWeighIn / mw) / (conc / 1000);
        }

        requiredVolumeSpan.textContent = reqVol.toFixed(2);
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

    concentrationInput.addEventListener('input', calculateWeighIn);
    volumeInput.addEventListener('input', calculateWeighIn);
    actualWeighInInput.addEventListener('input', calculateRequiredVolume);

    saveStockButton.addEventListener('click', () => {
        if (!selectedCompound) {
            alert('Please select a compound first.');
            return;
        }

        const concentration = parseFloat(concentrationInput.value);
        const volume = parseFloat(requiredVolumeSpan.textContent);
        const weighedIn = parseFloat(actualWeighInInput.value);
        
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
        });
    });

    fetchStockSolutions();
});
