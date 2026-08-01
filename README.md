# HAMILTON-T1 BiPAP Oxygen Duration Calculator — Test Build

Independent test site for pre-arrival oxygen-supply planning during noninvasive ventilation.

## User inputs
- D, E, or M oxygen source
- Current cylinder pressure
- Patient height
- Planned FiO2

## Internal planning assumptions
- Male ARDSNet predicted-body-weight equation
- 8 mL/kg PBW anticipated tidal volume
- 10% tidal-volume allowance
- Respiratory rate fixed at 20/min
- HAMILTON-T1 adult/pediatric base flow of 3 L/min
- Low leak assumption: 5 L/min
- High leak assumption: 20 L/min
- 300 PSI cylinder reserve

The displayed duration is a range from the high-leak estimate to the low-leak estimate. This is a planning estimate only and requires clinical/bench validation before production use.
