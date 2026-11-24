import React from 'react';
import { NarratorExpr } from '../types';

// Original ODDLY narrator: young male science presenter, anime-inspired,
// white lab coat, stethoscope, black hair. Pure SVG so expressions,
// blinking and lip-sync are frame-accurate and resolution independent.

const INK = '#101B32';
const SKIN = '#F6CFAE';
const SKIN_SH = '#E7AF8C';
const HAIR = '#1A1D29';
const HAIR_HI = '#3B4A6B';
const COAT = '#F8FAFF';
const COAT_SH = '#D7E3F2';

type Props = {
  expr: NarratorExpr;
  mouth: number; // 0..1 loudness
  blink: number; // 0 open .. 1 closed
  bob?: number;
  look?: number; // -1..1 horizontal gaze
};

const Eye: React.FC<{ cx: number; cy: number; blink: number; look: number; wide: boolean; side: 1 | -1 }> = ({ cx, cy, blink, look, wide, side }) => {
  const sy = Math.max(0.08, 1 - blink);
  const ry = wide ? 20 : 16.5;
  return (
    <g>
      <g transform={`translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`}>
        <ellipse cx={cx} cy={cy} rx={16} ry={ry} fill="#FFFFFF" />
        <ellipse cx={cx + look * 4} cy={cy + 2} rx={11.5} ry={wide ? 13 : 13.5} fill="url(#iris)" />
        <ellipse cx={cx + look * 4} cy={cy + 3} rx={6} ry={8} fill="#0A1020" />
        <circle cx={cx + look * 4 - 5} cy={cy - 5} r={4.6} fill="#FFFFFF" />
        <circle cx={cx + look * 4 + 4.5} cy={cy + 7} r={2} fill="#FFFFFF" opacity={0.9} />
      </g>
      {/* upper lash line (stays when blinking) */}
      <path
        d={blink > 0.7
          ? `M${cx - 17},${cy + 2} Q${cx},${cy + 10} ${cx + 17},${cy + 2}`
          : `M${cx - 19},${cy - ry * 0.35 * sy} Q${cx},${cy - ry * 1.25 * sy} ${cx + 19},${cy - ry * 0.45 * sy}`}
        stroke={INK}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

const Brows: React.FC<{ expr: NarratorExpr }> = ({ expr }) => {
  const up = expr === 'surprised' ? -10 : expr === 'explaining' || expr === 'pointing' ? -3 : 0;
  const lTilt = expr === 'thinking' ? -6 : 0;
  const rTilt = expr === 'thinking' ? 5 : 0;
  return (
    <g stroke={HAIR} strokeWidth={8} strokeLinecap="round" fill="none">
      <path d={`M108,${134 + up + lTilt} Q126,${127 + up + lTilt} 146,${131 + up}`} />
      <path d={`M174,${131 + up} Q194,${127 + up + rTilt} 212,${134 + up + rTilt}`} />
    </g>
  );
};

const Mouth: React.FC<{ expr: NarratorExpr; mouth: number }> = ({ expr, mouth }) => {
  const a = Math.min(1, mouth);
  if (expr === 'surprised') {
    return <ellipse cx={160} cy={215} rx={8 + a * 3} ry={10 + a * 5} fill="#7A2335" stroke={INK} strokeWidth={3} />;
  }
  if (a > 0.08) {
    const h = 5 + a * 15;
    return (
      <g>
        <path d={`M145,208 Q160,${208 + h * 1.25} 175,208 Q160,${206 + h * 0.15} 145,208 Z`} fill="#7A2335" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <ellipse cx={160} cy={208 + h * 0.85} rx={7} ry={Math.max(1, h * 0.28)} fill="#F28C9B" />
      </g>
    );
  }
  if (expr === 'thinking') {
    return <path d="M150,213 Q156,209 162,212 T175,210" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
  }
  return <path d="M146,209 Q160,221 174,209" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
};

const Arm: React.FC<{ expr: NarratorExpr }> = ({ expr }) => {
  if (expr === 'pointing') {
    return (
      <g>
        <path d="M232,330 C258,318 276,290 290,250" stroke={INK} strokeWidth={42} strokeLinecap="round" fill="none" />
        <path d="M232,330 C258,318 276,290 290,250" stroke={COAT} strokeWidth={35} strokeLinecap="round" fill="none" />
        <circle cx={293} cy={238} r={17} fill={SKIN} stroke={INK} strokeWidth={3} />
        <rect x={289} y={196} width={10} height={34} rx={5} fill={SKIN} stroke={INK} strokeWidth={3} transform="rotate(18 294 230)" />
      </g>
    );
  }
  if (expr === 'explaining') {
    return (
      <g>
        <path d="M236,350 C262,340 276,318 282,292" stroke={INK} strokeWidth={42} strokeLinecap="round" fill="none" />
        <path d="M236,350 C262,340 276,318 282,292" stroke={COAT} strokeWidth={35} strokeLinecap="round" fill="none" />
        <path d="M268,284 q-4,-26 6,-30 q8,-2 9,14 q4,-20 12,-18 q8,2 4,22 q8,-12 14,-7 q5,5 -6,22 q-10,18 -26,14 q-12,-3 -13,-17 z" fill={SKIN} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </g>
    );
  }
  if (expr === 'thinking') {
    return (
      <g>
        <path d="M238,352 C270,330 248,286 198,262" stroke={INK} strokeWidth={42} strokeLinecap="round" fill="none" />
        <path d="M238,352 C270,330 248,286 198,262" stroke={COAT} strokeWidth={35} strokeLinecap="round" fill="none" />
        <circle cx={182} cy={248} r={16} fill={SKIN} stroke={INK} strokeWidth={3} />
        <rect x={168} y={222} width={9} height={26} rx={4.5} fill={SKIN} stroke={INK} strokeWidth={3} transform="rotate(-25 172 240)" />
      </g>
    );
  }
  if (expr === 'surprised') {
    return (
      <g>
        {[{ x: 66, s: -1 }, { x: 254, s: 1 }].map(({ x, s }) => (
          <g key={x}>
            <path d={`M${x - s * 6},370 C${x + s * 4},330 ${x + s * 6},300 ${x + s * 2},276`} stroke={INK} strokeWidth={38} strokeLinecap="round" fill="none" />
            <path d={`M${x - s * 6},370 C${x + s * 4},330 ${x + s * 6},300 ${x + s * 2},276`} stroke={COAT} strokeWidth={31} strokeLinecap="round" fill="none" />
            <ellipse cx={x + s * 2} cy={262} rx={15} ry={18} fill={SKIN} stroke={INK} strokeWidth={3} />
          </g>
        ))}
      </g>
    );
  }
  return null;
};

export const NarratorMascot: React.FC<Props> = ({ expr, mouth, blink, bob = 0, look = 0.3 }) => {
  return (
    <svg viewBox="0 0 320 440" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="iris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#101B32" />
          <stop offset="0.55" stopColor="#2865A5" />
          <stop offset="1" stopColor="#7FC8FF" />
        </linearGradient>
        <linearGradient id="coatShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.55" stopColor={COAT} />
          <stop offset="1" stopColor={COAT_SH} />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${bob})`}>
        {/* back hair */}
        <path d="M84,140 C70,62 118,26 164,28 C214,28 256,62 240,140 L232,160 L222,128 L100,128 L90,160 Z" fill={HAIR} stroke={INK} strokeWidth={3} />
        {/* coat body */}
        <path d="M52,440 C54,342 84,300 138,282 L182,282 C236,300 266,342 268,440 Z" fill="url(#coatShade)" stroke={INK} strokeWidth={3.5} />
        {/* shirt + tie */}
        <path d="M138,282 L160,334 L182,282 Z" fill="#BFE3FF" stroke={INK} strokeWidth={3} />
        <path d="M154,292 L166,292 L171,348 L160,364 L149,348 Z" fill={INK} />
        <path d="M156,292 L164,292 L162,300 L158,300 Z" fill="#2865A5" />
        {/* neck */}
        <path d="M140,228 L180,228 L182,284 Q160,300 138,284 Z" fill={SKIN} stroke={INK} strokeWidth={3} />
        <path d="M141,250 Q160,262 180,250 L180,236 L141,236 Z" fill={SKIN_SH} opacity={0.8} />
        {/* stethoscope: tube behind neck, down both sides */}
        <path d="M112,300 C104,336 108,374 134,390 C150,398 166,394 172,384" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M112,300 C104,336 108,374 134,390 C150,398 166,394 172,384" stroke="#2B3F66" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M208,300 C216,334 210,360 192,374" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M208,300 C216,334 210,360 192,374" stroke="#2B3F66" strokeWidth={5} fill="none" strokeLinecap="round" />
        <circle cx={184} cy={384} r={13} fill="#C9D3E0" stroke={INK} strokeWidth={3.5} />
        <circle cx={184} cy={384} r={6} fill="#EEF3FA" stroke={INK} strokeWidth={2} />
        {/* lapels */}
        <path d="M138,282 L120,302 L146,372 L160,334 Z" fill={COAT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M182,282 L200,302 L174,372 L160,334 Z" fill={COAT_SH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {/* pocket, pen, ODDLY badge */}
        <rect x={198} y={392} width={44} height={36} rx={4} fill={COAT_SH} stroke={INK} strokeWidth={2.5} />
        <rect x={206} y={378} width={6} height={22} rx={2} fill="#FFD447" stroke={INK} strokeWidth={2} />
        <rect x={84} y={360} width={50} height={18} rx={5} fill="#FFD447" stroke={INK} strokeWidth={2.5} />
        <text x={109} y={373.5} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={11} fill={INK}>ODDLY</text>
        {/* ears */}
        <ellipse cx={94} cy={168} rx={11} ry={18} fill={SKIN} stroke={INK} strokeWidth={3} />
        <ellipse cx={226} cy={168} rx={11} ry={18} fill={SKIN} stroke={INK} strokeWidth={3} />
        {/* face */}
        <path d="M94,108 C92,162 102,204 130,230 Q160,250 190,230 C218,204 228,162 226,108 Z" fill={SKIN} stroke={INK} strokeWidth={3.5} />
        <ellipse cx={118} cy={197} rx={13} ry={6} fill="#FF9AA8" opacity={0.45} />
        <ellipse cx={202} cy={197} rx={13} ry={6} fill="#FF9AA8" opacity={0.45} />
        <Eye cx={128} cy={166} blink={blink} look={look} wide={expr === 'surprised'} side={-1} />
        <Eye cx={192} cy={166} blink={blink} look={look} wide={expr === 'surprised'} side={1} />
        <Brows expr={expr} />
        <path d="M160,180 Q165,191 158,195" stroke={SKIN_SH} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <Mouth expr={expr} mouth={mouth} />
        {/* front hair / bangs */}
        <path
          d="M86,128 C84,66 124,40 164,40 C206,40 240,66 236,128 L224,104 L214,132 L199,100 L183,128 L170,96 L153,130 L140,98 L124,126 L113,102 L100,132 Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        <path d="M88,126 L86,158 L99,138 Z" fill={HAIR} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M234,126 L236,158 L223,138 Z" fill={HAIR} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M164,42 C168,20 188,10 200,18 C186,18 177,27 172,44 Z" fill={HAIR} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M118,66 C134,54 156,50 176,52" stroke={HAIR_HI} strokeWidth={6} fill="none" strokeLinecap="round" />
        <Arm expr={expr} />
      </g>
    </svg>
  );
};
