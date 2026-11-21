# BOARD//LAB 4.0

**Interactive PC & laptop repair, motherboard diagnostics, microsoldering and PCB engineering training.** An offline-first educational simulator with a connected design-to-repair digital twin.

## Launch

1. **[PC, laptop and PCB workbench](index.html):** Open index.html in a browser for the original procedural 3D workbench, disassembly, diagnostic instruments, board-level cases, microsoldering exercises, learning pathways and PCB Design Studio.
2. **[Offline standalone app](standalone.html):** Same original simulator with scripts and styles embedded. For the new digital-twin lab, keep digital-twin.html and its associated JS files in the same directory.
3. **[Integrated digital twin](digital-twin.html):** One 5 V LED training board sharing circuit topology, copper connectivity, fault state, DMM readings, oscilloscope waveform, virtual repair and post-repair verification. This is the new connected workflow.

For browsers that block local file scripts, serve the checkout as a static website. For example, with Python installed:

    python -m http.server 8000

Then visit http://localhost:8000/.

No account, API token, external network request or dependency install is required for the browser modules.

## Test and engineering tools

Requires Node.js 18+:

    npm test
    npm run check
    npm run export

The first two run local deterministic model tests and static syntax checks. The last command generates an illustrative SPICE deck and experimental KiCad PCB. If the corresponding native desktop programs are installed, you can also run:

    npm run spice
    npm run drc

Native CLI availability and board-manufacturing validation are separate matters. References:
- KiCad CLI: https://docs.kicad.org/master/en/cli/cli.html
- ngspice batch mode: https://nmg.gitlab.io/ngspice-manual/analysesandoutputcontrol_batchmode/batchoutput.html

## Design-to-repair workflow

- **01 Design:** Inspect the 5 V circuit, protection fuse, series resistor, LED and output capacitor. Editing resistor value changes circuit results.
- **02 PCB:** Inspect footprints, copper and vias. Break a copper connection and verify that the electrical simulation also changes. Import the LED layout saved in PCB Studio, run training DRC, export training KiCad/JSON.
- **03 Diagnose:** Energize only after a safety check. Place red/black DMM probes on real modeled test nodes, use DC voltage, then isolate source before resistance/continuity. Scope traces and component dissipation derive from the same model.
- **04 Repair:** Gather evidence, select the faulty component/trace and a suitable virtual repair. Incorrect, premature and energized actions are rejected.
- **05 QA:** Re-energize and confirm operating voltage, output load behavior, copper connectivity and repair success. Download the diagnostic record.

Seven designed faults: open fuse, output capacitor short, high-resistance connector, open LED, open resistor, disconnected return, broken trace. A healthy reference is also provided.

## Architecture

The legacy modules are preserved in separate files. The new connected trainer is:

- pcb-core.js — board parts, pads, nets, tracks, vias, training geometry checks and KiCad PCB export.
- twin-core.js — deterministic modified nodal analysis of the LED teaching circuit, fault injection, virtual measurement, safety state, repair and QA.
- twin-ui.js — shared PCB/schematic, instrument and assessment interface.
- spice-export.js — explicit inspectable electrical deck for an external native SPICE run (not yet numerical calibration).
- tools/eda-cli.mjs — bounded, shell-free optional invocation of ngspice or KiCad.
- tests/twin.test.js — deterministic regression coverage.
- [Engineering status and production requirements](docs/ENGINEERING_STATUS.md).

## Non-negotiable accuracy notice

Every board and fault is a **fictional training example**, not an actual ASUS or other OEM service layout. This release does not have a complete SPICE solver embedded in the browser; its LED circuit uses a documented piecewise-linear approximation and source current limiting. Training DRC and experimental footprints **do not authorize PCB fabrication**. Native KiCad ERC/DRC, exact supplier datasheets, qualified PCB stackup, thermal/signal integrity review and physical verification are still required. Neither browser simulation nor virtual rework qualifies anyone to work on energized mains or damaged lithium batteries.

**The remaining professional 3D, high-speed, embedded, factory, AI tutor and institutional certification systems require specialist implementation and validation.** Their acceptance criteria and missing features are documented instead of represented as complete.
