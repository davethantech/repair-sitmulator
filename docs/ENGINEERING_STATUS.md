# BOARD//LAB 6 verification status — 21 November 2026

## Newly implemented since v5

- General compact nonlinear DC + time-domain MNA circuit solver (R/L/C, independent sources, exponential diode and approximate NMOS/PMOS), with bounded numerical integration and explicit singular/nonconvergence failures.
- Editable circuit workbench with circuit graph, calculated node and branch observations, waveform plots, custom JSON projects and restricted native ngspice deck export.
- Independent ngspice GitHub Actions job, installed from the Ubuntu package, ran successfully on the RC example. This proves native circuit deck execution, not vendor semiconductor calibration.
- Fictional 355 x 245 mm mechanical 3D model with real three-axis software rendering, 7 removable assemblies, 23 fasteners, 5 cable connectors, battery isolation, latches, heat-interface renewal, torque training checks, and a complete guided disassembly/reassembly path.
- Schematic electrical checker for reference numbers, pin declarations, net/pad mismatches, output conflicts, unpowered input warnings and unverified conceptual footprint blocking.
- Server-side practical grading with circuit, PCB, firmware, SI, rework and mechanical trace replay, storing independently recomputed unproctored scores in the local classroom API.
- Provenance-aware named reference dataset comparator, with per-point tolerance checks and RMSE; ships a SYNTHETIC example only (no real physical board measurements supplied).
- CI tests for all new pure engines, interface state changes, classroom authorization, SPICE serialization, physical action constraints and calibration failures.

**Product status:** A broad, runnable educational training platform with reproducible numerical engineering examples. It remains **NOT** an OEM-authorized, electrically calibrated, manufacturer-approved, independently penetration-tested or accredited product.

**Production qualification blockers:** licensed manufacturer boardviews/mechanical CAD and service procedures; real bench measurements and instrumentation calibration records; device vendor electrical models; PCB stackup/footprint/fabricator DFM approvals; independently validated thermal/BGA and high-speed data; managed cloud identity and privacy review; and professional accreditation. Model code cannot create or certify those external facts.

See [V6_PHYSICS_AND_VALIDATION.md](V6_PHYSICS_AND_VALIDATION.md) for a detailed numerical and acceptance explanation. Successful CI and native SPICE execution do not mean OEM hardware certification.

---

# BOARD//LAB 5 verification update (2026-11-21)

**V5 implemented and testable in the repository:**

- A PCB DFM/assembly training engine driven by existing BOARD//LAB pad/trace geometry, with BOM, placement centroid, hole inventory and array-panel planning. Conceptual USB-C/SOT training parts block or flag manufacturing review.
- An editable deterministic virtual CPU language with registers, conditional branches, GPIO, PWM, ADC, modeled I2C sensor and UART. Brownout, sensor NACK and open LED are repeatable training faults; NOT an MCU/ARM/RISC-V emulator.
- A lossless transmission-line calculator with source/load reflection coefficients and animated-ready waveform samples (TDR/receiver). It cannot validate realistic high-speed channels.
- A simplified lumped-temperature rework practice model with flux, thermal stress, liquidus dwell, component replacement, bridge/corrosion inspection and score. NOT real solder profile guidance.
- A new responsive engineering-lab.html workbench connecting all four engines, exporting results and accepting real controls rather than placeholders.
- A nine-case practical exam module grading actual low-voltage engine state, net coverage, firmware traces, signal reflections and thermal inspection. Local unproctored practice only.
- A local-only Node classroom server supporting admin setup, user creation, instructor assignment, login/logout, self-reported practice scores, progress and permission checks. This is not a secure production cloud LMS.
- Deterministic unit, model, browser-interface smoke and classroom API tests wired into GitHub Actions. Sample engineering exports are in examples/v5.

**Explicitly NOT finished**: full transistor-level SPICE, vendor-calibrated firmware/EC/VRM/OEM power rails, mechanical CAD-fidelity 3D disassembly, real heat/wetting-based microsoldering physics, fabrication-grade schematic/GERBER/CAM, production high-speed channel simulation, native chip emulation, generative AI tutoring, multi-tenant audited cloud LMS, or accredited qualifications. These require supplier documentation, licensed assets, native engineering tools, physical validation and a much larger engineering program.

**Acceptance rule:** No training DRC pass, educational waveform, heat score, or classroom grade is a manufacturer-approved engineering, physical safety, fabrication or professional certification signoff.

Read V5_ENGINEERING_WORKSHOP.md for practical exercises and reproducible tests.

---

# BOARD//LAB — engineering status, validation & future build plan

Release basis: original BOARD//LAB 3.0 imported from the provided release, plus an integrated 5 V design-to-repair training lab.

## Verified / testable now

