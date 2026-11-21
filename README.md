# BOARD//LAB 6.0 — Interactive Hardware Engineering, PCB CAD & Repair Laboratory

**A runnable, openly inspectable training system — now with general compact circuit physics, physically constrained 3D disassembly, schematic/PCB cross-checking, independent native ngspice export, and server-recomputed practical scoring.**

## New in version 6

- **[Nonlinear Circuit Laboratory](circuit-lab.html):** Edit a bounded JSON circuit with independent voltage/current sources, R/L/C, diodes and compact NMOS/PMOS. Compute DC operating points, time-domain node waveforms and branch currents. Errors on floating or nonconverging circuits are reported rather than disguised. Upload a documented measured-reference dataset to compare errors with declared tolerances.
- **[3D Mechanical Disassembly](assembly-3d.html):** Rotate and inspect the fictional dimensional laptop, pick parts, disconnect connectors, remove all 23 modeled fasteners, renew thermal interface and perform guided teardown and full reassembly QA. Software three-axis renderer works without WebGL.
- **[Schematic-to-PCB Electrical Rules](circuit-lab.html):** Check component pin numbers, net assignments, PCB pads, copper continuity, output conflicts and abstract footprints. Supplier validation and real KiCad ERC/DRC remain external.
- **Server-side engineering practical grades:** Local classroom API recomputes actual circuit, PCB, embedded, signal and mechanical service actions instead of trusting a client-submitted numeric score.
- **Native and calibration verification:** Run npm run circuit:verify, npm run circuit:native and npm run calibration:check. The latter ships a clearly identified synthetic self-check reference. GitHub Actions has a separate native ngspice execution workflow.

Read the [V6 numerical, mechanical and validation guide](docs/V6_PHYSICS_AND_VALIDATION.md) for technical details and limits.

**Do not mistake simulation for OEM approval:** all motherboard geometry, fastener torques and device data are fictional and educational. Exact vendor schematics, physical calibration, qualified fabrication libraries, real material physics, approved parts and independent safety testing remain prerequisites for production use.

---

## Launch the simulator

| Where | Open | What works |
| --- | --- | --- |
| Main workbench | [index.html](index.html) | Procedural 3D repair environment, PC/laptop fault scenarios, tools, disassembly, firmware, rework, PCB Studio, lessons |
| Connected digital twin | [digital-twin.html](digital-twin.html) | One shared 5 V LED board: schematic/PCB, power model, DMM, hidden fault diagnosis, repair, scope and QA |
| Engineering workshop v5 | [engineering-lab.html](engineering-lab.html) | PCB factory DFM/assembly, virtual MCU/firmware, transmission-line signal integrity and thermal rework |
| Circuit physics v6 | [circuit-lab.html](circuit-lab.html) | Nonlinear and transient circuit solver, PCB ERC, waveform and calibration comparison |
| Mechanical 3D v6 | [assembly-3d.html](assembly-3d.html) | Interactive three-axis disassembly, fasteners, ZIF/battery/thermal and QA |
| Original standalone | [standalone.html](standalone.html) | Main legacy simulator in one HTML file, offline; new labs require adjacent modules |

To use, download repository ZIP and open the appropriate HTML file in a modern browser. For browsers that restrict file-origin scripts, run a local static web server, for example:

    python -m http.server 8000

Then visit http://127.0.0.1:8000/index.html.

The engineering modules are client-side with no cloud account or external dependency.

## V5: New functional modules

- **PCB factory:** Uses actual geometry/nets from the PCB Studio project; checks training DRC, abstract footprints, hole sizes/annular rings, board and assembly keepouts; exports BOM, unverified centroids/drill summaries, panel plans and review reports. Never Gerber or CAM signoff.
- **Embedded systems:** Tiny 4-register virtual instruction set, editable programs, labels/jumps, GPIO, PWM, 10-bit ADC, UART logging, mock I2C sensor, brownout/open-load/NACK faults, execution history and CSV export.
- **Signal integrity:** Idealized traveling-wave and TDR-style visualization for lossless single-ended lines; characteristic impedance, driver/load terminations, dielectric constant, trace length, finite rise time, repeated echoes, CSV waveform.
- **Thermal rework:** Energy-based lumped pad heating/cooling, solder liquidus dwell, component replacement, flux, modeled bridges and corrosion, pad damage and inspection rubrics. This is a training game, not real equipment guidance.
- **Objective practical exams:** Nine reproducible training assessments grade real circuit/PCB state, MCU execution traces, signal reflections and rework outcomes with rubrics, local attempt history and JSON export. Scores are not professional credentials.
- **Local classroom server:** Restores instructor/learner accounts, hashed passwords, role-limited assignments, unproctored practice grading and saved learning progress on localhost. Built-in Node libraries; NOT internet-facing production LMS.
- **Regression & release:** Automated functional tests, security checks, GUI action tests and example fixtures under [examples/v5](examples/v5).

Read the [step-by-step V5 Engineering Workshop Guide](docs/V5_ENGINEERING_WORKSHOP.md) for curriculum, worked examples and assessment tasks.

## Run tests

With Node.js 18+:

    npm test
    npm run check

The GitHub Actions workflow runs these checks on commits. A separate native ngspice workflow also verifies the example exported deck with an installed actual ngspice binary.

## Local classroom mode

    npm run serve

Then open http://127.0.0.1:8714 and select Advanced Lab → Classroom Server. First-run administrator setup requires localhost; student passwords are scrypt-hashed, sessions use SameSite HttpOnly cookies, and roles limit access. Session storage is in-memory, and the local database is created under .boardlab-data. It is Git-ignored. Use a unique password; do not expose the server to the public internet.

## Optional native EDA verification

These commands require the relevant native tools on the user's own machine:

    npm run export
    npm run spice
    npm run drc

The exported SPICE netlist and KiCad board are restricted, **unverified teaching artifacts**. In-house native DRC or simulation, when available, does not prove correctness of vendor-specific symbols, footprints or manufacturability.

## Technical architecture

- [pcb-core.js](pcb-core.js), [pcb-studio.js](pcb-studio.js): existing educational PCB layout editor and training DRC.
- [twin-core.js](twin-core.js), [twin-ui.js](twin-ui.js): connected deterministic design-to-repair circuit and fault scenarios.
- [factory-core.js](factory-core.js): manufacturing design review and assembly data exports.
- [embedded-core.js](embedded-core.js): virtual MCU language and peripherals.
- [signal-core.js](signal-core.js): analytic traveling-wave model.
- [rework-core.js](rework-core.js): simplified thermal rework model and inspection.
- [engineering-ui.js](engineering-ui.js), [engineering-lab.html](engineering-lab.html), [assessment-core.js](assessment-core.js): interactive engineering tools and nine objective practice rubrics.
- [server.js](server.js): optional local instructor/learner API.
- [tests](tests): reproducible electrical, user-interface and classroom regression checks.
- [docs/ENGINEERING_STATUS.md](docs/ENGINEERING_STATUS.md): verified scope, limitations and production acceptance requirements.

## Incomplete production work

A fully validated version still requires qualified OEM mechanical and board CAD, real 3D component/cable physics, measured nonlinear SPICE and signal-channel models, actual solder/bond material data, verified native EDA/ERC/DRC/CAM, software security reviews, real embedded emulation/toolchains, an LLM-supported instructor service (if desired), and independently approved certification criteria. These have not been represented as finished.

**Safety:** The software is for fictional isolated low-voltage training. Do not probe mains, open energized supplies, repair swollen lithium batteries, use unknown power injection, or copy virtual rework settings to physical hardware.
