// ==========================================
// STATE MANAGEMENT & NAVIGATION
// ==========================================
let currentModule = 1;

const moduleTitles = {
  1: "Module 1: Create a Qubit and Measure It",
  2: "Module 2: Encode a Bit into a Photon (Alice)",
  3: "Module 3: Encode Using Different Bases",
  4: "Module 4: Bob Measures Using Random Bases",
  5: "Module 5: Alice & Bob Compare Bases",
  6: "Module 6: Generate the Shared Secret Key",
  7: "Module 7: Add Eve (Eavesdropper)",
  8: "Module 8: Calculate QBER & Security Abort"
};

const moduleDescs = {
  1: "Understand quantum superposition, state collapse, and probabilism.",
  2: "Learn how Alice encodes classical bits into physical photon polarization.",
  3: "See how using two different bases at random provides quantum security.",
  4: "Bob measures incoming photons using a random choice of basis.",
  5: "Alice and Bob publicly compare their bases to sift matching key bits.",
  6: "Assemble the final shared secret key from a batch transmission.",
  7: "Watch how Eve's eavesdropping collapses the quantum state and introduces errors.",
  8: "Calculate the Quantum Bit Error Rate (QBER) to detect Eve and decide to abort."
};

const moduleConcepts = {
  1: "Qubit State Vector",
  2: "Rectilinear Basis (+)",
  3: "Dual Bases (+ and ×)",
  4: "State Collapse",
  5: "Basis Sifting",
  6: "Shared Secret Key",
  7: "No-Cloning Theorem",
  8: "QBER Analysis"
};

function switchModule(moduleNum) {
  currentModule = moduleNum;
  
  // Update sidebar active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if(parseInt(btn.getAttribute('data-module')) === moduleNum) {
      btn.classList.add('active');
    }
  });

  // Update headers
  document.getElementById('header-title').textContent = moduleTitles[moduleNum];
  document.getElementById('header-desc').textContent = moduleDescs[moduleNum];
  document.getElementById('header-concept').textContent = moduleConcepts[moduleNum];
  document.getElementById('progress-indicator').textContent = `Module ${moduleNum} of 8`;

  // Toggle module card visibility
  document.querySelectorAll('.module-card').forEach(card => {
    card.classList.remove('active');
  });
  document.getElementById(`module-${moduleNum}`).classList.add('active');

  // Disable/enable footer nav buttons
  document.getElementById('btn-prev').disabled = (moduleNum === 1);
  document.getElementById('btn-next').disabled = (moduleNum === 8);

  // Trigger module-specific initializations
  initModule(moduleNum);
}

function navigateModule(direction) {
  let target = currentModule + direction;
  if(target >= 1 && target <= 8) {
    switchModule(target);
  }
}

function initModule(num) {
  // Stop existing animations/intervals
  stopAllAnimations();

  if (num === 1) {
    m1Render();
  } else if (num === 2) {
    m2Init();
  } else if (num === 3) {
    m3Init();
  } else if (num === 4) {
    m4Init();
  } else if (num === 5) {
    m5Init();
  } else if (num === 6) {
    m6Init();
  } else if (num === 7) {
    m7Init();
  } else if (num === 8) {
    m8Init();
  }
}

// Global animation reference container
let activeAnimationFrames = {};
let activeIntervals = [];

function stopAllAnimations() {
  // Cancel standard animation frames
  for (let key in activeAnimationFrames) {
    if (activeAnimationFrames[key]) {
      cancelAnimationFrame(activeAnimationFrames[key]);
      activeAnimationFrames[key] = null;
    }
  }
  // Clear intervals
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];
}


// ============================================================================
// BACKEND API SERVICE & FALLBACKS
// ============================================================================
const BACKEND_URL = "http://localhost:5001";

async function m1SimulateBackend(measure) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/m1/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gates: m1State.gates, measure: measure })
    });
    const data = await res.json();
    m1State.alpha = data.alpha;
    m1State.beta = data.beta;
    m1State.measured = data.measured;
    m1State.measuredValue = data.measuredValue;
    m1Render();
  } catch (e) {
    console.warn("Backend offline. Falling back to local JS simulation.", e);
    m1SimulateLocal(measure);
  }
}

function m1SimulateLocal(measure) {
  // Re-compute states locally as fallback
  let alpha = { r: 1.0, i: 0.0 };
  let beta = { r: 0.0, i: 0.0 };
  
  m1State.gates.forEach(gate => {
    if (gate === 'X') {
      let temp = { ...alpha };
      alpha = { ...beta };
      beta = temp;
    } else if (gate === 'H') {
      const factor = 1 / Math.sqrt(2);
      let ar = (alpha.r + beta.r) * factor;
      let ai = (alpha.i + beta.i) * factor;
      let br = (alpha.r - beta.r) * factor;
      let bi = (alpha.i - beta.i) * factor;
      alpha = { r: ar, i: ai };
      beta = { r: br, i: bi };
    }
  });

  m1State.alpha = alpha;
  m1State.beta = beta;

  if (measure) {
    const prob0 = alpha.r ** 2 + alpha.i ** 2;
    if (Math.random() < prob0) {
      m1State.alpha = { r: 1.0, i: 0.0 };
      m1State.beta = { r: 0.0, i: 0.0 };
      m1State.measuredValue = 0;
    } else {
      m1State.alpha = { r: 0.0, i: 0.0 };
      m1State.beta = { r: 1.0, i: 0.0 };
      m1State.measuredValue = 1;
    }
    m1State.measured = true;
  }
  m1Render();
}