- Procedural 3D repair bench and existing educational PC/laptop/PCB modules preserved as editable source.
- Low-voltage LED board has one source of truth for component references, pad/net assignments, copper connectivity, physical fault and repair state.
- Modified nodal analysis for linear resistive branches plus a piecewise-linear diode approximation and a deterministic idealized source current cap (0.8 A).
- Virtual DMM DC voltage and unpowered resistance/continuity; blocked live ohms; fault-dependent power/current behavior.
- Seven fault scenarios and a healthy reference; recorded measurements, inspection, target/tool choice, repair state changes, QA and exportable learning log.
- PCB copper can be removed and the load current changes; resistor value edits change the electrical solution; basic DRC catches missing routing and shorts.
- Derived scope startup plot and modeled dissipation indicators, explicitly not real calibrated waveforms/thermal-camera data.
- Optional SPICE deck and KiCad board file exports; local EDA runner attempts native CLI calls with fixed arguments.
- Node regression tests and GitHub Actions workflow source added. Native ngspice and KiCad are NOT installed in the current build environment, so no claim of their live output validation is made.

## Explicitly incomplete, by domain

| Domain | Present scope | Production work and independent acceptance criteria |
|---|---|---|
| Electrical | Validatable teaching DC model of one LED topology | ngspice transient/nonlinear integration; vendor MOSFET, controller, battery and load models; measured reference vectors and tolerance/uncertainty budgets |
| Motherboard | Rail dependency/BIOS/EC conceptual exercises | Per-model OEM-licensed schematics/boardviews, power sequencing, hardware-specific rails, clock/reset/VRM and firmware datasets |
| 3D | Fictional procedural motherboard / selectable components | Dimensionally calibrated CAD assets; realistic cable, screw and connector constraints; collision & torque; calibrated tool mechanics |
| Rework | Guided virtual component repair and rework minigames | Heat transfer, pad wetting, flux, peel strength and BGA defects experimentally validated against microscope/thermal footage |
| PCB | Basic schematic connectivity, training copper geometry, two editable copper layers, illustrative 4-layer concepts | Verified footprints/symbols, complete ERC/DRC, push/shove routing, BGA fanout, differential pairs, SI/PI/EMI and fabrication stackup with test coupons |
| Factory | Conceptual design-release checks | Gerber/ODB++/IPC-2581 manufacturing pipelines, DFM rules, stencil, reflow, AOI/X-ray with actual measured manufacturing references |
| Embedded | Conceptual firmware and bus lessons | MCU emulator/firmware compiler with I/O timing, peripherals, I2C/SPI/UART analysis, deterministic device co-simulation |
| Intelligent tutor | Existing case hints, feedback and scoring | Evidence-grounded assistance with evaluation corpus, teacher moderation and privacy-protected model service |
| Classrooms | Existing local training views and optional local demo concepts | Secure cloud multitenancy, account verification, backups, RBAC, auditability, accessibility, retention policy and independent security review |
| Certification | Practice examinations | Proctoring, independent curriculum standards, vetted questions, human assessor policy and credentialing |

## Technical architecture direction

- A stable typed graph with component IDs, pins, nets, copper geometry, materials, and model provenance.
- Interchange adapters for KiCad schematic/board and ngspice models. Prevent unsupported models from silently returning arbitrary readings.
- 3D render engine independently consumes verified geometry and updates interactive repair actions through the same part IDs.
- Scenario engine injects faults into the electrical / mechanical state and stores expected evidence, diagnostic strategy, remedy and re-test requirements.
- Instruments query measured or simulated nets and document accuracy class. They must NEVER fabricate instrument readings from random numbers.
- A lesson authoring/evaluation layer records evidence, hints, correct reasoning and unsafe actions. Separate student records from model logs.
- Productize only after automated CI, browser/system tests, electrical reference tests, native EDA checks, accessibility and security acceptance.

## Validation gates

1. Match reference boards' input/output rail voltages and currents, transient ramps and known-fault responses within documented error budgets and at stated temperature/load ranges.
2. Use only exact manufacturer part pinouts and footprints, native KiCad ERC/DRC, a qualified fab stackup, current/temperature analysis and signed design review before any generated file is considered manufacturable.
3. Demonstrate 3D mechanical dimensions, torque, connector locks and heat-sink constraints against the physical trainer hardware.
4. Validate realistic rework against observed heating profiles, temperature measurements and pad inspection; do not imply virtual skill qualifies hazardous real-world repairs.
5. Establish security and privacy standards for any internet-based teacher/student account service.
6. Define scenario revisioning, traceability, scoring calibration, test fixtures and objective evaluation for all learning levels.
7. Include non-WebGL and keyboard-accessible fallbacks, low-spec laptop performance, visual regression tests and browser profiles.
8. Reject unsupported hardware topology and prevent unsafe live ohms, incorrect source polarity, uncontrolled injection, mains PSU work or swollen battery repair.

The features above require extensive professional assets, native tools, external datasets and qualified validation. They **cannot be considered complete merely because a UI or illustrative calculation exists**.
