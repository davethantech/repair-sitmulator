# PCB Project Journey (v6.1) — Architecture and training acceptance

## Why it was added

A user requested that BOARD//LAB incorporate the linked Pantech.ai GPT-6 Astra + KiCad PCB-design workshop:
https://app.pantech.ai/pcbdesign-gptaastra6-home-c3

The exact tracking URL could not be inspected directly through the public retrieval interface. Pantech's related public workshop pages describe a five-day path covering circuit planning, schematic, footprints, PCB placement and routing, DRC, BOM, Gerber and manufacturing preparation. These are standard engineering-learning topics. The BOARD//LAB implementation is **independently authored, not affiliated with Pantech.ai, and contains no proprietary lesson videos, course materials, user accounts, GPT-6 Astra backend, access tokens or course certificate.**

Pantech source pages used for high-level topic reference:
- https://app.pantech.ai/pcbdesign-gptaastra6-retargeting
- https://app.pantech.ai/pcbkicad-astra-gpt6-organic

## Run

Use pcb-journey.html, including when served through npm run serve. It loads local scripts from pcb-core.js, cad/erc-core.js, factory-core.js, academy/pcb-journey-core.js, and academy/pcb-journey-ui.js. No API key or external account is required. A static file server or Node localhost server avoids file-origin restrictions.

## How the implementation works

1. Five original, concise days group twelve actual engineering-learning stages.
2. A deterministic keyword triage maps a plain-language brief to a **supported** low-voltage LED, regulator concept or USB-C sink concept. No arbitrary PCB design generation, network AI calls or untrusted shell commands.
3. A bounded design brief validates source voltage, LED forward voltage and current. A resistor calculation derives ideal and nearest E12 values, approximate actual LED current and resistance power dissipation. These are engineering training estimates, not real component characterisation.
4. The project board is a real pcb-core.js compatible JSON object. Layout rendering uses its actual footprints, copper segments, vias and pad labels.
5. The reviewer calls the existing PCB Studio DRC, schematic-to-pad ERC and factory review functions, producing evidence-gated states instead of decorative progress marks.
6. PCB Studio integration uses localStorage key boardlab.pcb.project.v3, and the deep link index.html#pcb opens the existing editor to allow placement/routing work. The journey can import the saved board or a project JSON file and reevaluate it. Existing Studio drafts are confirmed before overwrite.
7. Exports include unverified BOM CSV, centroid CSV, drill CSV, schematic JSON, PCB JSON, a training-only experimental .kicad_pcb, and a full JSON handoff manifest.
8. The original workshop URL is offered as an **external third-party course link**, not embedded as a first-party educational resource.

## Evidence stages and unautomated approvals

| Stage | Evidence accepted |
|---|---|
| Requirements | Valid bounded isolated low-voltage design brief |
| Components | Connector, series resistor, load and enough modeled parts |
| Calculations | Derived theoretical LED resistor/current/dissipation |
| Schematic | No *training* schematic-to-pad errors |
| Footprints | No explicitly conceptual footprint and training pins consistent |
| Outline | Basic board dimensions and at least two mounting holes |
| Placement | No modeled pad-edge or pad short issue |
| Routing | 100% modeled connectivity and no blocking training DRC errors |
| DRC | No modeled DRC errors/warnings and no training ERC error |
| BOM | **External approval only**; orderable MPN/rating, libraries, substitutions |
| Gerber | **External approval only**; generate and independently inspect KiCad fabrication outputs |
| Manufacturing | **External approval only**; supplier DFM, electrical/assembly inspection and prototype sign-off |

In particular, **nine of twelve "complete" stages for the routed LED example do not mean it is ready for real manufacture**. The original PCB editor contains approximate training geometry and libraries; actual device pinouts, masks, copper rules, stackup and source ratings must be separately verified.

## Safety limits

- Supported project voltage: isolated 1–24 V only. This does not model mains, high-energy batteries, USB-C negotiation, regulated battery charging, electromagnetic interference, or high-speed channel design.
- USB-C and five-pin regulator design templates contain abstract conceptual parts and are deliberately not fabrication-qualified.
- The training calculations approximate ideal DC LED behavior; verify thermal derating, supplier tolerances and supply limits using actual datasheets.
- E12 selection minimises the log ratio to ideal resistance, not necessarily the worst-case conservative current. Use official component ratings.
- KiCad-format PCB export is educational and must be opened/validated with actual KiCad ERC/DRC; **real Gerber and Excellon files are not fabricated or supplied by BOARD//LAB**.
- Pantech content, recordings, enrollment, financial terms, and certification are outside this repository.

## Tests

Run npm run check or npm test. New tests are tests/pcb-journey.test.js (pure planning/model/drc/erc/external gates) and tests/pcb-journey-ui.test.js (browser-interface smoke test, calculator, link to PCB Studio and six export functions). These tests assert no manufacturing sign-off is returned from the application.

For an engineering acceptance check on real hardware, use manufacturer-specific datasheets and qualified KiCad libraries; request fabricator stackup and DFM; run real native KiCad/ERC/DRC and CAM Gerber inspection; and record physical prototype measurements and uncertainty. These requirements cannot be replaced by a browser training score.

## Source provenance

The educational sequence and code are original BOARD//LAB implementations of public, standard PCB-design stages. The linked Pantech course is an independent optional learning resource. No official relationship, integration, agency or content license has been claimed.