async function transmitBackend(aliceBit, aliceBasis, bobBasis, eveActive, eveBasis) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/transmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alice_bit: aliceBit,
        alice_basis: aliceBasis,
        bob_basis: bobBasis,
        eve_active: eveActive,
        eve_basis: eveBasis
      })
    });
    return await res.json();
  } catch (e) {
    console.warn("Backend offline. Falling back to local polarization wave transmission math.", e);
    // Local fallback logic
    let activeAliceAngle = (aliceBasis === '+') ? (aliceBit === 0 ? 0 : 90) : (aliceBit === 0 ? 45 : 135);
    let eveBit = null;
    let eveAngle = null;
    
    if (eveActive) {
      eveBit = (aliceBasis === eveBasis) ? aliceBit : (Math.random() < 0.5 ? 0 : 1);
      eveAngle = (eveBasis === '+') ? (eveBit === 0 ? 0 : 90) : (eveBit === 0 ? 45 : 135);
    }
    
    let bobBit = null;
    if (eveActive) {
      bobBit = (eveBasis === bobBasis) ? eveBit : (Math.random() < 0.5 ? 0 : 1);
    } else {
      bobBit = (aliceBasis === bobBasis) ? aliceBit : (Math.random() < 0.5 ? 0 : 1);
    }
    let bobAngle = (bobBasis === '+') ? (bobBit === 0 ? 0 : 90) : (bobBit === 0 ? 45 : 135);
    
    return {
      alice_bit: aliceBit,
      alice_basis: aliceBasis,
      alice_angle: activeAliceAngle,
      eve_active: eveActive,
      eve_basis: eveBasis,
      eve_bit: eveBit,
      eve_angle: eveAngle,
      bob_basis: bobBasis,
      bob_bit: bobBit,
      bob_angle: bobAngle
    };
  }
}

async function runProtocolBackend(evePresent, count) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/protocol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eve_present: evePresent, count: count })
    });
    return await res.json();
  } catch (e) {
    console.warn("Backend offline. Falling back to local BB84 key generator.", e);
    // Local fallback logic
    let results = [];
    for (let i = 0; i < count; i++) {
      let ab = Math.random() < 0.5 ? 0 : 1;
      let abasis = Math.random() < 0.5 ? '+' : 'x';
      let bbasis = Math.random() < 0.5 ? '+' : 'x';
      let ebasis = Math.random() < 0.5 ? '+' : 'x';
      
      let ebit = null;
      if (evePresent) {
        ebit = (abasis === ebasis) ? ab : (Math.random() < 0.5 ? 0 : 1);
      }
      
      let bb = null;
      if (evePresent) {
        bb = (ebasis === bbasis) ? ebit : (Math.random() < 0.5 ? 0 : 1);
      } else {
        bb = (abasis === bbasis) ? ab : (Math.random() < 0.5 ? 0 : 1);
      }
      
      let matched = (abasis === bbasis);
      let sifted = matched ? bb : null;
      let is_error = matched && (ab !== bb);
      
      results.push({
        alice_bit: ab,
        alice_basis: abasis,
        bob_basis: bbasis,
        bob_bit: bb,
        eve_basis: evePresent ? ebasis : null,
        eve_bit: ebit,
        matched: matched,
        sifted_bit: sifted,
        is_error: is_error
      });
    }
    return results;
  }
}


// ============================================================================
// MODULE 1: QUBIT & MEASUREMENT
// ============================================================================
let m1State = {
  alpha: { r: 1.0, i: 0.0 },
  beta: { r: 0.0, i: 0.0 },
  gates: [],
  measured: false,
  measuredValue: null
};

function m1Reset() {
  m1State.alpha = { r: 1.0, i: 0.0 };
  m1State.beta = { r: 0.0, i: 0.0 };
  m1State.gates = [];
  m1State.measured = false;
  m1State.measuredValue = null;
  m1Render();
}

async function m1ApplyGate(gateType) {
  if (m1State.measured) {
    m1State.alpha = { r: 1.0, i: 0.0 };
    m1State.beta = { r: 0.0, i: 0.0 };
    m1State.gates = [];
    m1State.measured = false;
    m1State.measuredValue = null;
  }
  
  m1State.gates.push(gateType);
  await m1SimulateBackend(false);
}

async function m1Measure() {
  if (m1State.measured) return;
  await m1SimulateBackend(true);
}

function m1Render() {
  m1DrawCircuit();
  m1DrawBlochSphere();
  m1UpdateProbabilityBar();
}

