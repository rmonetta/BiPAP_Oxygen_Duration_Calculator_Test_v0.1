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
    heightFeet: document.getElementById("heightFeet"),
    heightInches: document.getElementById("heightInches"),
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
    [el.tankPsi, el.heightFeet, el.heightInches, el.fio2, el.transportMinutes]
      .forEach((node) => node.classList.remove("is-invalid"));
  }

  function validate() {
    clearErrors();
    let valid = true;
    const tank = el.tankType.value;
    const psi = numberValue(el.tankPsi);
    const feet = numberValue(el.heightFeet);
    const inches = numberValue(el.heightInches);
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
    if (feet === null || feet < 4 || feet > 7 || inches === null || inches < 0 || inches > 11) {
      el.heightError.textContent = "Enter height using 4–7 feet and 0–11 inches.";
      el.heightFeet.classList.add("is-invalid");
      el.heightInches.classList.add("is-invalid");
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

    return { valid, tank, psi, feet, inches, fio2, transportMinutes };
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

  function setTransportAssessment(transportMinutes, lowerDuration) {
    if (transportMinutes === null) {
      el.transportAssessment.hidden = true;
      return;
    }

    const reserve = lowerDuration - transportMinutes;
    let kind;
    let icon;
    let title;
    let text;

    if (reserve >= 15) {
      kind = "good";
      icon = "✓";
      title = "Adequate Oxygen Supply";
      text = `
        <div class="assessment-metrics">
          <div><span>Anticipated transport time</span><strong>${formatDuration(transportMinutes)}</strong></div>
          <div><span>Conservative reserve remaining</span><strong>${formatDuration(reserve)}</strong></div>
        </div>`;
    } else if (reserve >= 0) {
      kind = "caution";
      icon = "!";
      title = "Limited Oxygen Reserve";
      text = `
        <div class="assessment-metrics">
          <div><span>Anticipated transport time</span><strong>${formatDuration(transportMinutes)}</strong></div>
          <div><span>Conservative reserve remaining</span><strong>${formatDuration(reserve)}</strong></div>
        </div>
        <p class="assessment-action">Consider changing or supplementing the oxygen source before departure.</p>`;
    } else {
      kind = "critical";
      icon = "×";
      title = "Insufficient Oxygen Supply";
      text = `
        <div class="assessment-metrics">
          <div><span>Anticipated transport time</span><strong>${formatDuration(transportMinutes)}</strong></div>
          <div><span>Estimated shortfall</span><strong>${formatDuration(Math.abs(reserve))}</strong></div>
        </div>
        <p class="assessment-action">Change or supplement the oxygen source before departure.</p>`;
    }

    el.transportAssessment.hidden = false;
    el.transportBanner.className = `recommendation transport-decision ${kind}`;
    el.transportBanner.querySelector(".recommendation-icon").textContent = icon;
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

    const totalInches = values.feet * 12 + values.inches;
    const heightCm = totalInches * 2.54;
    const pbwKg = Math.max(0, 50 + 0.91 * (heightCm - 152.4));
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

  [el.tankPsi, el.heightFeet, el.heightInches, el.fio2, el.transportMinutes]
    .forEach((input) => input.addEventListener("input", calculate));

  el.resetButton.addEventListener("click", () => {
    [el.tankPsi, el.heightFeet, el.heightInches, el.fio2, el.transportMinutes]
      .forEach((input) => { input.value = ""; });
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
