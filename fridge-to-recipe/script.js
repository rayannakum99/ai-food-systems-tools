const dropZone   = document.getElementById('drop-zone');
const dropInner  = document.getElementById('drop-inner');
const fileInput  = document.getElementById('file-input');
const preview    = document.getElementById('preview');
const clearBtn   = document.getElementById('clear-btn');
const analyseBtn = document.getElementById('analyse-btn');
const loading    = document.getElementById('loading');
const results    = document.getElementById('results');

let imageBase64  = null;
let imageMime    = 'image/jpeg';

// ensure hidden on load
loading.style.display  = 'none';
results.style.display  = 'none';

// ── Drag & drop ──────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

dropZone.addEventListener('click', e => {
  if (e.target === dropZone || e.target === dropInner || dropInner.contains(e.target)) {
    if (!imageBase64) fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

document.getElementById('camera-input').addEventListener('change', function() {
  if (this.files[0]) loadImage(this.files[0]);
});

function loadImage(file) {
  imageMime = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    imageBase64 = dataUrl.split(',')[1];
    preview.src = dataUrl;
    preview.style.display = 'block';
    dropInner.style.display = 'none';
    dropZone.classList.add('has-image');
    clearBtn.style.display = 'inline-block';
    analyseBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  imageBase64 = null;
  preview.src = '';
  preview.style.display = 'none';
  dropInner.style.display = 'flex';
  dropZone.classList.remove('has-image');
  clearBtn.style.display = 'none';
  analyseBtn.disabled = true;
  fileInput.value = '';
}

// ── Analyse ──────────────────────────────────────────────
async function analyse() {
  const diet = document.getElementById('diet-input').value.trim();

  analyseBtn.disabled = true;
  loading.style.display = 'flex';
  results.style.display = 'none';

  try {
    const res = await fetch('/api/fridge-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, mimeType: imageMime, diet })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderResults(data);
  } catch (err) {
    alert('Something went wrong: ' + err.message);
  } finally {
    loading.style.display = 'none';
    analyseBtn.disabled = false;
  }
}

// ── Render ───────────────────────────────────────────────
function renderResults(data) {
  const ingList = document.getElementById('ingredients-list');
  ingList.innerHTML = data.ingredients
    .map(i => `<span class="tag">${i}</span>`)
    .join('');

  const recList = document.getElementById('recipes-list');
  recList.innerHTML = data.recipes.map((r, idx) => `
    <div class="recipe-card" id="recipe-${idx}">
      <div class="recipe-header" onclick="toggleRecipe(${idx})">
        <div class="recipe-title-row">
          <span class="recipe-name">${r.name}</span>
          <div class="recipe-meta">
            <span>⏱ ${r.time}</span>
            <span>· ${r.difficulty}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="match-badge">${r.matchScore}% match</span>
          <span class="chevron">▼</span>
        </div>
      </div>
      <div class="recipe-body">
        ${r.missingIngredients.length
          ? `<p class="missing-row">You'll also need: <span>${r.missingIngredients.join(', ')}</span></p>`
          : `<p class="missing-row" style="color:var(--green)">✓ You have everything needed!</p>`
        }
        <ol class="steps-list">
          ${r.steps.map((s, i) => `
            <li>
              <span class="step-num">${i + 1}</span>
              <span>${s}</span>
            </li>
          `).join('')}
        </ol>
      </div>
    </div>
  `).join('');

  results.style.display = 'block';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleRecipe(idx) {
  document.getElementById(`recipe-${idx}`).classList.toggle('open');
}

function reset() {
  clearImage();
  results.style.display = 'none';
  document.getElementById('diet-input').value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