function m1DrawCircuit() {
  const canvas = document.getElementById('circuit-canvas-1');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = 40;
  const endX = canvas.width - 60;
  const centerY = canvas.height / 2;

  // Draw wire line
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, centerY);
  ctx.lineTo(endX, centerY);
  ctx.stroke();

  // Draw qubit input label
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 14px Inter';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('|0⟩', startX - 10, centerY);

  // Draw gates
  let currentX = startX + 40;
  m1State.gates.forEach((gate, idx) => {
    ctx.fillStyle = '#0f1422';
    ctx.strokeStyle = gate === 'X' ? '#f000ff' : '#00f0ff';
    ctx.lineWidth = 2;
    
    // Draw gate box
    ctx.beginPath();
    ctx.roundRect(currentX - 16, centerY - 16, 32, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Draw gate text
    ctx.fillStyle = gate === 'X' ? '#f000ff' : '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gate, currentX, centerY);
    
    ctx.shadowBlur = 0; // Reset shadow
    currentX += 50;
  });

  // Draw measurement symbol if measured
  if (m1State.measured) {
    ctx.strokeStyle = '#00ff66';
    ctx.fillStyle = '#0f1422';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';

    ctx.beginPath();
    ctx.roundRect(currentX - 16, centerY - 16, 32, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Draw meter arch
    ctx.beginPath();
    ctx.arc(currentX, centerY + 6, 10, Math.PI, 0);
    ctx.stroke();

    // Draw arrow
    ctx.beginPath();
    ctx.moveTo(currentX, centerY + 6);
    if (m1State.measuredValue === 0) {
      ctx.lineTo(currentX - 7, centerY - 4);
    } else {
      ctx.lineTo(currentX + 7, centerY - 4);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`=  ${m1State.measuredValue}`, currentX + 26, centerY);
  }
}

function m1DrawBlochSphere() {
  const canvas = document.getElementById('bloch-canvas-1');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const R = 80;

  const thetaView = 18 * Math.PI / 180;
  const phiView = -35 * Math.PI / 180;

  function project(x, y, z) {
    let x1 = x * Math.cos(phiView) - y * Math.sin(phiView);
    let y1 = x * Math.sin(phiView) + y * Math.cos(phiView);
    let z1 = z;
    
    let x2 = x1;
    let y2 = y1 * Math.cos(thetaView) - z1 * Math.sin(thetaView);
    
    return {
      x: cx + x2 * R,
      y: cy - y2 * R
    };
  }

  // Draw boundary
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();

  // Draw Equator
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * Math.sin(thetaView), 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Draw Meridian
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * Math.cos(thetaView), R, Math.PI/2, 0, 2 * Math.PI);
  ctx.stroke();

  // Project Axes
  const axisZ_pos = project(0, 0, 1);
  const axisZ_neg = project(0, 0, -1);
  const axisX_pos = project(1, 0, 0);
  const axisX_neg = project(-1, 0, 0);
  const axisY_pos = project(0, 1, 0);
  const axisY_neg = project(0, -1, 0);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  
  // Z-Axis
  ctx.beginPath();
  ctx.moveTo(axisZ_neg.x, axisZ_neg.y);
  ctx.lineTo(axisZ_pos.x, axisZ_pos.y);
  ctx.stroke();

  // X-Axis
  ctx.beginPath();
  ctx.moveTo(axisX_neg.x, axisX_neg.y);
  ctx.lineTo(axisX_pos.x, axisX_pos.y);
  ctx.stroke();

  // Y-Axis
  ctx.beginPath();
  ctx.moveTo(axisY_neg.x, axisY_neg.y);
  ctx.lineTo(axisY_pos.x, axisY_pos.y);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('+z (|0⟩)', axisZ_pos.x - 22, axisZ_pos.y - 6);
  ctx.fillText('-z (|1⟩)', axisZ_neg.x - 22, axisZ_neg.y + 12);
  ctx.fillText('+x (|+⟩)', axisX_pos.x + 4, axisX_pos.y + 4);
  ctx.fillText('+y (|i⟩)', axisY_pos.x + 4, axisY_pos.y + 4);

  // State Vector Coordinates
  const ar = m1State.alpha.r;
  const ai = m1State.alpha.i;
  const br = m1State.beta.r;
  const bi = m1State.beta.i;

  const sx = 2 * (ar * br + ai * bi);
  const sy = 2 * (ar * bi - ai * br);
  const sz = (ar ** 2 + ai ** 2) - (br ** 2 + bi ** 2);

  const tip = project(sx, sy, sz);

  // Line
  ctx.strokeStyle = m1State.measured ? '#00ff66' : '#00f0ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  // Tip dot
  ctx.fillStyle = m1State.measured ? '#00ff66' : '#00f0ff';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text readings
  let text = `|ψ⟩ = ${sx.toFixed(2)}|0⟩ + ${sy.toFixed(2)}|1⟩`;
  if (m1State.measured) {
    text = `MEASURED COLLAPSE: |${m1State.measuredValue}⟩`;
    document.getElementById('bloch-reading-1').style.color = '#00ff66';
  } else {
    const prob0 = ((ar**2 + ai**2)*100).toFixed(0);
    const prob1 = ((br**2 + bi**2)*100).toFixed(0);
    text = `State: ${prob0}% |0⟩ + ${prob1}% |1⟩`;
    document.getElementById('bloch-reading-1').style.color = 'var(--text-secondary)';
  }
  document.getElementById('bloch-reading-1').textContent = text;
}

function m1UpdateProbabilityBar() {
  const prob0 = m1State.alpha.r ** 2 + m1State.alpha.i ** 2;
  const prob1 = m1State.beta.r ** 2 + m1State.beta.i ** 2;

  document.getElementById('prob-0-fill').style.width = `${prob0 * 100}%`;
  document.getElementById('prob-0-val').textContent = `${Math.round(prob0 * 100)}%`;

  document.getElementById('prob-1-fill').style.width = `${prob1 * 100}%`;
  document.getElementById('prob-1-val').textContent = `${Math.round(prob1 * 100)}%`;
}


