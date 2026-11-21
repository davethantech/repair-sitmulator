# BOARD//LAB 5 — Advanced Engineering Workshop

Version 5 adds four runnable teaching labs at engineering-lab.html alongside the earlier PC/laptop repair and PCB design-to-repair trainer.

## Quick start

1. Clone or download this repository.
2. Serve the folder, for example by running: python -m http.server 8000
3. Open http://127.0.0.1:8000/index.html to use the existing repair bench. Select ENGINEERING LAB V5; alternatively, open engineering-lab.html.
4. No account or network connection is required for the engineering modules.
5. With Node.js 18+, run npm run check to reproduce the tested training scenarios.

All models are deliberately fictional low-voltage examples. Do not use virtual equipment values as real physical repair instructions.

## Lab A — PCB factory and manufacturing awareness

The existing PCB Studio includes editable pads, copper traces and vias. The factory performs a TRAINING DFM review, not a professional CAM release.

1. Load the routed 5 V LED board; examine footprints, colored nets and mounting holes.
2. Run the training review and change minimum drill / assembly margin.
3. Switch to the conceptual USB-C design: release blockers appear because the connector has no verified physical footprint.
4. Plan a 2 by 2 board panel and inspect the board coordinates and dimensions. Tabs, tooling holes, fiducials and depanelization remain unmodeled.
5. Export an unverified BOM, centroid placement CSV, drill summary CSV and DFM report JSON.
6. In professional CAD, check real component supplier part numbers, pin mappings, native ERC/DRC, stackup constraints and fabricator DFM.

Assessment: Explain why a zero-error training review cannot authorize fabrication. Name five extra manufacturing approval steps.

## Lab B — Embedded electronics

A custom virtual CPU has four 16-bit registers (R0–R3), GPIO pins P0–P3, PWM, 10-bit ADC, a simulated I2C temperature sensor at address 0x48 and UART text logging. It is NOT a real ARM, AVR, RISC-V or ESP32 emulator.

1. Load the Blink program, compile, step through operations and watch the register states, virtual LED and cumulative milliseconds.
2. Run to completion: four pulses take 1600 virtual milliseconds.
3. Load the Sensor program and vary temperature; observe the branching decision.
4. Inject I2C NACK and brownout faults; compare execution trace and rail behavior.
5. Run ADC with 1.65 V input; the 3.3 V reference produces approximately 512 in ten-bit counts.
6. Export a step-by-step execution trace.

Assessment: Change Blink count or PWM duty, predict elapsed milliseconds and LED current before running. Explain why virtual GPIO current does not prove a physical circuit is safe.

## Lab C — Signal integrity and timing

An ideal, lossless single-ended transmission-line model calculates propagation delay, source and load reflection coefficients, and repeated echoes with finite linear edge rise. It is not an EM field solver or device/vendor IBIS model.

1. Set Z0=50 ohm, source resistance=50 ohm, load=50 ohm, driver step=3.3 V. The initial incident wave is 1.65 V and load reflection is zero.
2. Compare unmatched source R=0 ohm and load R=100 ohm; observe overshoot.
3. Compare a simulated open load. Load reflection coefficient approaches +1.
4. Increase length and effective dielectric constant to observe one-way propagation delay.
5. Switch scope from receiver to driver TDR. Export waveform CSV.

Assessment: Explain why this model cannot sign off DDR/PCIe/USB: missing vias, connectors, losses, device input capacitances, crosstalk, jitter, and reference-plane discontinuities.

## Lab D — Microsoldering and rework

This is a bounded lumped thermal teaching model, not a validated soldering or BGA manufacturing profile.

1. Prepare a fictional 0805 capacitor with source isolated.
2. Apply short virtual hot-air pulses while monitoring pad/board temperatures, solder liquidus dwell and pad health.
3. Remove the virtual device after modeled dwell, place replacement and reflow.
4. Cool before inspection. Observe failure messages for solder bridges, contamination, missing replacement or thermal damage.
5. Repeat with excessive heat and compare outcomes.

Assessment: Explain why equipment vendor instructions and actual thermocouple profiles must override all educational simulator values. Never apply these virtual temperatures to actual equipment.

## Local classroom service

For local practice only, install Node.js 18+ and run: npm run serve

Open http://127.0.0.1:8714 and select the Advanced Lab classroom panel. The server supports first administrator setup from loopback, scrypt-hashed passwords, HttpOnly SameSite session cookies, learners/instructors, assignments, unproctored attempts and progress. Its default bind address is localhost. Never expose it directly to the public internet.

The server uses a private local JSON database under .boardlab-data (Git-ignored). This is not a cloud-grade LMS: production use requires HTTPS, managed identity, session persistence, per-tenant access separation, audits, backups, privacy controls and external security testing.

## Tests

Run: npm test
Run: npm run check

GitHub Actions runs checks for the design-to-repair model, PCB factory export, virtual MCU faults, signal reflection models, rework inspection, classroom login/permissions and engineering GUI state changes.

Optional separate installed engineering tools:
- npm run export — exports illustrative netlist/board examples
- npm run spice — invokes local ngspice if installed
- npm run drc — invokes local KiCad PCB DRC if installed

Even a successful native CAD check cannot substitute for fabricator-specific DFM, component pinout review or real prototype testing.

## Boundaries and remaining professional work

Not yet production validated: nonlinear SPICE transient solver with vendor models, real OEM dimensionally calibrated 3D disassembly, measured BGA thermal physics, full schematic/ERC/DRC/CAM toolchain, high-speed DDR/PCIe/USB channel analysis, real embedded CPU/firmware emulation, LLM-backed tutoring, multi-tenant secure cloud LMS, or accredited assessment.

See ENGINEERING_STATUS.md for acceptance criteria and outstanding work. Do not present conceptual models or practice scores as a professional repair qualification.
