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
    resetButton: document.getElementById("resetButton"),
    tankTypeError: document.getElementById("tankTypeError"),
    tankPsiError: document.getElementById("tankPsiError"),
    heightError: document.getElementById("heightError"),
    fio2Error: document.getElementById("fio2Error"),
    calculationStatus: document.getElementById("calculationStatus"),
    planningVt: document.getElementById("planningVt"),
    minuteVentilation: document.getElementById("minuteVentilation"),
    oxygenDurationRange: document.getElementById("oxygenDurationRange"),
    durationCard: document.getElementById("durationCard"),
    durationRange: document.getElementById("durationRange"),
    maskSealBanner: document.getElementById("maskSealBanner"),
    transportBanner: document.getElementById("transportBanner"),
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
    [el.tankTypeError, el.tankPsiError, el.heightError, el.fio2Error].forEach((node) => { node.textContent = ""; });
    [el.tankPsi, el.heightFeet, el.heightInches, el.fio2].forEach((node) => node.classList.remove("is-invalid"));
  }

  function validate() {
    clearErrors();
    let valid = true;
    const tank = el.tankType.value;
    const psi = numberValue(el.tankPsi);
    const feet = numberValue(el.heightFeet);
    const inches = numberValue(el.heightInches);
    const fio2 = numberValue(el.fio2);

    if (!TANK_FACTORS[tank]) { el.tankTypeError.textContent = "Select an oxygen source."; valid = false; }
    if (psi === null || psi < 0 || psi > 2200) { el.tankPsiError.textContent = "Enter a pressure from 0 to 2200 PSI."; el.tankPsi.classList.add("is-invalid"); valid = false; }
    if (feet === null || feet < 4 || feet > 7 || inches === null || inches < 0 || inches > 11) {
      el.heightError.textContent = "Enter height using 4–7 feet and 0–11 inches.";
      el.heightFeet.classList.add("is-invalid"); el.heightInches.classList.add("is-invalid"); valid = false;
    }
    if (fio2 === null || fio2 < 21 || fio2 > 100) { el.fio2Error.textContent = "Enter FiO₂ from 21% to 100%."; el.fio2.classList.add("is-invalid"); valid = false; }
    return { valid, tank, psi, feet, inches, fio2 };
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return "—";
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 61) return `${rounded} min`;
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
  }

  function setStatus(kind, label, lowerMinutes) {
    [el.durationCard, el.maskSealBanner, el.transportBanner].forEach((node) => {
      node.classList.remove("good", "caution", "critical", "neutral");
      node.classList.add(kind);
    });
    el.calculationStatus.textContent = label;
    el.durationRange.textContent = label;
    el.transportText.textContent = `Consider changing or supplementing the oxygen source if the anticipated transport time exceeds ${formatDuration(lowerMinutes)}.`;
  }

  function resetResults() {
    el.planningVt.textContent = "—";
    el.minuteVentilation.textContent = "—";
    el.oxygenDurationRange.textContent = "—";
    el.calculationStatus.textContent = "Enter all values";
    el.durationRange.textContent = "Awaiting values";
    el.transportText.textContent = "Enter the required information above.";
    [el.durationCard, el.maskSealBanner, el.transportBanner].forEach((node) => {
      node.classList.remove("good", "caution", "critical");
      node.classList.add("neutral");
    });
  }

  function calculate() {
    const values = validate();
    if (!values.valid) { resetResults(); return; }

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

    el.planningVt.textContent = Math.round(planningVtMl).toLocaleString();
    el.minuteVentilation.textContent = minuteVentilationLpm.toFixed(1);
    el.oxygenDurationRange.textContent = `${formatDuration(lowerDuration)} – ${formatDuration(upperDuration)}`;

    if (lowerDuration >= 60) setStatus("good", "Good range", lowerDuration);
    else if (lowerDuration >= 30) setStatus("caution", "Caution range", lowerDuration);
    else setStatus("critical", "Critical range", lowerDuration);
  }

  [el.tankPsi, el.heightFeet, el.heightInches, el.fio2].forEach((input) => input.addEventListener("input", calculate));
  el.resetButton.addEventListener("click", () => {
    [el.tankPsi, el.heightFeet, el.heightInches, el.fio2].forEach((input) => { input.value = ""; });
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