// ============================================================================
// MODULE 2 & 3: PHOTON ENCODING
// ============================================================================
let m2State = {
  bit: 0,
  firing: false,
  time: 0,
  polarizationAngle: 0
};

let m3State = {
  bit: 0,
  basis: '+',
  firing: false,
  time: 0,
  polarizationAngle: 0
};

function m2Init() {
  m2State.bit = 0;
  m2State.firing = false;
  m2State.time = 0;
  m2State.polarizationAngle = 0;
  m2UpdateCards();
  m2DrawWaveframe();
}

function m2SelectBit(val) {
  m2State.bit = val;
  m2State.polarizationAngle = val === 0 ? 0 : 90;
  m2UpdateCards();
  m2DrawWaveframe();
  document.getElementById('m2-status').textContent = `Photon state: ${val === 0 ? 'Horizontal (Bit 0)' : 'Vertical (Bit 1)'}`;
}

function m2UpdateCards() {
  document.getElementById('m2-bit-0').classList.toggle('active-cyan', m2State.bit === 0);
  document.getElementById('m2-bit-1').classList.toggle('active-cyan', m2State.bit === 1);
}

async function m2FireLaser() {
  if (m2State.firing) return;
  m2State.firing = true;
  m2State.time = 0;

  // Retrieve polarization angle from Qiskit
  const qiskitData = await transmitBackend(m2State.bit, '+', '+', false, '+');
  m2State.polarizationAngle = qiskitData.alice_angle;
  
  function animate() {
    m2State.time += 0.15;
    m2DrawWaveframe();
    if (m2State.time < 50) {
      activeAnimationFrames['m2'] = requestAnimationFrame(animate);
    } else {
      m2State.firing = false;
    }
  }
  animate();
}

function drawPolarizedWave(canvas, angleDegrees, time, showEveCollapse = false, eveAngle = 0, showBobCollapse = false, bobAngle = 0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = 40;
  const endX = canvas.width - 40;
  const centerY = canvas.height / 2;
  const angleRad = angleDegrees * Math.PI / 180;

  // Optical line
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(startX, centerY);
  ctx.lineTo(endX, centerY);
  ctx.stroke();

  // Tube lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, centerY - 25);
  ctx.lineTo(endX, centerY - 25);
  ctx.moveTo(startX, centerY + 25);
  ctx.lineTo(endX, centerY + 25);
  ctx.stroke();

  // Emitters
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = 'var(--color-cyan)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(startX, centerY, 15, 0, 2*Math.PI);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = 'var(--color-cyan)';
  ctx.font = 'bold 9px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALICE', startX, centerY);

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = showBobCollapse ? 'var(--color-green)' : 'var(--color-magenta)';
  ctx.beginPath();
  ctx.arc(endX, centerY, 15, 0, 2*Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = showBobCollapse ? 'var(--color-green)' : 'var(--color-magenta)';
  ctx.fillText('BOB', endX, centerY);

  let midX = (startX + endX) / 2;
  if (showEveCollapse) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'var(--color-red)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(midX, centerY, 15, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'var(--color-red)';
    ctx.fillText('EVE', midX, centerY);
  }

  // Draw polarized wave elements
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let first = true;

  for (let x = startX + 15; x < endX - 15; x += 2) {
    let currentAngle = angleRad;
    let waveAmplitude = 18;
    
    if (showEveCollapse && x > midX) {
      currentAngle = eveAngle * Math.PI / 180;
      ctx.strokeStyle = 'var(--color-red)';
      ctx.shadowColor = 'var(--color-red)';
    } else {
      ctx.strokeStyle = 'var(--color-cyan)';
      ctx.shadowColor = 'var(--color-cyan)';
    }

    if (showBobCollapse && x > endX - 45) {
      currentAngle = bobAngle * Math.PI / 180;
      ctx.strokeStyle = 'var(--color-green)';
      ctx.shadowColor = 'var(--color-green)';
    }

    let sineVal = Math.sin((x - startX) * 0.09 - time);
    let dy = sineVal * waveAmplitude * Math.cos(currentAngle);
    let dx = sineVal * waveAmplitude * 0.5 * Math.sin(currentAngle);
    
    let py = centerY - dy;
    let px = x + dx;

    if (first) {
      ctx.moveTo(px, py);
      first = false;
    } else {
      ctx.lineTo(px, py);
    }

    if (showEveCollapse && Math.abs(x - midX) < 2) {
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py);
    }
  }
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function m2DrawWaveframe() {
  const canvas = document.getElementById('photon-canvas-2');
  if (!canvas) return;
  drawPolarizedWave(canvas, m2State.polarizationAngle, m2State.time);
}

// Module 3
function m3Init() {
  m3State.bit = 0;
  m3State.basis = '+';
  m3State.firing = false;
  m3State.time = 0;
  m3State.polarizationAngle = 0;
  m3UpdateCards();
  m3DrawWaveframe();
}

function m3SelectBit(val) {
  m3State.bit = val;
  m3State.polarizationAngle = m3State.basis === '+' ? (val === 0 ? 0 : 90) : (val === 0 ? 45 : 135);
  m3UpdateCards();
  m3DrawWaveframe();
  m3UpdateStatus();
}

function m3SelectBasis(basis) {
  m3State.basis = basis;
  m3State.polarizationAngle = basis === '+' ? (m3State.bit === 0 ? 0 : 90) : (m3State.bit === 0 ? 45 : 135);
  m3UpdateCards();
  m3DrawWaveframe();
  m3UpdateStatus();
}

