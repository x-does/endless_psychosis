import { useId, type CSSProperties } from 'react';
import { UPGRADES } from './model';

type CharacterProps = {
  clarity: number;
  upgrades: Record<string, number>;
  pulse: number;
  reducedMotion: boolean;
};

/** Clarity is expressed on the game's 0–100 scale. */
export default function Character({ clarity, upgrades, pulse, reducedMotion }: CharacterProps) {
  const id = `ep-character-${useId().replace(/:/g, '')}`;
  const calm = Math.min(1, Math.max(0, Number.isFinite(clarity) ? clarity / 100 : 0));
  const totalUpgrades = Object.values(upgrades).reduce(
    (sum, count) => sum + (Number.isFinite(count) ? Math.max(0, count) : 0),
    0,
  );
  const growth = Math.min(1, totalUpgrades / 12);
  const stage = calm < 0.33 ? 'Overstimulated' : calm < 0.7 ? 'Finding balance' : 'Quietly enlightened';
  const style = {
    '--ep-character-calm': calm,
    '--ep-character-chaos': 1 - calm,
    '--ep-character-growth': growth,
  } as CSSProperties;

  return (
    <span className="ep-character" style={style} data-reduced-motion={reducedMotion || undefined}>
      <svg
        className="ep-character-art"
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        focusable="false"
      >
        <title id={`${id}-title`}>{`${stage}: your inner office human`}</title>
        <desc id={`${id}-description`}>
          {calm < 0.33
            ? 'A tired worker with a coffee and headset, surrounded by orbiting notifications.'
            : calm < 0.7
              ? 'A worker relaxing into a peaceful pose as notifications fade and a halo emerges.'
              : 'A serene, smiling human in a radiant lime halo, letting the digital noise drift away.'}
          {UPGRADES.filter(u => upgrades[u.id] > 0).map(u => ` ${u.appearance} Level ${upgrades[u.id]}.`).join('')}
        </desc>
        <defs>
          <radialGradient id={`${id}-scene`} cx="50%" cy="41%" r="67%">
            <stop offset="0%" stopColor="#35384f" />
            <stop offset="65%" stopColor="#202839" />
            <stop offset="100%" stopColor="#141b29" />
          </radialGradient>
          <radialGradient id={`${id}-aura`}>
            <stop offset="0%" stopColor="#d9fa78" stopOpacity=".32" />
            <stop offset="65%" stopColor="#d9fa78" stopOpacity=".08" />
            <stop offset="100%" stopColor="#d9fa78" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#bba5ff" />
            <stop offset="100%" stopColor="#7974b2" />
          </linearGradient>
          <linearGradient id={`${id}-skin`} x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#f5cfb7" />
            <stop offset="100%" stopColor="#dba48f" />
          </linearGradient>
          <pattern id={`${id}-grid`} width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke="#bba5ff" strokeOpacity=".075" strokeWidth=".7" />
          </pattern>
          <pattern id={`${id}-grain`} width="9" height="11" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r=".55" fill="#fff" opacity=".06" />
            <circle cx="7" cy="8" r=".6" fill="#000" opacity=".12" />
          </pattern>
          <clipPath id={`${id}-circle`}><circle cx="200" cy="200" r="181" /></clipPath>
        </defs>
        <g aria-hidden="true">
          <circle cx="200" cy="200" r="187" fill="none" stroke="#bba5ff" strokeOpacity=".12" />
          <circle cx="200" cy="200" r="181" fill={`url(#${id}-scene)`} />
          <g clipPath={`url(#${id}-circle)`}>
            <path fill={`url(#${id}-grid)`} d="M19 19h362v362H19z" />
            <circle className="ep-character-aura" cx="200" cy="179" r="160" fill={`url(#${id}-aura)`} />
            <g className="ep-character-orbits" fill="none" stroke="#bba5ff" strokeOpacity=".19">
              <ellipse cx="200" cy="206" rx="160" ry="66" transform="rotate(-27 200 206)" />
              <ellipse cx="200" cy="206" rx="159" ry="87" transform="rotate(43 200 206)" strokeDasharray="2 9" />
              <circle cx="200" cy="200" r="143" strokeOpacity=".1" />
            </g>
            <g className="ep-character-stars" fill="#d9fa78">
              <path d="m103 109 3-9 3 9 9 3-9 3-3 9-3-9-9-3zM294 244l2-6 2 6 6 2-6 2-2 6-2-6-6-2z" />
              <circle cx="279" cy="92" r="2" /><circle cx="84" cy="230" r="1.8" />
              <circle cx="312" cy="170" r="1.6" /><circle cx="132" cy="67" r="1.4" />
            </g>
            <ellipse cx="200" cy="345" rx="107" ry="16" fill="#0d1320" opacity=".65" />
            <g className="ep-character-foliage" fill="#a8c66e" stroke="#536e50" strokeWidth="2" strokeLinecap="round">
              <path d="M112 340Q73 305 73 258M288 340q39-35 39-82" fill="none" />
              <path d="M84 303q-34-1-31-28 27 2 31 28ZM76 281q-10-29 13-40 12 24-13 40ZM102 326q-35 6-38-17 26-7 38 17ZM316 303q34-1 31-28-27 2-31 28ZM324 281q10-29-13-40-12 24 13 40ZM298 326q35 6 38-17-26-7-38 17Z" />
            </g>
            <g key={pulse} className={pulse > 0 ? 'ep-character-tap' : undefined}>
              <g className="ep-character-human">
                <g className="ep-character-halo" fill="none" stroke="#d9fa78">
                  <circle cx="200" cy="170" r="79" strokeOpacity=".18" strokeWidth="17" />
                  <circle cx="200" cy="170" r="79" strokeOpacity=".7" strokeWidth="1.5" />
                  <path d="M200 75v-9m0 207v-9M105 170h-9m208 0h-9M133 103l-6-6m146 146-6-6m0-134 6-6M127 243l6-6" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
                </g>
                <path d="M124 337q-7-60 16-81 20-19 60-19t60 19q23 21 16 81Z" fill={`url(#${id}-shirt)`} stroke="#141b29" strokeWidth="3" />
                <path className="ep-character-robe" d="m163 245 37 54 37-54q33 6 38 46l1 46H124l1-46q5-40 38-46Z" fill="#d9fa78" />
                <path d="M181 222v23q19 21 38 0v-23" fill={`url(#${id}-skin)`} stroke="#141b29" strokeWidth="3" />
                <path d="m171 247 29 42 29-42M200 289v49" fill="none" stroke="#141b29" strokeOpacity=".3" strokeWidth="2" />
                <g className="ep-character-tie">
                  <path d="m192 267 8-9 8 9-5 10 7 35-10 12-10-12 7-35Z" fill="#373b57" />
                  <path d="m167 245 25 22-10 12-23-31m74-3-25 22 10 12 23-31" fill="#d2c5f6" />
                </g>
                <path d="M154 170c-20-11-23 27-4 30m96-30c20-11 23 27 4 30" fill="#dba48f" stroke="#141b29" strokeWidth="3" />
                <path d="M150 151q0-54 50-54t50 54l-4 45q-5 43-46 45-41-2-46-45Z" fill={`url(#${id}-skin)`} stroke="#141b29" strokeWidth="3" />
                <path d="M149 170q-12-38 1-59 12-23 43-22l-5-10q25-1 36 14 34-2 36 36 1 23-10 42l-6-35q-24 2-43-18-17 23-44 22Z" fill="#222735" stroke="#141b29" strokeLinejoin="round" strokeWidth="3" />
                <path d="M160 115q13-15 30-13m23 0q20 6 29 24" fill="none" stroke="#45465b" strokeWidth="4" strokeLinecap="round" />
                <g className="ep-character-tired-face" stroke="#56424a" strokeLinecap="round" fill="none">
                  <path d="m166 160 17 3m34 0 17-3" strokeWidth="3" />
                  <path d="M165 179q10-8 20 0m30 0q10-8 20 0" strokeWidth="2" />
                  <path d="M166 188q9 6 17 1m34 0q9 5 17-1" stroke="#b67e83" strokeWidth="2" />
                  <path d="M187 216q13-7 26 0" strokeWidth="2.5" />
                  <path d="M175 175v6m50-6v6" strokeWidth="4" />
                </g>
                <g className="ep-character-calm-face" stroke="#56424a" strokeLinecap="round" fill="none">
                  <path d="M165 161q10-5 20 0m30 0q10-5 20 0" strokeWidth="2" />
                  <path d="M165 179q10 10 20 0m30 0q10 10 20 0" strokeWidth="3" />
                  <path d="M187 209q13 15 26 0" strokeWidth="2.5" />
                  <ellipse cx="168" cy="195" rx="9" ry="4" fill="#d18e8c" stroke="none" opacity=".45" />
                  <ellipse cx="232" cy="195" rx="9" ry="4" fill="#d18e8c" stroke="none" opacity=".45" />
                </g>
                <path d="m199 180-4 16h8" fill="none" stroke="#bc8b7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <g className="ep-character-headset" fill="none" stroke="#bba5ff" strokeWidth="5" strokeLinecap="round">
                  <path d="M145 177v-30q0-55 55-55t55 55v30" />
                  <path d="M254 190v10q0 12-31 12" strokeWidth="3" />
                  <rect x="139" y="165" width="12" height="28" rx="6" fill="#69658e" stroke="#242a3d" strokeWidth="2" />
                  <rect x="249" y="165" width="12" height="28" rx="6" fill="#69658e" stroke="#242a3d" strokeWidth="2" />
                  <path d="M219 212h7" stroke="#242a3d" />
                </g>
                <path d="M141 280q-13 25 3 35l36 9m79-44q13 25-3 35l-36 9" fill="none" stroke="#141b29" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
                <path d="M144 311q10-7 20-1l24 8q6 10-5 13l-28-5m101-15q-10-7-20-1l-24 8q-6 10 5 13l28-5" fill={`url(#${id}-skin)`} stroke="#141b29" strokeWidth="2.5" />
                <g className="ep-character-coffee">
                  <path d="M126 293h26l-3 29h-20Z" fill="#e0dbcd" stroke="#141b29" strokeWidth="2" />
                  <path d="M152 297h5q10 10-7 15" fill="none" stroke="#e0dbcd" strokeWidth="4" />
                  <path d="M126 293h26" stroke="#bba5ff" strokeWidth="4" strokeLinecap="round" />
                  <path className="ep-character-steam" d="M135 285q-6-6 0-12m8 13q-6-6 0-12" fill="none" stroke="#e0dbcd" strokeWidth="2" strokeLinecap="round" opacity=".5" />
                </g>
                <g className="ep-character-pin">
                  <circle cx="239" cy="273" r="10" fill="#242d34" />
                  <path d="M235 276q-2-9 8-10 1 9-8 10Zm0 0-2 3" fill="#d9fa78" stroke="#d9fa78" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>
            </g>
            <g className="ep-character-notifications" stroke="#73708f" strokeWidth="1">
              <g className="ep-character-card ep-character-card-one">
                <rect x="43" y="151" width="75" height="43" rx="10" fill="#303449" />
                <rect x="53" y="162" width="17" height="17" rx="5" fill="#bba5ff" stroke="none" />
                <path d="M59 167h5m-5 5h5m12-7h30m-30 8h21" stroke="#d5cbed" strokeWidth="2" strokeLinecap="round" />
                <circle cx="111" cy="152" r="8" fill="#d9fa78" stroke="#141b29" strokeWidth="2" />
              </g>
              <g className="ep-character-card ep-character-card-two">
                <rect x="280" y="111" width="79" height="47" rx="10" fill="#303449" />
                <path d="M291 125h15v12h-15zm0 0 7.5 7 7.5-7m8 1h33m-33 8h23" fill="none" stroke="#bba5ff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="351" cy="113" r="9" fill="#dba48f" stroke="#141b29" strokeWidth="2" />
                <path d="M351 109v5m0 3v.1" stroke="#141b29" strokeWidth="2" strokeLinecap="round" />
              </g>
              <g className="ep-character-card ep-character-card-three">
                <rect x="282" y="266" width="62" height="34" rx="9" fill="#303449" />
                <path d="m292 289 7-8 7 4 9-11m7 4h12m-12 7h8" fill="none" stroke="#bba5ff" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
            <g className="ep-character-accessories" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {UPGRADES.map((u, index) => upgrades[u.id] > 0 && <g key={u.id} data-accessory={u.id} transform={`translate(${index < 5 ? 76 : 296},${94 + (index % 5) * 51})`}>
                <rect x="-15" y="-15" width="58" height="43" rx="12" fill="#17212e" stroke={u.clarityPerSecond > 0 ? '#d9fa78' : '#bba5ff'} />
                <g fill="none" stroke={u.clarityPerSecond > 0 ? '#d9fa78' : '#bba5ff'}>
                  {u.id === 'doomscroll' && <><rect x="-2" y="-9" width="15" height="27" rx="3" /><path d="M2-4h7M3 13h5M19-8v8m-3-4h6" /></>}
                  {u.id === 'breathwork' && <><ellipse cx="8" cy="4" rx="17" ry="11" /><path d="M-6 4h28M8-7v22" /></>}
                  {u.id === 'ai-intern' && <><rect x="-5" y="-5" width="26" height="22" rx="5" /><path d="M8-5v-6M-9 1v9M25 1v9M2 3v2m12-2v2M2 11h12" /></>}
                  {u.id === 'rage-bait' && <><path d="m7-10-12 15 9-2-1 16L21-1l-11 3 2-12Z" /><path d="M-8-4-4-8M23 12l4 4" /></>}
                  {u.id === 'touch-grass' && <><path d="M8 19V0M8 6Q-10 6-6-7 10-8 8 6ZM8 12Q26 12 24-2 8-3 8 12Z" /><path d="M-5 21h26" /></>}
                  {u.id === 'sleep' && <><path d="M17-9A15 15 0 1 0 23 16 15 15 0 0 1 17-9Z" /><path d="m-4-10 2 3 3-2M23-7v5m-3-2h6" /></>}
                  {u.id === 'personal-brand' && <><path d="m8-11 5 4 7 1 1 7 4 5-5 5-1 7-7 1-4 4-5-4-7-1-1-7-4-5 4-5 1-7 7-1Z" /><path d="m0 5 5 5 11-12" /></>}
                  {u.id === 'silent-retreat' && <><path d="M8 16Q-8 7 8-10 24 7 8 16ZM8 16Q-11 16-9 0 6 1 8 16ZM8 16Q27 16 25 0 10 1 8 16Z" /><path d="M-6 21h28" /></>}
                  {u.id === 'quantum-calendar' && <><circle cx="8" cy="4" r="14" /><path d="M8-5v10l8 4M-9-9l4-3M22 18l4-3" /></>}
                  {u.id === 'enough' && <><circle cx="8" cy="4" r="9" /><path d="M8-13v4M8 17v4M-9 4h4M21 4h4M-4-8l3 3M17 13l3 3M20-8l-3 3M-1 13l-3 3" /></>}
                </g>
                <text x="29" y="20" fill="#e9eaf0" stroke="none" textAnchor="middle" fontSize="9" fontFamily="sans-serif">{upgrades[u.id]}</text>
              </g>)}
            </g>
            <circle cx="200" cy="200" r="181" fill={`url(#${id}-grain)`} pointerEvents="none" />
          </g>
          <path d="M86 54a185 185 0 0 1 58-27" fill="none" stroke="#d9fa78" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          <circle cx="319" cy="343" r="4" fill="#bba5ff" />
          <circle cx="75" cy="63" r="2" fill="#d9fa78" />
        </g>
      </svg>
    </span>
  );
}
