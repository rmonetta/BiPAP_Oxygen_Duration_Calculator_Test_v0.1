(() => {
  "use strict";

  const TANK_FACTORS = Object.freeze({ D: 0.16, E: 0.28, M: 1.56 });
  const RESERVE_PSI = 300;
  const PLANNING_RR = 20;
  const VT_ML_PER_KG = 8;
  const VT_SAFETY_MULTIPLIER = 1.10;
  const BASE_FLOW_LPM = 3;
  const LOW_LEAK_LPM = 5;
  const HIGH_LEAK_LPM = 20;

  const el = {
    themeToggle: document.getElementById("themeToggle"),
    tankType: document.getElementById("tankType"),
    tankOptions: [...document.querySelectorAll(".tank-option")],
    tankPsi: document.getElementById("tankPsi"),
    heightCm: document.getElementById("heightCm"),
    heightImperial: document.getElementById("heightImperial"),
    fio2: document.getElementById("fio2"),
    transportMinutes: document.getElementById("transportMinutes"),
    resetButton: document.getElementById("resetButton"),
    tankTypeError: document.getElementById("tankTypeError"),
    tankPsiError: document.getElementById("tankPsiError"),
    heightError: document.getElementById("heightError"),
    fio2Error: document.getElementById("fio2Error"),
    transportMinutesError: document.getElementById("transportMinutesError"),
    calculationStatus: document.getElementById("calculationStatus"),
    oxygenDurationRange: document.getElementById("oxygenDurationRange"),
    durationCard: document.getElementById("durationCard"),
    durationRange: document.getElementById("durationRange"),
    transportAssessment: document.getElementById("transportAssessment"),
    transportBanner: document.getElementById("transportBanner"),
    transportTitle: document.getElementById("transportTitle"),
    transportText: document.getElementById("transportText")
  };

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bipap-o2-theme", theme);
    el.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  const savedTheme = localStorage.getItem("bipap-o2-theme");
  setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  el.themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

  function selectTank(value) {
    el.tankType.value = value;
    el.tankOptions.forEach((button) => {
      const selected = button.dataset.tank === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    calculate();
  }

  el.tankOptions.forEach((button) => button.addEventListener("click", () => selectTank(button.dataset.tank)));

  function numberValue(input) {
    if (input.value.trim() === "") return null;
    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  }

  function clearErrors() {
    [el.tankTypeError, el.tankPsiError, el.heightError, el.fio2Error, el.transportMinutesError]
      .forEach((node) => { node.textContent = ""; });
    [el.tankPsi, el.heightCm, el.fio2, el.transportMinutes]
      .forEach((node) => node.classList.remove("is-invalid"));
  }

  function validate() {
    clearErrors();
    let valid = true;
    const tank = el.tankType.value;
    const psi = numberValue(el.tankPsi);
    const heightCm = numberValue(el.heightCm);
    const fio2 = numberValue(el.fio2);
    const transportMinutes = numberValue(el.transportMinutes);

    if (!TANK_FACTORS[tank]) {
      el.tankTypeError.textContent = "Select an oxygen source.";
      valid = false;
    }
    if (psi === null || psi < 0 || psi > 2200) {
      el.tankPsiError.textContent = "Enter a pressure from 0 to 2200 PSI.";
      el.tankPsi.classList.add("is-invalid");
      valid = false;
    }
    if (heightCm === null || heightCm < 122 || heightCm > 241) {
      el.heightError.textContent = "Please enter a valid adult height.";
      el.heightCm.classList.add("is-invalid");
      valid = false;
    }
    if (fio2 === null || fio2 < 21 || fio2 > 100) {
      el.fio2Error.textContent = "Enter FiO₂ from 21% to 100%.";
      el.fio2.classList.add("is-invalid");
      valid = false;
    }
    if (transportMinutes !== null && (transportMinutes < 1 || transportMinutes > 1440)) {
      el.transportMinutesError.textContent = "Enter 1–1440 minutes, or leave this optional field blank.";
      el.transportMinutes.classList.add("is-invalid");
      valid = false;
    }

    return { valid, tank, psi, heightCm, fio2, transportMinutes };
  }


  function updateHeightConversion() {
    const heightCm = numberValue(el.heightCm);

    if (heightCm === null || heightCm <= 0) {
      el.heightImperial.textContent = "";
      return;
    }

    const totalInches = Math.round(heightCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    el.heightImperial.textContent = `(${feet} ft ${inches} in)`;
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return "—";
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return `${rounded}m`;
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }

  function setDurationStatus(lowerMinutes) {
    let kind;
    if (lowerMinutes >= 60) {
      kind = "good";
    } else if (lowerMinutes >= 30) {
      kind = "caution";
    } else {
      kind = "critical";
    }

    el.durationCard.className = `result-card duration-card range-duration-card ${kind}`;
    el.calculationStatus.textContent = "Updated automatically";
    el.durationRange.textContent = "Estimated O₂ Tank Duration";
  }

  function assessmentIconSvg(kind) {
    if (kind === "good") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
    }
    if (kind === "caution") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v8"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>`;
  }

  function setTransportAssessment(transportMinutes, lowerDuration) {
    if (transportMinutes === null) {
      el.transportAssessment.hidden = true;
      return;
    }

    const reserve = lowerDuration - transportMinutes;
    let kind;
    let title;
    let action;

    if (reserve >= 15) {
      kind = "good";
      title = "Adequate Oxygen Supply";
      action = "The estimated oxygen supply appears adequate for the anticipated transport.";
    } else if (reserve >= 0) {
      kind = "caution";
      title = "Limited Oxygen Reserve";
      action = "Consider changing or supplementing the oxygen source before departure.";
    } else {
      kind = "critical";
      title = "Insufficient Oxygen Supply";
      action = "The anticipated transport exceeds the conservative estimated oxygen duration. Change or supplement the oxygen source before departure.";
    }

    const text = `
      <div class="assessment-metrics assessment-metrics-single">
        <div><span>Anticipated transport time</span><strong>${formatDuration(transportMinutes)}</strong></div>
      </div>
      <p class="assessment-action">${action}</p>`;

    el.transportAssessment.hidden = false;
    el.transportBanner.className = `recommendation transport-decision ${kind}`;
    el.transportBanner.querySelector(".recommendation-icon").innerHTML = assessmentIconSvg(kind);
    el.transportTitle.textContent = title;
    el.transportText.innerHTML = text;
  }

  function resetResults() {
    el.oxygenDurationRange.textContent = "—";
    el.calculationStatus.textContent = "Enter all required values";
    el.durationRange.textContent = "Awaiting values";
    el.durationCard.className = "result-card duration-card range-duration-card neutral";
    el.transportAssessment.hidden = true;
  }

  function calculate() {
    const values = validate();
    if (!values.valid) {
      resetResults();
      return;
    }

    const pbwKg = Math.max(0, 50 + 0.91 * (values.heightCm - 152.4));
    const predictedVtMl = pbwKg * VT_ML_PER_KG;
    const planningVtMl = predictedVtMl * VT_SAFETY_MULTIPLIER;
    const minuteVentilationLpm = (planningVtMl * PLANNING_RR) / 1000;
    const oxygenFraction = (values.fio2 - 20.9) / 79.1;
    const usableLiters = Math.max(0, values.psi - RESERVE_PSI) * TANK_FACTORS[values.tank];

    const lowLeakO2Lpm = (minuteVentilationLpm + BASE_FLOW_LPM + LOW_LEAK_LPM) * oxygenFraction;
    const highLeakO2Lpm = (minuteVentilationLpm + BASE_FLOW_LPM + HIGH_LEAK_LPM) * oxygenFraction;

    const upperDuration = lowLeakO2Lpm > 0 ? usableLiters / lowLeakO2Lpm : Infinity;
    const lowerDuration = highLeakO2Lpm > 0 ? usableLiters / highLeakO2Lpm : Infinity;

    el.oxygenDurationRange.textContent = `${formatDuration(lowerDuration)} – ${formatDuration(upperDuration)}`;
    setDurationStatus(lowerDuration);
    setTransportAssessment(values.transportMinutes, lowerDuration);
  }

  [el.tankPsi, el.heightCm, el.fio2, el.transportMinutes]
    .forEach((input) => input.addEventListener("input", calculate));

  el.heightCm.addEventListener("input", updateHeightConversion);

  el.resetButton.addEventListener("click", () => {
    [el.tankPsi, el.heightCm, el.fio2, el.transportMinutes]
      .forEach((input) => { input.value = ""; });
    updateHeightConversion();
    selectTank("");
    clearErrors();
    resetResults();
    el.tankPsi.focus();
  });

  resetResults();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