function m3UpdateCards() {
  document.getElementById('m3-bit-0').classList.toggle('active-cyan', m3State.bit === 0);
  document.getElementById('m3-bit-1').classList.toggle('active-cyan', m3State.bit === 1);
  document.getElementById('m3-basis-rect').classList.toggle('active-cyan', m3State.basis === '+');
  document.getElementById('m3-basis-diag').classList.toggle('active-cyan', m3State.basis === 'x');
}

function m3UpdateStatus() {
  let angleStr = "";
  if (m3State.basis === '+') {
    angleStr = m3State.bit === 0 ? "0° horizontal" : "90° vertical";
  } else {
    angleStr = m3State.bit === 0 ? "45° diagonal-right" : "135° diagonal-left";
  }
  document.getElementById('m3-status').textContent = `Alice encodes Bit ${m3State.bit} in ${m3State.basis} basis (${angleStr})`;
}

async function m3FireLaser() {
  if (m3State.firing) return;
  m3State.firing = true;
  m3State.time = 0;

  // Retrieve polarization angle from Qiskit
  const qiskitData = await transmitBackend(m3State.bit, m3State.basis, '+', false, '+');
  m3State.polarizationAngle = qiskitData.alice_angle;
  
  function animate() {
    m3State.time += 0.15;
    m3DrawWaveframe();
    if (m3State.time < 50) {
      activeAnimationFrames['m3'] = requestAnimationFrame(animate);
    } else {
      m3State.firing = false;
    }
  }
  animate();
}

function m3DrawWaveframe() {
  const canvas = document.getElementById('photon-canvas-3');
  if (!canvas) return;
  drawPolarizedWave(canvas, m3State.polarizationAngle, m3State.time);
}


// ============================================================================
// MODULE 4: BOB'S MEASUREMENT
// ============================================================================
let m4State = {
  aliceBit: 0,
  aliceBasis: '+',
  bobBasis: '+',
  firing: false,
  time: 0,
  measured: false,
  measuredBit: null,
  qiskitData: null
};

function m4Init() {
  m4State.measured = false;
  m4State.measuredBit = null;
  m4State.firing = false;
  m4State.time = 0;
  m4State.qiskitData = null;
  m4RandomizeAlice();
  m4UpdateCards();
}

function m4RandomizeAlice() {
  m4State.aliceBit = Math.random() < 0.5 ? 0 : 1;
  m4State.aliceBasis = Math.random() < 0.5 ? '+' : 'x';
  m4State.measured = false;
  m4State.measuredBit = null;
  m4State.time = 0;
  m4State.firing = false;
  m4State.qiskitData = null;
  
  document.getElementById('m4-alice-bit-val').textContent = m4State.aliceBit;
  document.getElementById('m4-alice-basis-val').textContent = m4State.aliceBasis;
  
  let angle = m4State.aliceBasis === '+' ? (m4State.aliceBit === 0 ? 0 : 90) : (m4State.aliceBit === 0 ? 45 : 135);
  document.getElementById('m4-alice-pol-val').textContent = `${angle}° (${angle === 0 ? 'Horizontal' : angle === 90 ? 'Vertical' : angle === 45 ? 'Diagonal' : 'Diagonal-left'})`;
  document.getElementById('m4-status').textContent = "New photon sent. Select your basis and click Measure!";
  document.getElementById('m4-measure-btn').disabled = false;

  m4DrawWaveframe();
}

function m4SelectBobBasis(basis) {
  if (m4State.measured) return;
  m4State.bobBasis = basis;
  m4UpdateCards();
}

function m4UpdateCards() {
  document.getElementById('m4-basis-rect').classList.toggle('active-cyan', m4State.bobBasis === '+');
  document.getElementById('m4-basis-diag').classList.toggle('active-cyan', m4State.bobBasis === 'x');
}

async function m4MeasurePhoton() {
  if (m4State.firing || m4State.measured) return;
  m4State.firing = true;
  m4State.time = 0;
  document.getElementById('m4-measure-btn').disabled = true;

  // Run the single photon measurement on Qiskit backend
  m4State.qiskitData = await transmitBackend(
    m4State.aliceBit, 
    m4State.aliceBasis, 
    m4State.bobBasis, 
    false, 
    '+'
  );
  m4State.measuredBit = m4State.qiskitData.bob_bit;

  function animate() {
    m4State.time += 0.15;
    m4DrawWaveframe();
    if (m4State.time < 50) {
      activeAnimationFrames['m4'] = requestAnimationFrame(animate);
    } else {
      m4State.firing = false;
      m4State.measured = true;
      m4ShowResult();
    }
  }
  animate();
}

function m4DrawWaveframe() {
  const canvas = document.getElementById('photon-canvas-4');
  if (!canvas) return;

  let aliceAngle = m4State.aliceBasis === '+' ? (m4State.aliceBit === 0 ? 0 : 90) : (m4State.aliceBit === 0 ? 45 : 135);
  let showBobCollapse = m4State.time > 25;
  let bobAngle = m4State.qiskitData ? m4State.qiskitData.bob_angle : (m4State.bobBasis === '+' ? 0 : 45);

  drawPolarizedWave(canvas, aliceAngle, m4State.time, false, 0, showBobCollapse, bobAngle);
}

