import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const IntelligentNetworkGraphic: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="w-full overflow-hidden select-none bg-transparent" aria-hidden="true">
      {/* Masterpiece Architectural SVG: City Gate, SCADA Grid, Modern Station & Drive-Through Refill */}
      <div className="relative w-full h-[175px] sm:h-[185px]">
        <svg
          viewBox="0 0 220 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Canopy Architectural Downlight Cone */}
            <linearGradient id="canopyLightCone" x1="48" y1="94" x2="48" y2="138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5EEAD4" stopOpacity="0.16" />
              <stop offset="0.75" stopColor="#0A9396" stopOpacity="0.04" />
              <stop offset="1" stopColor="#0B1320" stopOpacity="0" />
            </linearGradient>

            {/* Pipeline Stream Gradient */}
            <linearGradient id="streamGrad" x1="40" y1="48" x2="200" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0A9396" />
              <stop offset="0.5" stopColor="#5EEAD4" />
              <stop offset="1" stopColor="#2DD4BF" />
            </linearGradient>

            {/* Vehicle Glass Gradient */}
            <linearGradient id="glassGrad" x1="68" y1="126" x2="84" y2="130" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5EEAD4" stopOpacity="0.45" />
              <stop offset="1" stopColor="#0A9396" stopOpacity="0.12" />
            </linearGradient>

            {/* Vehicle Headlamp Beam Spread */}
            <linearGradient id="headlightBeam" x1="51" y1="132" x2="24" y2="132" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5EEAD4" stopOpacity="0.35" />
              <stop offset="1" stopColor="#5EEAD4" stopOpacity="0" />
            </linearGradient>

            {/* Technical Sub-Grid for GIS / CAD styling */}
            <pattern id="cadGrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1E293B" strokeWidth="0.4" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* Sub-grid background */}
          <rect x="0" y="0" width="220" height="160" fill="url(#cadGrid)" />

          {/* ========================================================= */}
          {/* 1. UPSTREAM GAS INFRASTRUCTURE (Right: City Gate & Mast)  */}
          {/* ========================================================= */}

          {/* City Gate Skid Foundation */}
          <rect x="146" y="135" width="60" height="3" rx="0.5" fill="#0A1826" stroke="#1E293B" strokeWidth="0.6" />

          {/* SCADA Telemetry Lattice Tower Mast */}
          <line x1="198" y1="84" x2="198" y2="135" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="194" y1="135" x2="198" y2="108" stroke="#334155" strokeWidth="0.6" />
          <line x1="202" y1="135" x2="198" y2="108" stroke="#334155" strokeWidth="0.6" />
          <line x1="195" y1="98" x2="201" y2="98" stroke="#334155" strokeWidth="0.6" />
          <line x1="196" y1="88" x2="200" y2="88" stroke="#5EEAD4" strokeWidth="0.8" />
          {/* Mast Tip Blinking Beacon */}
          <circle cx="198" cy="84" r="1.4" fill="#5EEAD4" className="cng-beacon-blink" />

          {/* Pressure Regulating & Metering Enclosure (City Gate) */}
          <rect x="150" y="119" width="38" height="16" rx="1.5" fill="#071924" stroke="#004D5A" strokeWidth="0.8" />
          {/* Industrial Manifold Pipes */}
          <path d="M 144 132 L 150 132 M 188 128 L 195 128" stroke="#0A9396" strokeWidth="1.2" />
          {/* High-Pressure Separator Column */}
          <rect x="154" y="113" width="6" height="22" rx="2" fill="#08222F" stroke="#0A9396" strokeWidth="0.8" />
          <line x1="157" y1="117" x2="157" y2="131" stroke="#5EEAD4" strokeWidth="0.5" strokeOpacity="0.5" />
          {/* Dial Gauge */}
          <circle cx="157" cy="111" r="1.6" fill="#071924" stroke="#5EEAD4" strokeWidth="0.6" />
          {/* Unit Identification Label */}
          <text x="163" y="127" fill="#94D2BD" fontSize="4.2" fontFamily="monospace" fontWeight="600">
            CITY GATE
          </text>
          <text x="163" y="132" fill="#2DD4BF" fontSize="3.8" fontFamily="monospace">
            STATION
          </text>

          {/* ========================================================= */}
          {/* 2. REGIONAL PIPELINE TRANSMISSION GRID (Overhead Flow)    */}
          {/* ========================================================= */}

          {/* Static Pipeline Foundation Paths */}
          <path d="M 198 84 C 194 56, 182 38, 168 32" stroke="#003845" strokeWidth="1.1" fill="none" />
          <path d="M 168 32 C 146 26, 134 23, 116 22" stroke="#003845" strokeWidth="1.1" fill="none" />
          <path d="M 116 22 C 88 26, 68 36, 48 48" stroke="#003845" strokeWidth="1.1" fill="none" />
          <path d="M 168 32 C 182 40, 192 46, 198 56" stroke="#003845" strokeWidth="1.1" fill="none" />
          <path d="M 116 22 C 124 38, 132 50, 142 64" stroke="#003845" strokeWidth="1.1" fill="none" />
          <path d="M 142 64 C 166 62, 184 58, 198 56" stroke="#003845" strokeWidth="1.1" fill="none" />
          {/* Delivery Spur to Retail CNG Canopy */}
          <path d="M 48 48 C 48 64, 42 84, 38 111" stroke="#003845" strokeWidth="1" strokeDasharray="2 2" fill="none" />

          {/* Animated Energy Pulses Along Regional Transmission Lines */}
          <g className={reducedMotion ? '' : 'cng-stream-group'}>
            <path
              d="M 198 84 C 194 56, 182 38, 168 32"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 168 32 C 146 26, 134 23, 116 22"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 116 22 C 88 26, 68 36, 48 48"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 168 32 C 182 40, 192 46, 198 56"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 116 22 C 124 38, 132 50, 142 64"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 142 64 C 166 62, 184 58, 198 56"
              stroke="url(#streamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Regional SCADA Grid Nodes */}
          {/* Station Hub Node */}
          <g transform="translate(48, 48)">
            {!reducedMotion && (
              <circle r="4.5" stroke="#5EEAD4" strokeWidth="0.8" fill="none" opacity="0.3" className="cng-node-pulse" />
            )}
            <circle r="2.2" fill="#005F73" stroke="#5EEAD4" strokeWidth="0.8" />
            <circle r="0.8" fill="#FFFFFF" />
            <text x="5" y="-3" fill="#94D2BD" fontSize="5" fontFamily="monospace" fontWeight="600">
              HUB
            </text>
          </g>

          {/* Node N-01 (North Backbone) */}
          <g transform="translate(116, 22)">
            {!reducedMotion && (
              <circle r="4" stroke="#2DD4BF" strokeWidth="0.8" fill="none" opacity="0.3" className="cng-node-pulse" style={{ animationDelay: '0.7s' }} />
            )}
            <circle r="2" fill="#0A9396" stroke="#2DD4BF" strokeWidth="0.8" />
            <circle r="0.7" fill="#FFFFFF" />
            <text x="-6" y="-5" fill="#94D2BD" fontSize="4.8" fontFamily="monospace">
              N-01
            </text>
          </g>

          {/* Regional Hub Node */}
          <g transform="translate(168, 32)">
            {!reducedMotion && (
              <circle r="4.5" stroke="#5EEAD4" strokeWidth="0.8" fill="none" opacity="0.35" className="cng-node-pulse" style={{ animationDelay: '1.2s' }} />
            )}
            <circle r="2.2" fill="#005F73" stroke="#5EEAD4" strokeWidth="0.8" />
            <circle r="0.8" fill="#FFFFFF" />
            <text x="5" y="-3" fill="#94D2BD" fontSize="4.8" fontFamily="monospace" fontWeight="600">
              GRID
            </text>
          </g>

          {/* Node N-02 (East Ring) */}
          <g transform="translate(198, 56)">
            {!reducedMotion && (
              <circle r="4" stroke="#94D2BD" strokeWidth="0.8" fill="none" opacity="0.3" className="cng-node-pulse" style={{ animationDelay: '1.9s' }} />
            )}
            <circle r="2" fill="#005F73" stroke="#94D2BD" strokeWidth="0.8" />
            <circle r="0.7" fill="#FFFFFF" />
            <text x="-9" y="8" fill="#94D2BD" fontSize="4.8" fontFamily="monospace">
              N-02
            </text>
          </g>

          {/* Node N-03 (Central Cross-Feeder) */}
          <g transform="translate(142, 64)">
            {!reducedMotion && (
              <circle r="3.5" stroke="#2DD4BF" strokeWidth="0.8" fill="none" opacity="0.3" className="cng-node-pulse" style={{ animationDelay: '1.5s' }} />
            )}
            <circle r="1.8" fill="#0A9396" stroke="#2DD4BF" strokeWidth="0.8" />
            <text x="-16" y="2" fill="#94D2BD" fontSize="4.8" fontFamily="monospace">
              N-03
            </text>
          </g>

          {/* ========================================================= */}
          {/* 3. ROADWAY & GROUND BASELINE                              */}
          {/* ========================================================= */}

          {/* Ground Baseline Datum */}
          <line x1="6" y1="138" x2="214" y2="138" stroke="#1E293B" strokeWidth="1.2" />
          {/* Station Forecourt Slab (Left) */}
          <rect x="12" y="137" width="80" height="2" fill="#142636" />
          {/* Road Curb & Lane Markings (Right) */}
          <line x1="92" y1="139" x2="214" y2="139" stroke="#004D5A" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="96" y1="147" x2="210" y2="147" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="6 8" />

          {/* ========================================================= */}
          {/* 4. RETAIL CNG REFUELING STATION ARCHITECTURE (Left)       */}
          {/* ========================================================= */}

          {/* Architectural Downlight Cone under Canopy */}
          <polygon points="18,94 12,138 86,138 80,94" fill="url(#canopyLightCone)" />

          {/* High-Pressure Cascade Storage Vessels (Left of Columns) */}
          <g>
            <rect x="16" y="104" width="4.2" height="33" rx="2" fill="#061822" stroke="#005F73" strokeWidth="0.8" />
            <line x1="18.1" y1="108" x2="18.1" y2="132" stroke="#0A9396" strokeWidth="0.5" strokeOpacity="0.6" />
            <circle cx="18.1" cy="103" r="1" fill="#5EEAD4" />

            <rect x="21" y="107" width="4.2" height="30" rx="2" fill="#08222F" stroke="#0A9396" strokeWidth="0.8" />
            <line x1="23.1" y1="111" x2="23.1" y2="132" stroke="#5EEAD4" strokeWidth="0.5" strokeOpacity="0.6" />
            <circle cx="23.1" cy="106" r="1" fill="#2DD4BF" />
          </g>

          {/* Canopy Structural Columns (Clean, balanced height) */}
          <line x1="26" y1="94" x2="26" y2="138" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="74" y1="94" x2="74" y2="138" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />

          {/* Modern Cantilever Canopy Roof */}
          <path
            d="M 14 94 L 84 94 L 88 87 L 18 87 Z"
            fill="#06222E"
            stroke="#005F73"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          {/* Fascia Trim & Brand LED Strip */}
          <line x1="18" y1="87" x2="88" y2="87" stroke="#0A9396" strokeWidth="1.3" />
          <line x1="16" y1="94.5" x2="82" y2="94.5" stroke="#5EEAD4" strokeWidth="1.2" strokeOpacity="0.95" />

          {/* Modern CNG Dispenser Island */}
          <g>
            {/* Raised concrete island curb */}
            <rect x="33" y="135.5" width="16" height="2.5" rx="0.8" fill="#1E293B" stroke="#334155" strokeWidth="0.5" />
            {/* Dispenser unit body */}
            <rect x="36" y="111" width="10" height="25" rx="1.5" fill="#071923" stroke="#0A9396" strokeWidth="1.1" />
            {/* Brand division stripe */}
            <line x1="36" y1="115" x2="46" y2="115" stroke="#005F73" strokeWidth="0.8" />
            {/* Digital LED readout display screen */}
            <rect x="37.5" y="117" width="7" height="5.5" rx="0.6" fill="#5EEAD4" fillOpacity="0.85" />
            {/* Operational status light */}
            <circle cx="43.5" cy="113.5" r="0.7" fill="#2DD4BF" />

            {/* Idle Docked Fueling Hose (resting on pump when car moves) */}
            <path
              d="M 46 125 C 48 127 48 132 46.5 135"
              fill="none"
              stroke="#0A9396"
              strokeWidth="0.9"
              className={reducedMotion ? 'hidden' : 'cng-hose-docked'}
            />

            {/* Active Fueling Hose (connected to vehicle during ~3s refill) */}
            <g className={reducedMotion ? '' : 'cng-hose-active'}>
              <path
                d="M 46 125 C 50.5 125 51.5 131 55 131.5"
                fill="none"
                stroke="#5EEAD4"
                strokeWidth="1"
                strokeDasharray="2 1.5"
                className={reducedMotion ? '' : 'cng-fuel-stream'}
              />
            </g>
          </g>

          {/* ========================================================= */}
          {/* 5. DYNAMIC VEHICLE CYCLE ANIMATION (Arrival, Refill, Exit) */}
          {/* ========================================================= */}
          <g className={reducedMotion ? '' : 'cng-car-mover'}>
            {/* Ground Shadow */}
            <ellipse cx="73" cy="137.5" rx="20" ry="1.3" fill="#000000" opacity="0.6" />

            {/* Forward Headlight Beam Projection */}
            <polygon points="51,132 24,124 24,138" fill="url(#headlightBeam)" opacity="0.3" />

            {/* Aerodynamic Vehicle Body Contour */}
            <path
              d="M 53 134.5 L 56 134.5 L 58.5 131 L 65 131 L 67.5 134.5 L 79.5 134.5 L 82 131 L 87.5 131 L 90 134.5 L 93 134.5 C 94.5 134.5 95 133 94 130.5 L 91 126.5 C 89.5 125 86 124.5 83.5 124.5 L 71 124.5 C 67.5 124.5 62.5 127 59 129 L 54.5 131.5 C 52.5 132.5 52 134.5 53 134.5 Z"
              fill="#0D2633"
              stroke="#2DD4BF"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />

            {/* Tinted Aerodynamic Glass */}
            <path
              d="M 68 126 L 82 126 L 88 127.5 L 84 130 L 66 130 Z"
              fill="url(#glassGrad)"
              stroke="#5EEAD4"
              strokeWidth="0.4"
              strokeOpacity="0.8"
            />

            {/* Headlamp Accent */}
            <line x1="53" y1="132" x2="51" y2="132" stroke="#5EEAD4" strokeWidth="1.4" strokeLinecap="round" />
            {/* Taillamp Accent */}
            <line x1="93" y1="131" x2="94.5" y2="131" stroke="#EE9B00" strokeWidth="1.4" strokeLinecap="round" />

            {/* Front Wheel (with rotating spokes!) */}
            <g transform="translate(61.5, 135.5)">
              <g className={reducedMotion ? '' : 'cng-wheel-roll'}>
                <circle cx="0" cy="0" r="4.2" fill="#080F18" stroke="#334155" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.6" fill="#5EEAD4" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#080F18" strokeWidth="0.8" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#080F18" strokeWidth="0.8" />
              </g>
            </g>

            {/* Rear Wheel (with rotating spokes!) */}
            <g transform="translate(84.5, 135.5)">
              <g className={reducedMotion ? '' : 'cng-wheel-roll'}>
                <circle cx="0" cy="0" r="4.2" fill="#080F18" stroke="#334155" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.6" fill="#5EEAD4" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#080F18" strokeWidth="0.8" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#080F18" strokeWidth="0.8" />
              </g>
            </g>

            {/* Fuel Inlet Port (active charging pulse while refilling!) */}
            <circle cx="55" cy="131" r="0.9" className={reducedMotion ? 'fill-[#5EEAD4]' : 'cng-fuel-port'} />
          </g>
        </svg>
      </div>

      {/* Embedded CSS Keyframes */}
      <style>{`
        /* Pipeline Energy Flow */
        @keyframes cngEnergyFlow {
          from {
            stroke-dashoffset: 18;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes cngNodePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.25);
            opacity: 0.65;
          }
        }
        @keyframes cngBeaconPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        /* Continuous Vehicle Drive & Refill Cycle (8s loop: arrives, refuels ~3s, departs, repeats) */
        @keyframes carMoveCycle {
          0% {
            transform: translateX(85px);
            opacity: 0;
          }
          4% {
            transform: translateX(70px);
            opacity: 1;
          }
          24% {
            transform: translateX(0px);
            opacity: 1;
          }
          62% {
            transform: translateX(0px);
            opacity: 1;
          }
          80% {
            transform: translateX(-75px);
            opacity: 1;
          }
          83% {
            transform: translateX(-88px);
            opacity: 0;
          }
          85% {
            transform: translateX(85px);
            opacity: 0;
          }
          100% {
            transform: translateX(85px);
            opacity: 0;
          }
        }

        /* Wheel Rotation: spins while moving, pauses while refilling */
        @keyframes wheelSpinCycle {
          0% {
            transform: rotate(0deg);
          }
          24% {
            transform: rotate(-1280deg);
          }
          62% {
            transform: rotate(-1280deg);
          }
          80% {
            transform: rotate(-2400deg);
          }
          83% {
            transform: rotate(-2400deg);
          }
          85% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        /* Refueling Hose Synchronization */
        @keyframes hoseActiveCycle {
          0%, 23.9% {
            opacity: 0;
          }
          24%, 62% {
            opacity: 1;
          }
          62.1%, 100% {
            opacity: 0;
          }
        }
        @keyframes hoseDockedCycle {
          0%, 23.9% {
            opacity: 1;
          }
          24%, 62% {
            opacity: 0;
          }
          62.1%, 100% {
            opacity: 1;
          }
        }
        @keyframes fuelStreamFlow {
          from {
            stroke-dashoffset: 14;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fuelPortPulse {
          0%, 23.9% {
            fill: #5EEAD4;
            opacity: 0.5;
          }
          24%, 62% {
            fill: #A7F3D0;
            opacity: 1;
          }
          62.1%, 100% {
            fill: #5EEAD4;
            opacity: 0.5;
          }
        }

        /* Animation Assignments */
        .cng-stream-group path {
          animation: cngEnergyFlow 4s linear infinite;
        }
        .cng-node-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: cngNodePulse 3.2s ease-in-out infinite;
        }
        .cng-beacon-blink {
          transform-box: fill-box;
          transform-origin: center;
          animation: cngBeaconPulse 2s ease-in-out infinite;
        }

        .cng-car-mover {
          animation: carMoveCycle 8s ease-in-out infinite;
        }
        .cng-wheel-roll {
          transform-origin: 0px 0px;
          animation: wheelSpinCycle 8s ease-in-out infinite;
        }
        .cng-hose-active {
          animation: hoseActiveCycle 8s step-end infinite;
        }
        .cng-hose-docked {
          animation: hoseDockedCycle 8s step-end infinite;
        }
        .cng-fuel-stream {
          animation: fuelStreamFlow 0.8s linear infinite;
        }
        .cng-fuel-port {
          animation: fuelPortPulse 8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .cng-stream-group path,
          .cng-node-pulse,
          .cng-beacon-blink,
          .cng-car-mover,
          .cng-wheel-roll,
          .cng-hose-active,
          .cng-hose-docked,
          .cng-fuel-stream,
          .cng-fuel-port {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
