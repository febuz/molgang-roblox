// Molgang + Slakkenspoor — Brand Logo System
export default function MolLogo() {
  return (
    <div style={{
      background: "#0b0f0e",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 64,
      padding: 40,
      fontFamily: "'system-ui', sans-serif",
    }}>

      {/* === MOLGANG PRIMARY LOGO === */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#1a9966", marginBottom: 4 }}>
          PRIMARY BRAND MARK
        </div>

        <svg width="520" height="160" viewBox="0 0 520 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hexagon molecular structure — background */}
          {[
            [56, 80], [78, 43], [122, 43], [144, 80], [122, 117], [78, 117]
          ].map(([x, y], i, arr) => (
            <line key={i}
              x1={x} y1={y}
              x2={arr[(i+1)%6][0]} y2={arr[(i+1)%6][1]}
              stroke="#1a9966" strokeWidth="1.5" strokeOpacity="0.4"
            />
          ))}
          {/* Inner hexagon dots */}
          {[
            [56,80],[78,43],[122,43],[144,80],[122,117],[78,117]
          ].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="#1a9966" opacity="0.6"/>
          ))}
          {/* Center atom */}
          <circle cx="100" cy="80" r="18" fill="#0d1f1a" stroke="#22c55e" strokeWidth="2"/>
          <text x="100" y="85" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="bold" fontFamily="monospace">mol</text>

          {/* Orbiting electron dots */}
          <ellipse cx="100" cy="80" rx="32" ry="12" stroke="#1a9966" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" transform="rotate(-30 100 80)"/>
          <circle cx="132" cy="66" r="3" fill="#7ecf5a"/>
          <ellipse cx="100" cy="80" rx="32" ry="12" stroke="#1a9966" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" transform="rotate(90 100 80)"/>
          <circle cx="100" cy="112" r="3" fill="#7ecf5a"/>

          {/* MOL animal silhouette integrated — subtle */}
          {/* Mole body (rounded) */}
          <ellipse cx="100" cy="92" rx="14" ry="9" fill="#0d4a2e" opacity="0.8"/>
          {/* Snout */}
          <ellipse cx="112" cy="91" rx="5" ry="4" fill="#0d4a2e" opacity="0.8"/>
          <circle cx="114" cy="90" r="1.5" fill="#22c55e" opacity="0.9"/>
          {/* Ears */}
          <ellipse cx="92" cy="84" rx="4" ry="3" fill="#0d4a2e" opacity="0.8" transform="rotate(-20 92 84)"/>

          {/* MEASUREMENT SCALE — right side of hex */}
          <line x1="158" y1="60" x2="158" y2="100" stroke="#1a9966" strokeWidth="1.5" opacity="0.6"/>
          {[60,70,80,90,100].map((y,i) => (
            <line key={i} x1="158" y1={y} x2={i===2?"166":"162"} y2={y} stroke="#1a9966" strokeWidth="1" opacity="0.6"/>
          ))}
          <text x="170" y="64" fill="#4a9966" fontSize="7" fontFamily="monospace">mmol</text>
          <text x="170" y="84" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">g</text>
          <text x="170" y="104" fill="#4a9966" fontSize="7" fontFamily="monospace">ton</text>
          {/* Arrow up scale */}
          <polygon points="158,56 154,62 162,62" fill="#1a9966" opacity="0.6"/>

          {/* LOGOTYPE */}
          <text x="190" y="75" fill="#f4f9f6" fontSize="46" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-2">
            MOL
          </text>
          <text x="190" y="118" fill="#22c55e" fontSize="46" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-2">
            GANG
          </text>

          {/* Blockchain chain link decoration */}
          {[0,1,2,3,4].map(i => (
            <g key={i} transform={`translate(${388 + i*22}, 76)`}>
              <rect x="-7" y="-5" width="14" height="10" rx="5"
                fill="none" stroke="#1a9966" strokeWidth="1.5" opacity={0.3 + i*0.15}/>
              {i < 4 && <line x1="7" y1="0" x2="15" y2="0" stroke="#1a9966" strokeWidth="1.2" opacity="0.4"/>}
            </g>
          ))}

          {/* Tagline */}
          <text x="190" y="138" fill="#4a7a6a" fontSize="9" fontFamily="monospace" letterSpacing="3">
            DIGITALE MOLECULAIRE REGISTRATIE
          </text>
          {/* XRP + Lightning badge */}
          <rect x="388" y="126" width="45" height="16" rx="3" fill="#1a2d3e" stroke="#2a9acc" strokeWidth="0.8"/>
          <text x="410" y="137" textAnchor="middle" fill="#2a9acc" fontSize="7" fontFamily="monospace" fontWeight="bold">XRPL</text>
          <rect x="436" y="126" width="45" height="16" rx="3" fill="#1a2d1a" stroke="#f59e0b" strokeWidth="0.8"/>
          <text x="458" y="137" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">⚡ LN</text>
        </svg>
      </div>

      {/* === SLAKKENSPOOR LOGO === */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#c8941a", marginBottom: 4 }}>
          SECONDARY BRAND — PHYSICAL TRACK
        </div>

        <svg width="520" height="130" viewBox="0 0 520 130" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Snail shell spiral */}
          {[1,2,3,4,5].map(i => (
            <circle key={i} cx="80" cy="65"
              r={i * 10} fill="none"
              stroke="#c8941a" strokeWidth={2.5 - i*0.35}
              strokeDasharray={`${i*8},${i*3}`}
              opacity={0.8 - i*0.1}
            />
          ))}
          {/* Snail body */}
          <path d="M80 95 Q100 108 115 100 Q128 92 120 82 Q115 75 105 78 Q95 70 88 75 Q80 80 80 95Z"
            fill="#5c3a0a" opacity="0.85"/>
          {/* Eye stalks */}
          <line x1="108" y1="79" x2="112" y2="68" stroke="#c8941a" strokeWidth="1.5"/>
          <circle cx="113" cy="67" r="2.5" fill="#f59e0b"/>
          <line x1="103" y1="77" x2="105" y2="65" stroke="#c8941a" strokeWidth="1.5"/>
          <circle cx="106" cy="64" r="2.5" fill="#f59e0b"/>
          {/* Shell highlight */}
          <circle cx="72" cy="57" r="3" fill="#f59e0b" opacity="0.4"/>

          {/* Trail dots — the "spoor" */}
          {[130,148,166,184,202].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={72 + (i%2)*6} r={3-i*0.4} fill="#c8941a" opacity={0.7-i*0.1}/>
              {i < 4 && <line x1={x+3} y1={72+(i%2)*6} x2={x+15} y2={72+((i+1)%2)*6}
                stroke="#c8941a" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.4"/>}
            </g>
          ))}

          {/* LOGOTYPE */}
          <text x="215" y="58" fill="#f4f9f6" fontSize="34" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-1">
            SLAKKEN
          </text>
          <text x="215" y="95" fill="#c8941a" fontSize="34" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-1">
            SPOOR
          </text>

          {/* Tagline */}
          <text x="215" y="115" fill="#7a6530" fontSize="9" fontFamily="monospace" letterSpacing="3">
            CIRCULAIRE METALLURGIE &amp; BIOSTIMULANTEN
          </text>

          {/* CO2 + N badges */}
          <rect x="420" y="42" width="40" height="16" rx="3" fill="#0d1f1a" stroke="#22c55e" strokeWidth="0.8"/>
          <text x="440" y="53" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">CO2</text>
          <rect x="420" y="62" width="40" height="16" rx="3" fill="#1a0d2e" stroke="#a855f7" strokeWidth="0.8"/>
          <text x="440" y="73" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="monospace" fontWeight="bold">N mol</text>
          <rect x="420" y="82" width="40" height="16" rx="3" fill="#1a2d1a" stroke="#c8941a" strokeWidth="0.8"/>
          <text x="440" y="93" textAnchor="middle" fill="#c8941a" fontSize="8" fontFamily="monospace" fontWeight="bold">Fe V Si</text>
        </svg>
      </div>

      {/* === COMBINED LOCK-UP === */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#5a7a6a", marginBottom: 4 }}>
          COMBINED HOLDING LOCK-UP
        </div>

        <svg width="520" height="100" viewBox="0 0 520 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* VirtualV Holding umbrella */}
          <text x="260" y="18" textAnchor="middle" fill="#5a7a6a" fontSize="9" fontFamily="monospace" letterSpacing="4">
            VIRTUALV HOLDING B.V.
          </text>
          <path d="M80 25 Q260 10 440 25" stroke="#1e2d28" strokeWidth="1" fill="none"/>

          {/* Molgang pill */}
          <rect x="20" y="35" width="180" height="40" rx="8" fill="#0d1f1a" stroke="#22c55e" strokeWidth="1.5"/>
          {/* Mini mol */}
          <circle cx="50" cy="55" r="12" fill="none" stroke="#1a9966" strokeWidth="1" opacity="0.5"/>
          <text x="50" y="58" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="monospace" fontWeight="bold">mol</text>
          <text x="110" y="52" textAnchor="middle" fill="#f4f9f6" fontSize="18" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-1">MOLGANG</text>
          <text x="110" y="66" textAnchor="middle" fill="#1a9966" fontSize="7" fontFamily="monospace">digital · blockchain · fintech</text>

          {/* connector */}
          <line x1="200" y1="55" x2="230" y2="55" stroke="#1e2d28" strokeWidth="1.5"/>
          <text x="260" y="59" textAnchor="middle" fill="#374151" fontSize="16" fontWeight="bold">×</text>
          <line x1="290" y1="55" x2="320" y2="55" stroke="#1e2d28" strokeWidth="1.5"/>

          {/* Slakkenspoor pill */}
          <rect x="320" y="35" width="180" height="40" rx="8" fill="#1a0f00" stroke="#c8941a" strokeWidth="1.5"/>
          {/* Mini snail */}
          {[1,2,3].map(i => (
            <circle key={i} cx="348" cy="55" r={i*4.5} fill="none"
              stroke="#c8941a" strokeWidth={1.5-i*0.3} opacity={0.7-i*0.15}/>
          ))}
          <text x="420" y="52" textAnchor="middle" fill="#f4f9f6" fontSize="14" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-1">SLAKKEN</text>
          <text x="420" y="66" textAnchor="middle" fill="#c8941a" fontSize="14" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" letterSpacing="-1">SPOOR</text>

          {/* bottom tagline */}
          <text x="260" y="92" textAnchor="middle" fill="#374151" fontSize="8" fontFamily="monospace" letterSpacing="2">
            FROM SLAG TO BLOCKCHAIN — CIRCULAR ECONOMY AT MOLECULAR PRECISION
          </text>
        </svg>
      </div>

      {/* === ICON VERSIONS === */}
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#374151" }}>Icon marks:</div>

        {/* Molgang icon */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="12" fill="#0d1f1a"/>
          {[0,1,2,3,4,5].map(i => {
            const a = i * Math.PI / 3;
            const x = 32 + 22 * Math.cos(a);
            const y = 32 + 22 * Math.sin(a);
            const nx = 32 + 22 * Math.cos(a + Math.PI/3);
            const ny = 32 + 22 * Math.sin(a + Math.PI/3);
            return <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke="#1a9966" strokeWidth="1.5" opacity="0.5"/>;
          })}
          <circle cx="32" cy="32" r="12" fill="#0a1810" stroke="#22c55e" strokeWidth="1.5"/>
          <text x="32" y="36" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold" fontFamily="monospace">mol</text>
        </svg>

        {/* Slakkenspoor icon */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="12" fill="#1a0f00"/>
          {[1,2,3,4].map(i => (
            <circle key={i} cx="32" cy="32" r={i*7} fill="none"
              stroke="#c8941a" strokeWidth={1.8-i*0.3} strokeDasharray={`${i*6},${i*2}`} opacity={0.8-i*0.1}/>
          ))}
          <circle cx="32" cy="32" r="5" fill="#c8941a" opacity="0.9"/>
        </svg>

        {/* Molgang app icon round */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#0d1f1a"/>
          <circle cx="32" cy="32" r="28" fill="none" stroke="#1a9966" strokeWidth="0.8" opacity="0.3"/>
          <ellipse cx="32" cy="32" rx="20" ry="8" fill="none" stroke="#1a9966" strokeWidth="1" strokeDasharray="3,2" opacity="0.4" transform="rotate(-30 32 32)"/>
          <ellipse cx="32" cy="32" rx="20" ry="8" fill="none" stroke="#1a9966" strokeWidth="1" strokeDasharray="3,2" opacity="0.4" transform="rotate(90 32 32)"/>
          <circle cx="32" cy="32" r="10" fill="#0a1810" stroke="#22c55e" strokeWidth="1.5"/>
          <text x="32" y="36" textAnchor="middle" fill="#7ecf5a" fontSize="11" fontWeight="bold" fontFamily="monospace">M</text>
        </svg>

        <div style={{ color: "#374151", fontSize: 12, maxWidth: 160, lineHeight: 1.6 }}>
          App icon · Favicon · 
          Social media avatar · 
          Letterhead mark
        </div>
      </div>

      {/* Colour palette */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#374151" }}>Kleurpalet:</div>
        {[
          ["#0d1f1a","Molgang Ink"],["#22c55e","Mol Green"],["#7ecf5a","Lime"],
          ["#1a9966","Forest"],["#c8941a","Slag Gold"],["#a855f7","Nitrogen"],
          ["#2a9acc","XRP Blue"],["#f59e0b","Lightning"],
        ].map(([col, name]) => (
          <div key={col} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: col, border: "1px solid #1e2d28" }}/>
            <div style={{ fontSize: 8, color: "#4a5568", fontFamily: "monospace", textAlign: "center", maxWidth: 40 }}>{name}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