function m4ShowResult() {
  const match = (m4State.aliceBasis === m4State.bobBasis);
  let html = "";
  if (match) {
    html = `Qiskit measured: Bases matched (<span style="color:var(--color-cyan); font-weight:700;">${m4State.aliceBasis}</span>). Measured Bit: <span style="color:var(--color-green); font-weight:bold;">${m4State.measuredBit}</span> (100% Secure)`;
  } else {
    html = `Qiskit measured: Mismatched bases (Alice: <span style="color:var(--color-cyan);">${m4State.aliceBasis}</span>, Bob: <span style="color:var(--color-magenta);">${m4State.bobBasis}</span>). Measured Bit collapsed to random: <span style="color:var(--color-amber); font-weight:bold;">${m4State.measuredBit}</span> (50% probability)`;
  }
  document.getElementById('m4-status').innerHTML = html;
}


// ============================================================================
// MODULE 5: BASIS SIFTING
// ============================================================================
let m5Data = [];

async function m5Init() {
  await m5RegenerateData();
}

async function m5RegenerateData() {
  m5Data = [];
  
  // Call Qiskit API for 10 BB84 photon sifting runs
  const batch = await runProtocolBackend(false, 10);
  m5Data = batch.map(t => ({
    aliceBasis: t.alice_basis,
    bobBasis: t.bob_basis,
    aliceBit: t.alice_bit,
    bobBit: t.bob_bit,
    sifted: null
  }));
  
  m5RenderTable();
}

function m5RenderTable() {
  const table = document.getElementById('sifting-table-5');
  if (!table) return;

  const rowIdx = document.getElementById('s5-row-idx');
  const rowAliceBasis = document.getElementById('s5-row-alice-basis');
  const rowBobBasis = document.getElementById('s5-row-bob-basis');
  const rowAction = document.getElementById('s5-row-action');
  const rowSifted = document.getElementById('s5-row-sifted');

  rowIdx.innerHTML = '<th>Photon Index</th>';
  rowAliceBasis.innerHTML = '<td class="stream-label">Alice\'s Basis</td>';
  rowBobBasis.innerHTML = '<td class="stream-label">Bob\'s Basis</td>';
  rowAction.innerHTML = '<td class="stream-label">Action</td>';
  rowSifted.innerHTML = '<td class="stream-label">Sifted Key Bit</td>';

  m5Data.forEach((d, idx) => {
    rowIdx.innerHTML += `<th>#${idx + 1}</th>`;

    let aClass = d.aliceBasis === '+' ? 'plus' : 'cross';
    rowAliceBasis.innerHTML += `<td><span class="badge-basis ${aClass}">${d.aliceBasis}</span></td>`;

    let bClass = d.bobBasis === '+' ? 'plus' : 'cross';
    rowBobBasis.innerHTML += `<td><span class="badge-basis ${bClass}">${d.bobBasis}</span></td>`;

    if (d.sifted === null) {
      rowAction.innerHTML += `<td><button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="m5Sift(${idx})">Sift</button></td>`;
      rowSifted.innerHTML += `<td><span style="color:var(--text-muted);">-</span></td>`;
    } else if (d.sifted === 'keep') {
      rowAction.innerHTML += `<td><span class="badge-status match">Keep</span></td>`;
      rowSifted.innerHTML += `<td style="color:var(--color-green);">${d.bobBit}</td>`;
    } else {
      rowAction.innerHTML += `<td><span class="badge-status mismatch" style="opacity: 0.5;">Discard</span></td>`;
      rowSifted.innerHTML += `<td><span class="bit-block discarded" style="width:20px; height:20px; display:inline-flex; font-size:0.8rem; margin:0 auto;">${d.bobBit}</span></td>`;
    }
  });
}

function m5Sift(idx) {
  let d = m5Data[idx];
  d.sifted = (d.aliceBasis === d.bobBasis) ? 'keep' : 'discard';
  m5RenderTable();
}

function m5AutoSift() {
  m5Data.forEach((d, idx) => {
    if (d.sifted === null) {
      m5Sift(idx);
    }
  });
}


// ============================================================================
// MODULE 6: SHARED KEY GENERATION
// ============================================================================
let m6State = {
  running: false
};

function m6Init() {
  document.getElementById('m6-key-streams').style.display = 'none';
  document.getElementById('m6-stats-panel').style.display = 'none';
}

