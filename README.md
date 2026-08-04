# BiPAP Oxygen Duration Calculator

Test Version 0.4.3 — Northwell Ambulance of Connecticut

A mobile-friendly pre-arrival planning tool for estimating oxygen duration for patients receiving BiPAP using the HAMILTON-T1.

## Required inputs

- Oxygen source: D, E, or M tank
- Current tank pressure
- Patient height
- Planned FiO₂

## Optional input

- Estimated transport time, including loading, travel, transfer of care, and foreseeable delays

## Calculation model

The calculator uses a conservative height-based planning model internally:

1. Male predicted body weight equation
2. 8 mL/kg predicted tidal volume
3. Additional 10% planning allowance
4. Respiratory rate fixed at 20 breaths/min
5. HAMILTON-T1 adult base flow of 3 L/min
6. Low- and high-leak assumptions of 5 and 20 L/min
7. 300 PSI cylinder reserve

The displayed output is a duration range based on mask seal. Internal tidal-volume and minute-ventilation estimates are not displayed because they are planning assumptions, not measured patient values.

If an optional transport time is entered, the calculator compares it with the lower, conservative duration estimate:

- Green: 15 minutes or more projected reserve
- Yellow: 0–14 minutes projected reserve
- Red: anticipated transport exceeds the lower duration estimate

## Deployment

This is a static website. No build command is required. Deploy with:

`npx wrangler deploy`

## Important

This calculator is a planning estimate only and does not replace clinical judgment or continuous monitoring.

## Version 0.4.1 interface refinements

- Compact duration format such as `2h 25m – 4h 3m`
- Result descriptor changed to **Estimated O₂ Tank Duration**
- Revised mask-seal wording
- Separate transport decision card with anticipated transport time and conservative reserve remaining


## Version 0.4.1 changes

- Removed the conservative reserve remaining tile from the transport assessment.
- Retained anticipated transport time as the only assessment metric.
- Added status-specific recommendation text.
- Replaced text glyphs with centered SVG status symbols.
- Retained the Transport Assessment Guide title and thresholds.


## Version 0.4.2 change

- Centered and narrowed the dynamically generated anticipated transport time card.
- Added asset cache-busting and advanced the service-worker cache to v0.4.2.
- No calculation logic, thresholds, wording, or tank constants were changed.


## Version 0.4.3 change

- Changed patient-height entry from feet/inches to centimeters.
- Added a live, read-only feet/inches conversion beneath the centimeter field.
- Removed the always-visible adult height-range hint.
- No oxygen-duration calculation assumptions or thresholds were changed.


# Version 1.0
Official 1.0 release.
- Height entry in centimeters
- Live feet/inches reference
- Left-aligned reference display


## Version 1.2

- Replaced the line-art BiPAP icon with a transparent-background full-face BiPAP mask image.
- Added a circular Home button in the header linking to the calculator selection landing page.
- Updated asset cache-busting and service-worker cache version.


## Version 1.3

- Replaced the header line-art symbol with a transparent-background BiPAP mask image.
- Added a Home button linking to the Pre-Arrival Transport Planning Tools landing page.
- Added a Clinical Setup Resources section.
- Embedded the Hamilton T1 Initial Setup & Pre-op Checks PDF and BiPAP/CPAP Setup PDF.
- Added direct links to both corresponding YouTube setup videos.
- Updated service-worker cache assets and versioning.