async function m6StartSimulation() {
  if (m6State.running) return;
  m6State.running = true;

  const container = document.getElementById('m6-key-streams');
  const statsPanel = document.getElementById('m6-stats-panel');
  container.style.display = 'flex';
  statsPanel.style.display = 'block';

  const aliceBitsEl = document.getElementById('m6-alice-bits');
  const aliceBasesEl = document.getElementById('m6-alice-bases');
  const bobBasesEl = document.getElementById('m6-bob-bases');
  const bobBitsEl = document.getElementById('m6-bob-bits');
  const sharedKeyEl = document.getElementById('m6-shared-key');

  aliceBitsEl.innerHTML = '';
  aliceBasesEl.innerHTML = '';
  bobBasesEl.innerHTML = '';
  bobBitsEl.innerHTML = '';
  sharedKeyEl.innerHTML = '';

  let matchingCount = 0;

  // Run 20 Qiskit simulation transmissions
  const transmission = await runProtocolBackend(false, 20);

  let step = 0;
  let interval = setInterval(() => {
    let t = transmission[step];
    
    aliceBitsEl.innerHTML += `<div class="bit-block active">${t.alice_bit}</div>`;
    aliceBasesEl.innerHTML += `<div class="bit-block reveal-alice" style="font-size:0.85rem">${t.alice_basis}</div>`;
    
    bobBasesEl.innerHTML += `<div class="bit-block reveal-bob" style="font-size:0.85rem">${t.bob_basis}</div>`;
    bobBitsEl.innerHTML += `<div class="bit-block active">${t.bob_bit}</div>`;

    step++;
    if (step >= 20) {
      clearInterval(interval);
      
      setTimeout(() => {
        const aliceBitBlocks = aliceBitsEl.children;
        const bobBitBlocks = bobBitsEl.children;
        const aliceBaseBlocks = aliceBasesEl.children;
        const bobBaseBlocks = bobBasesEl.children;
        
        for (let i = 0; i < 20; i++) {
          let t = transmission[i];
          if (t.matched) {
            aliceBitBlocks[i].className = 'bit-block matched';
            bobBitBlocks[i].className = 'bit-block matched';
            aliceBaseBlocks[i].className = 'bit-block matched';
            bobBaseBlocks[i].className = 'bit-block matched';
            sharedKeyEl.innerHTML += `<div class="bit-block matched">${t.bob_bit}</div>`;
            matchingCount++;
          } else {
            aliceBitBlocks[i].className = 'bit-block discarded';
            bobBitBlocks[i].className = 'bit-block discarded';
            aliceBaseBlocks[i].className = 'bit-block discarded';
            bobBaseBlocks[i].className = 'bit-block discarded';
          }
        }
        
        document.getElementById('m6-stat-matched').textContent = `${matchingCount} / 20`;
        document.getElementById('m6-stat-key-len').textContent = `${matchingCount} bits`;
        m6State.running = false;
      }, 800);
    }
  }, 100);

  activeIntervals.push(interval);
}


// ============================================================================
// MODULE 7: ADD EVE (EAVESDROPPER)
// ============================================================================
let m7State = {
  eveActive: false,
  bit: 0,
  basis: '+',
  firing: false,
  time: 0,
  eveBasis: '+',
  bobBasis: '+',
  qiskitData: null
};

function m7Init() {
  m7State.eveActive = document.getElementById('m7-eve-toggle').checked;
  m7State.firing = false;
  m7State.time = 0;
  m7State.bit = 0;
  m7State.basis = '+';
  m7State.eveBasis = '+';
  m7State.bobBasis = '+';
  m7State.qiskitData = null;
  m7DrawWaveframe();
  document.getElementById('m7-status').innerHTML = "Toggle Eve's status and trigger the photon path!";
}

function m7ToggleEve() {
  m7State.eveActive = document.getElementById('m7-eve-toggle').checked;
  m7DrawWaveframe();
  if (m7State.eveActive) {
    document.getElementById('m7-status').innerHTML = "⚠️ Eve is now waiting on the transmission line.";
  } else {
    document.getElementById('m7-status').innerHTML = "Eve is deactivated. The channel is clear.";
  }
}

async function m7FireLaser() {
  if (m7State.firing) return;
  m7State.firing = true;
  m7State.time = 0;

  // Set Alice bit, basis and Eve, Bob parameters
  const tempBit = Math.random() < 0.5 ? 0 : 1;
  const tempBasis = Math.random() < 0.5 ? '+' : 'x';
  const tempEveBasis = Math.random() < 0.5 ? '+' : 'x';
  const tempBobBasis = Math.random() < 0.5 ? '+' : 'x';

  m7State.bit = tempBit;
  m7State.basis = tempBasis;
  m7State.eveBasis = tempEveBasis;
  m7State.bobBasis = tempBobBasis;

  // Run the full eavesdropping transaction in Qiskit
  m7State.qiskitData = await transmitBackend(
    tempBit, 
    tempBasis, 
    tempBobBasis, 
    m7State.eveActive, 
    tempEveBasis
  );

  function animate() {
    m7State.time += 0.18;
    m7DrawWaveframe();
    if (m7State.time < 50) {
      activeAnimationFrames['m7'] = requestAnimationFrame(animate);
    } else {
      m7State.firing = false;
      m7ShowReport();
    }
  }
  animate();
}

function m7DrawWaveframe() {
  const canvas = document.getElementById('photon-canvas-7');
  if (!canvas) return;

  let aliceAngle = m7State.basis === '+' ? (m7State.bit === 0 ? 0 : 90) : (m7State.bit === 0 ? 45 : 135);
  let showEveCollapse = m7State.eveActive && m7State.time > 20;
  let showBobCollapse = m7State.time > 38;

  let eveAngle = m7State.qiskitData ? m7State.qiskitData.eve_angle : (m7State.eveBasis === '+' ? 0 : 45);
  let bobAngle = m7State.qiskitData ? m7State.qiskitData.bob_angle : (m7State.bobBasis === '+' ? 0 : 45);

  drawPolarizedWave(canvas, aliceAngle, m7State.time, showEveCollapse, eveAngle, showBobCollapse, bobAngle);
}

function m7ShowReport() {
  const q = m7State.qiskitData;
  if (!q) return;

  let baseReport = `Alice sent: Bit <strong>${q.alice_bit}</strong> using <strong>${q.alice_basis}</strong> basis (${q.alice_angle}°).<br>`;
  
  if (q.eve_active) {
    let eveStatusHtml = "";
    if (q.eve_basis === q.alice_basis) {
      eveStatusHtml = `<span style="color:var(--color-green);">Eve correctly guessed bases</span> and measures Bit ${q.eve_bit}. No wave disturbance.`;
    } else {
      eveStatusHtml = `<span style="color:var(--color-red);">Eve guessed WRONG basis (${q.eve_basis})</span>, collapsing wave to ${q.eve_angle}°. Wave is disturbed!`;
    }

    let bobStatusHtml = "";
    if (q.alice_basis === q.bob_basis) {
      if (q.alice_bit === q.bob_bit) {
        bobStatusHtml = `Bob measured in same basis (${q.bob_basis}). By luck, Bob got correct Bit <strong>${q.bob_bit}</strong>.`;
      } else {
        bobStatusHtml = `Bob measured in same basis (${q.bob_basis}). But due to Eve's collapse, Bob got an <strong>ERROR Bit ${q.bob_bit}</strong>!`;
      }
    } else {
      bobStatusHtml = `Bob measured in different basis (${q.bob_basis}), resulting in collapsed Bit <strong>${q.bob_bit}</strong>.`;
    }

    document.getElementById('m7-status').innerHTML = `${baseReport}👁️ ${eveStatusHtml}<br>🏁 ${bobStatusHtml}`;
  } else {
    let success = (q.alice_basis === q.bob_basis);
    let bobReport = success 
      ? `<span style="color:var(--color-green);">Bases matched!</span> Bob successfully measured Bit <strong>${q.bob_bit}</strong>.`
      : `Bases mismatched. Bob measures a random collapsed Bit <strong>${q.bob_bit}</strong>.`;
    
    document.getElementById('m7-status').innerHTML = `${baseReport}🏁 ${bobReport}`;
  }
}


// ============================================================================
// MODULE 8: QBER CALCULATION & SECURITY
// ============================================================================
function m8Init() {
  document.getElementById('m8-key-streams').style.display = 'none';
  document.getElementById('m8-stats-panel').style.display = 'none';
}

async function m8RunProtocol(evePresent) {
  const container = document.getElementById('m8-key-streams');
  const statsPanel = document.getElementById('m8-stats-panel');
  container.style.display = 'flex';
  statsPanel.style.display = 'block';

  const aliceBitsEl = document.getElementById('m8-alice-bits');
  const bobBitsEl = document.getElementById('m8-bob-bits');
  
  aliceBitsEl.innerHTML = '';
  bobBitsEl.innerHTML = '';

  let errors = 0;
  
  // Call Qiskit batch protocol API (QBER calculator)
  const batch = await runProtocolBackend(evePresent, 12);

  // Extract sifted bits to display
  let aliceKey = [];
  let bobKey = [];

  batch.forEach(t => {
    if (t.matched) {
      aliceKey.push(t.alice_bit);
      bobKey.push(t.bob_bit);
      if (t.is_error) {
        errors++;
      }
    }
  });

  // Render sifted comparison
  aliceKey.forEach(bit => {
    aliceBitsEl.innerHTML += `<div class="bit-block reveal-alice">${bit}</div>`;
  });

  bobKey.forEach((bit, idx) => {
    let isError = (bit !== aliceKey[idx]);
    bobBitsEl.innerHTML += `<div class="bit-block ${isError ? 'error' : 'matched'}">${bit}</div>`;
  });

  const totalSifted = aliceKey.length;
  const qber = totalSifted > 0 ? Math.round((errors / totalSifted) * 100) : 0;

  m8UpdateGauge(qber);
  m8UpdateBanner(qber, evePresent);
}

function m8UpdateGauge(qberValue) {
  document.getElementById('m8-gauge-val').textContent = `${qberValue}%`;
  
  const gaugeFill = document.getElementById('m8-gauge-fill');
  const offset = 220 - (220 * (qberValue / 100));
  gaugeFill.style.strokeDashoffset = offset;

  if (qberValue <= 11) {
    gaugeFill.style.stroke = 'var(--color-green)';
  } else if (qberValue <= 20) {
    gaugeFill.style.stroke = 'var(--color-amber)';
  } else {
    gaugeFill.style.stroke = 'var(--color-red)';
  }
}

function m8UpdateBanner(qber, evePresent) {
  const banner = document.getElementById('m8-status-banner');
  const icon = document.getElementById('m8-banner-icon');
  const title = document.getElementById('m8-banner-title');
  const desc = document.getElementById('m8-banner-desc');

  if (qber >= 15) {
    banner.className = "status-banner compromised";
    icon.textContent = "🚨";
    title.textContent = "SECURITY ALERT: ABORT PROTOCOL!";
    desc.textContent = `QBER is ${qber}%, exceeding the security threshold of 11%. Eavesdropper detected! Keys discarded.`;
  } else {
    banner.className = "status-banner secure";
    icon.textContent = "🛡️";
    title.textContent = "PROTOCOL SUCCESSFUL: SECURE KEY GENERATED";
    desc.textContent = `QBER is ${qber}%, well below the threshold of 11%. Channel secure. Shared key is safe to use.`;
  }
}


// ==========================================================
// WINDOW LOAD EVENT
// ==========================================================
window.addEventListener('DOMContentLoaded', () => {
  switchModule(1);
});
