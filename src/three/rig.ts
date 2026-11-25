// Character rig: constants, analytic 2-bone IK, forward kinematics and the
// action compiler (storyboard events -> keyframe tracks). Pure TS so both the
// renderer and the 2D label projector share exactly the same motion.
import * as THREE from 'three';
import { Track, V3, rng } from './math';

export const L1 = 0.29;
export const L2 = 0.28;
export const SHOULDER: V3 = [0.25, 0, -0.03];
export const HIP_Z = 0.78;
export const HEAD_SCALE = 1.14;
export const HEAD_C = new THREE.Vector3(0, 0, 0.065 + 0.21 * HEAD_SCALE);

export type Look = { skin: string; hair: string; hairStyle: 'spiky' | 'round' | 'cap' | 'side' | 'bob' | 'hijab'; outfit: 'hoodie' | 'gown' | 'scrubs' | 'labcoat' | 'tee' | 'suit'; helmet?: boolean; patch?: boolean; mustache?: string; mask?: boolean; glasses?: boolean; top?: string; topDark?: string; legs?: string;
  // EP022 (India village): headcloth colour, long kurta skirt, sari drape colour (+ ankle-length skirt), bare feet, bindi
  turban?: string; kurta?: boolean; sari?: string; barefoot?: boolean; bindi?: string };
export const LOOKS: Record<string, Look> = {
  // EP020 UFC: "shirtless" via top = skin tone
  khabib: { skin: '#E3B088', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#E3B088', topDark: '#E3B088', legs: '#23252C', mustache: '#1B1E2B' },
  // EP021 "3 Cewek, Bebek, dan Surga" (meme comedy skit)
  gadis1: { skin: '#F2CBA6', hair: '#2A1C14', hairStyle: 'bob', outfit: 'tee', top: '#E86A8A', topDark: '#C24F6C', legs: '#2B2630' },
  gadis2: { skin: '#E8B98F', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#5AA8C2', topDark: '#3E85A0', legs: '#2B2630' },
  gadis3: { skin: '#F7CBA6', hair: '#6A3B1E', hairStyle: 'spiky', outfit: 'tee', top: '#8E6AE8', topDark: '#6E4DC2', legs: '#2B2630' },
  malaikat: { skin: '#FDEBDD', hair: '#F2E6C8', hairStyle: 'bob', outfit: 'gown', glasses: false },
  cowok_jelek: { skin: '#C98E66', hair: '#2A1C14', hairStyle: 'cap', outfit: 'tee', top: '#7A6A4A', topDark: '#5E503A', legs: '#3B3028', mustache: '#2A1C14' },
  cowok_ganteng: { skin: '#F0C8A0', hair: '#1B1E2B', hairStyle: 'side', outfit: 'suit', legs: '#1B1E2B' },
  gaethje: { skin: '#F0C098', hair: '#C8A050', hairStyle: 'spiky', outfit: 'tee', top: '#F0C098', topDark: '#F0C098', legs: '#B3262E' },
  abdulmanap: { skin: '#D8A87C', hair: '#6A6A72', hairStyle: 'round', outfit: 'tee', top: '#3A4A3E', topDark: '#2C3A30', legs: '#3B4660', mustache: '#6A6A72' },
  raka: { skin: '#F7CBA6', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'hoodie' },
  // EP024 kite kid
  bocah_layang: { skin: '#D9A17A', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'tee', top: '#F28C28', topDark: '#C96E15', legs: '#2E4A7A' },
  // EP019 medieval soldiers (Modena = blue/gold, Bologna = red/white); helmets via cinematic attach `helm`
  modena_soldier: { skin: '#E3AE86', hair: '#2A1C14', hairStyle: 'round', outfit: 'tee', top: '#2A4F9E', topDark: '#1D3A78', legs: '#5A4630', mustache: '#2A1C14' },
  modena_soldier2: { skin: '#D9A17A', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#E2B13C', topDark: '#B88A22', legs: '#2A4F9E' },
  bologna_soldier: { skin: '#EDBB94', hair: '#5A3B26', hairStyle: 'round', outfit: 'tee', top: '#B3262E', topDark: '#8A1C22', legs: '#D9D2C5' },
  patient: { skin: '#EDB98F', hair: '#4A3020', hairStyle: 'round', outfit: 'gown' },
  surgeon: { skin: '#DDA67D', hair: '#1B1E2B', hairStyle: 'cap', outfit: 'scrubs', mask: true },
  derek: { skin: '#EDBB94', hair: '#5A3B26', hairStyle: 'side', outfit: 'tee', top: '#6E8B74', topDark: '#4F6A56', legs: '#3B4660' },
  derek_gown: { skin: '#EDBB94', hair: '#5A3B26', hairStyle: 'side', outfit: 'gown' },
  doctor: { skin: '#C98E66', hair: '#1B1E2B', hairStyle: 'round', outfit: 'labcoat', glasses: true },
  raka_iss: { skin: '#F7CBA6', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'tee', top: '#2B3F6B', topDark: '#1E2D50', legs: '#4A5A7A', patch: true },
  raka_suit: { skin: '#F7CBA6', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'suit', helmet: true, patch: true },
  crew: { skin: '#C98E66', hair: '#2A1C14', hairStyle: 'bob', outfit: 'tee', top: '#E86A5B', topDark: '#C24F42', legs: '#4A5A7A', patch: true },
  gage: { skin: '#EDBB94', hair: '#5A3B26', hairStyle: 'side', outfit: 'tee', top: '#E8E0CC', topDark: '#B9AE94', legs: '#4A3B2A' },
  pekerja: { skin: '#D9A17A', hair: '#2A1C14', hairStyle: 'round', outfit: 'tee', top: '#8B5E3C', topDark: '#6B4529', legs: '#3B3F4A', mustache: '#2A1C14' },
  pekerja2: { skin: '#E3AE86', hair: '#8A5A3B', hairStyle: 'spiky', outfit: 'tee', top: '#6E8B74', topDark: '#4F6A56', legs: '#3B3F4A' },
  rahmat: { skin: '#B9825C', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#E8772E', topDark: '#B85A1E', legs: '#3B3F4A', mask: true },
  relawan: { skin: '#C98E66', hair: '#2A1C14', hairStyle: 'spiky', outfit: 'tee', top: '#E8C23A', topDark: '#B8962A', legs: '#2B3346', mask: true },
  anak: { skin: '#D9A17A', hair: '#1B1E2B', hairStyle: 'bob', outfit: 'tee', top: '#7FC8FF', topDark: '#5A9FD6', legs: '#3B4660', mask: true },
  darto: { skin: '#B07A55', hair: '#E6E6E6', hairStyle: 'round', outfit: 'tee', top: '#4F6B5A', topDark: '#3B5245', legs: '#3B3F4A', mustache: '#DADADA' },
  dimas: { skin: '#E9B48C', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#DCE9F5', topDark: '#A9C4DE', legs: '#3B4660' },
  ibu: { skin: '#E3AE86', hair: '#8C4A5E', hairStyle: 'hijab', outfit: 'tee', top: '#C97C93', topDark: '#A85E75', legs: '#5A4A6A' },
  bapak: { skin: '#C98E66', hair: '#7D7D7D', hairStyle: 'round', outfit: 'tee', top: '#8B5E3C', topDark: '#6B4529', legs: '#3B3F4A', mustache: '#3A3A3A' },
  // SW05: Nisa (adik Dimas, 18-19) — lilac hijab, cream top; Dimas muda (flashback, seragam putih abu-abu)
  nisa: { skin: '#EDBC96', hair: '#B49AD8', hairStyle: 'hijab', outfit: 'tee', top: '#F3E7D3', topDark: '#D8C7AC', legs: '#6E5E92' },
  dimas_muda: { skin: '#E9B48C', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#F6F6F3', topDark: '#C8CCD3', legs: '#6A707C' },
  raka_futsal: { skin: '#F7CBA6', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'tee', top: '#E5484D', topDark: '#B8363A', legs: '#1B1E2B' },
  teman1: { skin: '#C98E66', hair: '#2A1C14', hairStyle: 'round', outfit: 'tee', top: '#2E7BD0', topDark: '#1F5C9E', legs: '#1B1E2B' },
  teman2: { skin: '#E3AE86', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#F2C94C', topDark: '#C9A12E', legs: '#1B1E2B' },
  paramedis: { skin: '#D9A17A', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#F28C28', topDark: '#C96E15', legs: '#2B3346' },
  clive: { skin: '#F0C4A0', hair: '#C9C9C9', hairStyle: 'side', outfit: 'tee', top: '#8C3B4A', topDark: '#6A2A36', legs: '#3B4660', glasses: true },
  deborah: { skin: '#F3C9A8', hair: '#8A5A3B', hairStyle: 'bob', outfit: 'tee', top: '#E8A0B4', topDark: '#C97C93', legs: '#4A5A7A' },
  // SW03 keluarga besar (Generasi Sandwich)
  dimas_batik: { skin: '#E9B48C', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#3E5C8A', topDark: '#2A4266', legs: '#2B2F3A' },
  ibu_daster: { skin: '#E3AE86', hair: '#B98A5E', hairStyle: 'hijab', outfit: 'tee', top: '#7E9C7A', topDark: '#5E7A5B', legs: '#4E5A4C' },
  bapak_koko: { skin: '#C98E66', hair: '#7D7D7D', hairStyle: 'round', outfit: 'tee', top: '#EDE6D6', topDark: '#C9BFA9', legs: '#3B3F4A', mustache: '#3A3A3A' },
  rina: { skin: '#EFC09A', hair: '#2A1A12', hairStyle: 'bob', outfit: 'tee', top: '#B8243C', topDark: '#8E1A2D', legs: '#2B1E26', glasses: false },
  om_hadi: { skin: '#D6A07A', hair: '#2A2A2A', hairStyle: 'round', outfit: 'tee', top: '#8A6A2E', topDark: '#6B5021', legs: '#2B2F3A', mustache: '#2A2A2A' },
  kevin: { skin: '#EFC5A0', hair: '#3A2418', hairStyle: 'spiky', outfit: 'tee', top: '#1F1F24', topDark: '#111114', legs: '#3B4660' },
  charles: { skin: '#F0C29C', hair: '#7A5232', hairStyle: 'side', outfit: 'tee', top: '#C8A14E', topDark: '#9C7A33', legs: '#3E5A86', mustache: '#7A5232' },
  charles_old: { skin: '#EBC1A0', hair: '#E9E6E0', hairStyle: 'round', outfit: 'tee', top: '#7E9AB8', topDark: '#5E7A98', legs: '#4A4F5C', glasses: true, mustache: '#E9E6E0' },
  host_tv: { skin: '#E3B48E', hair: '#2B2420', hairStyle: 'side', outfit: 'suit', top: '#2E3442', topDark: '#1E2330', legs: '#1E2330' },
  raka_kb: { skin: '#EDBB94', hair: '#1B1E2B', hairStyle: 'side', outfit: 'tee', top: '#2E4A7A', topDark: '#1F3459', legs: '#2B2F3A' },
  nadia: { skin: '#F3C9A8', hair: '#3A2418', hairStyle: 'bob', outfit: 'tee', top: '#E8A0A8', topDark: '#C97C86', legs: '#F2EDE4' },
  ayah_kb: { skin: '#D6A07A', hair: '#8A8A8A', hairStyle: 'side', outfit: 'suit', top: '#3A3F4C', topDark: '#262A33', legs: '#262A33', mustache: '#5A5A5A' },
  mama_kb: { skin: '#E3AE86', hair: '#6B5A7E', hairStyle: 'hijab', outfit: 'tee', top: '#8E7AA8', topDark: '#6E5C88', legs: '#4A4058' },
  courthope: { skin: '#F0C4A0', hair: '#6B4A2E', hairStyle: 'side', outfit: 'suit', top: '#A8242E', topDark: '#7E1A22', legs: '#2B2F3A', mustache: '#6B4A2E' },
  inggris: { skin: '#EDBB94', hair: '#3A2418', hairStyle: 'cap', outfit: 'tee', top: '#C8463F', topDark: '#9C332E', legs: '#3B3F4A' },
  pria: { skin: '#E8B48E', hair: '#5A3A26', hairStyle: 'side', outfit: 'tee', top: '#3F7FBF', topDark: '#2D5F92', legs: '#3B4660', mustache: '#5A3A26' },
  pria_gown: { skin: '#E8B48E', hair: '#5A3A26', hairStyle: 'side', outfit: 'gown', mustache: '#5A3A26' },
  // ep028 lemon-juice robbers (Pittsburgh 1995)
  wheeler: { skin: '#8A5A3E', hair: '#16141A', hairStyle: 'round', outfit: 'hoodie', top: '#6E7A3A', topDark: '#55602B', legs: '#2F3A52', mustache: '#16141A' },
  johnson: { skin: '#9A6646', hair: '#1B1E2B', hairStyle: 'cap', outfit: 'tee', top: '#5A5F6E', topDark: '#444856', legs: '#26282E' },
  polisi: { skin: '#C98E66', hair: '#1C2B4A', hairStyle: 'cap', outfit: 'suit', top: '#2B4470', topDark: '#1C2E50', legs: '#1C2436' },
  sepupu: { skin: '#E6B58E', hair: '#1B1E2B', hairStyle: 'bob', outfit: 'tee', top: '#E7A23B', topDark: '#C27F1E', legs: '#4A5A7A' },
  // sw06 arisan relatives
  tante_sri: { skin: '#D9A47E', hair: '#2F7F7A', hairStyle: 'hijab', outfit: 'tee', top: '#E8D7B0', topDark: '#C7B488', legs: '#3E5E5A' },
  budhe_tini: { skin: '#C99472', hair: '#7A3B2E', hairStyle: 'hijab', outfit: 'tee', top: '#B5654A', topDark: '#8E4C36', legs: '#4A3A34' },
  om_joko: { skin: '#C48A62', hair: '#3A3A3A', hairStyle: 'side', outfit: 'tee', top: '#4F7A5E', topDark: '#3A5C46', legs: '#2B2F3A', mustache: '#2A2A2A', glasses: true },
  sinta: { skin: '#F0C7A4', hair: '#E9B9C8', hairStyle: 'hijab', outfit: 'tee', top: '#F6E1E6', topDark: '#DDBAC4', legs: '#8E6E86' },
  kevin_kemeja: { skin: '#EFC5A0', hair: '#3A2418', hairStyle: 'spiky', outfit: 'tee', top: '#2E3F5E', topDark: '#1F2C44', legs: '#2B2F3A' },
  // EP022 Dashrath Manjhi (Gehlaur, Bihar): white kurta + dhoti, orange headcloth, bare feet
  dashrath: { skin: '#8A5A3C', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#F1ECE0', topDark: '#CFC6B2', legs: '#E6DECB', mustache: '#1B1E2B', turban: '#D9822B', kurta: true, barefoot: true },
  dashrath_old: { skin: '#835438', hair: '#D8D8D8', hairStyle: 'round', outfit: 'tee', top: '#EFEAE0', topDark: '#CBC3B0', legs: '#E2DAC8', mustache: '#E6E6E6', turban: '#E9E2D2', kurta: true, barefoot: true },
  falguni: { skin: '#93603F', hair: '#1B1E2B', hairStyle: 'bob', outfit: 'tee', top: '#E8B23A', topDark: '#C08E22', legs: '#C8402C', sari: '#C8402C', barefoot: true, bindi: '#B0122A' },
  warga1: { skin: '#7E5236', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#C9B48A', topDark: '#A8946A', legs: '#E2D8C2', mustache: '#1B1E2B', turban: '#B8462E', kurta: true, barefoot: true },
  warga2: { skin: '#9A6844', hair: '#7D7D7D', hairStyle: 'round', outfit: 'tee', top: '#8FA27A', topDark: '#6F8460', legs: '#E2D8C2', mustache: '#8A8A8A', kurta: true, barefoot: true },
  warga3: { skin: '#8E5C3E', hair: '#1B1E2B', hairStyle: 'bob', outfit: 'tee', top: '#D9A03A', topDark: '#B0801E', legs: '#2E7F7A', sari: '#2E7F7A', barefoot: true, bindi: '#B0122A' },
  anak_desa1: { skin: '#8A5A3C', hair: '#1B1E2B', hairStyle: 'spiky', outfit: 'tee', top: '#F4F4F0', topDark: '#CFD3D8', legs: '#2B4470' },
  anak_desa2: { skin: '#93603F', hair: '#1B1E2B', hairStyle: 'bob', outfit: 'tee', top: '#F4F4F0', topDark: '#CFD3D8', legs: '#2B4470' },
  // EP023 Wheat & Chessboard legend (ancient India court): raja = King Shirham (royal purple/gold, gold turban),
  // sissa = sage advisor (plain white/saffron, humble), bendahara = royal treasurer (green/brown robe)
  raja: { skin: '#D9A066', hair: '#2A1C14', hairStyle: 'round', outfit: 'tee', top: '#5B2CA0', topDark: '#3D1E70', legs: '#E8C877', mustache: '#1B1E2B', turban: '#E8C83D', kurta: true, barefoot: false },
  sissa: { skin: '#8A5A3C', hair: '#D8D8D8', hairStyle: 'round', outfit: 'tee', top: '#F1ECE0', topDark: '#CFC6B2', legs: '#E6DECB', mustache: '#C9C9C9', turban: '#E8772E', kurta: true, barefoot: true },
  bendahara: { skin: '#9A6844', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#4F6B4A', topDark: '#38502F', legs: '#C9B48A', mustache: '#1B1E2B', turban: '#8B5E3C', kurta: true, barefoot: true },
  // ep027 Reg Spiers (1964): Aussie javelin thrower in green-gold, his mate John McSorley, cargo handlers, Reg's daughter
  reg: { skin: '#EFBF96', hair: '#B8863E', hairStyle: 'side', outfit: 'tee', top: '#1F6B45', topDark: '#155034', legs: '#E0B23A' },
  reg_trav: { skin: '#EFBF96', hair: '#B8863E', hairStyle: 'side', outfit: 'tee', top: '#D9CBA8', topDark: '#B5A682', legs: '#3B3F4A' },
  reg_shirtless: { skin: '#F2B890', hair: '#B8863E', hairStyle: 'side', outfit: 'tee', top: '#F2B890', topDark: '#DDA27C', legs: '#3B3F4A' },
  mcsorley: { skin: '#F0C4A0', hair: '#3A2418', hairStyle: 'round', outfit: 'tee', top: '#8A3B3B', topDark: '#6A2A2A', legs: '#3B4660' },
  handler1: { skin: '#E3AE86', hair: '#2A1C14', hairStyle: 'cap', outfit: 'tee', top: '#3F5F8A', topDark: '#2C4566', legs: '#2B2F3A', mustache: '#2A1C14' },
  handler2: { skin: '#9A6844', hair: '#1B1E2B', hairStyle: 'round', outfit: 'tee', top: '#C9A24A', topDark: '#A07E30', legs: '#3B3F4A', mustache: '#1B1E2B' },
  putri_reg: { skin: '#F3C9A8', hair: '#C9A050', hairStyle: 'bob', outfit: 'tee', top: '#F2A0B8', topDark: '#D27E98', legs: '#F2EDE4' },
  istri_reg: { skin: '#EFC5A0', hair: '#5A3B26', hairStyle: 'bob', outfit: 'tee', top: '#5AA8C2', topDark: '#3E85A0', legs: '#2B2F3A' },
};

type Pose = { t: V3; pole: V3; abs?: boolean };
export const ARM_POSES: Record<string, Pose> = {
  rest: { t: [0.3, -0.02, -0.55], pole: [0.3, 1, -0.2] },
  relaxed: { t: [0.29, -0.1, -0.5], pole: [0.4, 1, -0.3] },
  hold_head: { t: [0.285, -0.07, 0.33], pole: [1, 0.25, -0.7] },
  // sw10: phone held to the ear — hand just outside the hijab, behind the cheek line, elbow out/down (phone attach sits between hand and head)
  phone_ear: { t: [0.37, 0.02, 0.27], pole: [1, 0.1, -1] },
  forehead: { t: [0.03, -0.3, 0.43], pole: [1, 0, -0.7] },
  temple: { t: [0.27, -0.13, 0.36], pole: [1, 0.2, -0.6] },
  chin: { t: [0.03, -0.27, 0.12], pole: [1, 0.4, -1] },
  cross: { t: [-0.06, -0.22, -0.16], pole: [1, 0.6, -0.6] },
  surprised: { t: [0.4, -0.2, 0.1], pole: [1, 0.6, -1] },
  point_side: { t: [0.66, -0.3, 0.17], pole: [0, 1, -1] },
  point_up: { t: [0.38, -0.3, 0.55], pole: [1, 1, -0.2] },
  point_cam: { t: [0.2, -0.58, 0.12], pole: [1, 0.5, -1] },
  present: { t: [0.48, -0.32, -0.12], pole: [0.5, 1, -1] },
  wave: { t: [0.42, -0.1, 0.4], pole: [1, 0.6, -0.6] },
  thumbs: { t: [0.18, -0.38, -0.02], pole: [1, 0.5, -1] },
  hips: { t: [0.3, 0.04, -0.33], pole: [1, 0.2, 0] },
  shrug: { t: [0.4, -0.18, -0.2], pole: [1, 0.5, -1] },
  fist_up: { t: [0.3, -0.25, 0.5], pole: [1, 0.6, -0.6] },
  chill: { t: [0.2, 0.1, 0.42], pole: [1, -0.2, 0.4] },
  chest: { t: [0.05, -0.2, -0.06], pole: [1, 0.4, -0.6] },
  look_hands: { t: [0.12, -0.36, 0.05], pole: [1, 0.4, -1] },
  keys: { t: [0.17, -0.42, -0.02], pole: [1, 0.3, -1] },
  cpr: { t: [0.03, -0.4, -0.3], pole: [1, 0.2, -0.3] },
  hug: { t: [-0.08, -0.36, -0.02], pole: [1, 0.5, -0.4] },
  // EP022 hammer + chisel work, water jar carried on the head
  hammer_up: { t: [0.24, -0.12, 0.52], pole: [1, 0.3, -0.4] },
  hammer_hit: { t: [0.1, -0.52, -0.04], pole: [1, 0.4, -1] },
  chisel: { t: [0.06, -0.5, 0.04], pole: [1, 0.3, -1] },
  carry_head: { t: [0.12, -0.04, 0.6], pole: [1, 0.3, -0.2] },
};

//               browZ  browRot eyes  smile frown open round
export const EXPRESSIONS: Record<string, number[]> = {
  neutral: [0.0, 0.0, 1.0, 0.75, 0, 0, 0],
  happy: [0.01, 0.0, 0.85, 1.1, 0, 0, 0],
  talk: [0.006, 0.0, 1.0, 0.8, 0, 0, 0],
  confused: [0.012, 0.18, 1.0, 0.35, 0, 0, 0],
  pain: [0.01, 0.38, 0.35, 0.85, 1, 0.45, 0],
  worried: [0.012, 0.3, 0.9, 0.6, 1, 0, 0],
  surprised: [0.04, 0.05, 1.28, 0.0, 0, 1.0, 1],
  thinking: [0.022, -0.12, 0.95, 0.45, 0, 0, 0],
  smirk: [0.008, 0.0, 0.9, 0.95, 0, 0, 0],
  cry: [0.012, 0.42, 0.22, 0.95, 1, 0.95, 0],
  shock: [0.05, 0.0, 1.45, 0.0, 0, 1.15, 1],
  proud: [0.014, -0.06, 0.55, 1.3, 0, 0.0, 0],
  sad: [0.01, 0.34, 0.7, 0.6, 1, 0, 0],
  softsmile: [0.006, 0.16, 0.72, 0.95, 0, 0, 0],
  angry: [-0.006, -0.34, 0.82, 0.25, 1, 0, 0],
  yell: [-0.004, -0.3, 0.95, 0.2, 1, 0.9, 0],
  laugh: [0.012, 0.04, 0.3, 1.35, 0, 0.75, 0],
  // ep024 additions
  curious: [0.03, -0.08, 1.12, 0.6, 0, 0.12, 1],
  awe: [0.04, 0.08, 1.2, 0.85, 0, 0.45, 1],
  scared: [0.035, 0.32, 1.3, 0.1, 1, 0.55, 0],
  relieved: [0.008, 0.22, 0.5, 1.05, 0, 0.1, 0],
  determined: [-0.004, -0.2, 0.85, 0.7, 0, 0, 0],
  wince: [0.0, 0.3, 0.15, 0.4, 1, 0.25, 0],
  unconscious: [0.0, 0.08, 0.02, 0.45, 1, 0.08, 0],
};

const M4 = () => new THREE.Matrix4();
const T = (x: number, y: number, z: number) => M4().makeTranslation(x, y, z);
const Rx = (a: number) => M4().makeRotationX(a);
const Ry = (a: number) => M4().makeRotationY(a);
const Rz = (a: number) => M4().makeRotationZ(a);
const S = (x: number, y: number, z: number) => M4().makeScale(x, y, z);
const mul = (...ms: THREE.Matrix4[]) => ms.reduce((a, b) => a.multiply(b), M4());

export function solveArm(side: 'L' | 'R', target: V3, pole: V3) {
  const sx = side === 'L' ? 1 : -1;
  const Sv = new THREE.Vector3(sx * SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  const v = new THREE.Vector3(...target).sub(Sv);
  const d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(v.length(), L1 + L2 - 1e-3));
  const t = v.clone().normalize();
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const P = new THREE.Vector3(...pole);
  let p = P.clone().sub(t.clone().multiplyScalar(P.dot(t)));
  if (p.length() < 1e-5) p = new THREE.Vector3(0, 1, 0).sub(t.clone().multiplyScalar(t.y));
  p.normalize();
  const u = t.clone().multiplyScalar(Math.cos(a)).add(p.clone().multiplyScalar(Math.sin(a)));
  const E = u.clone().multiplyScalar(L1);
  const f = t.clone().multiplyScalar(d).sub(E).normalize();
  const Z = u.clone().negate();
  let y = f.clone().sub(u.clone().multiplyScalar(f.dot(u)));
  if (y.length() < 1e-5) y = p.clone();
  y.normalize();
  const X = y.clone().cross(Z);
  const R = M4().makeBasis(X, y, Z);
  const beta = Math.atan2(f.dot(y), f.dot(u));
  return { R, beta };
}

export type CharPose = {
  root: V3;
  yaw: number;
  lying: boolean;
  hipsZ: number;
  sway: number;
  lean: [number, number];
  breath: number;
  neck: [number, number]; // yaw, pitch
  head: [number, number]; // roll, nod
  arms: Record<'L' | 'R', { t: V3; pole: V3; finger: number }>;
  legs: Record<'L' | 'R', [number, number]>; // thigh, knee
  face: { browZ: number; browRot: number; eyes: number; smile: number; frown: number; open: number; round: number; eyeOff: [number, number] };
  xray: number; // 0 opaque .. 1 x-ray
  elder: number; // 0 young .. 1 grandpa costume
  brainGlow: number;
  brainColor: string;
};

/** Local matrices of every rig node (parent space). */
export function fk(p: CharPose) {
  const m: Record<string, THREE.Matrix4> = {};
  m.root = mul(T(...p.root), Rz(p.yaw), p.lying ? Rx(-Math.PI / 2) : M4());
  m.hips = mul(T(0, 0, p.hipsZ), Rz(p.sway));
  m.spine = mul(Ry(p.lean[1]), Rx(-p.lean[0]));
  m.breath = mul(Rx(0.012 * p.breath), S(1, 1, 1 + 0.012 * p.breath));
  m.chest = T(0, 0, 0.5);
  m.neck = mul(T(0, 0, 0.02), Rz(p.neck[0] * 0.75), Rx(p.neck[1] * 0.7));
  m.head = mul(T(0, 0, 0.045), Ry(p.head[0]), Rx(p.head[1]), S(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE));
  m.headC = T(0, 0, 0.21);
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const a = p.arms[side];
    const { R, beta } = solveArm(side, a.t, a.pole);
    m[`sh${side}`] = mul(T(sx * SHOULDER[0], SHOULDER[1], SHOULDER[2]), R);
    m[`el${side}`] = mul(T(0, 0, -L1), Rx(beta));
    m[`hand${side}`] = T(0, 0, -L2);
    m[`hip${side}`] = mul(T(sx * 0.1, 0, -0.02), Rx(p.legs[side][0]));
    m[`knee${side}`] = mul(T(0, 0, -0.37), Rx(p.legs[side][1]));
    m[`ankle${side}`] = T(0, 0, -0.34);
  }
  return m;
}

const PARENT: Record<string, string | null> = {
  root: null, hips: 'root', spine: 'hips', breath: 'spine', chest: 'breath', neck: 'chest', head: 'neck', headC: 'head',
  shL: 'chest', elL: 'shL', handL: 'elL', shR: 'chest', elR: 'shR', handR: 'elR',
  hipL: 'hips', kneeL: 'hipL', ankleL: 'kneeL', hipR: 'hips', kneeR: 'hipR', ankleR: 'kneeR',
};

export function worldOf(local: Record<string, THREE.Matrix4>, node: string): THREE.Matrix4 {
  const chain: string[] = [];
  let n: string | null = node;
  while (n) {
    chain.unshift(n);
    n = PARENT[n];
  }
  return chain.reduce((acc, k) => acc.multiply(local[k]), M4());
}

// ------------------------------------------------------------------ actor
export type ActorCfg = {
  id: string; look?: string; set: string; pos?: number[]; facing?: number; posture?: string; brain?: boolean;
  init?: { L?: string; R?: string; expr?: string };
  timeline?: Array<Record<string, any>>;
  /** ep024 opt-in "life": idle breathing everywhere, auto-blinks, subtle head drift, overshoot gestures.
   *  true or { blink?: boolean; head?: number (amp rad); overshoot?: boolean; breath?: number } */
  life?: boolean | { blink?: boolean; head?: number; overshoot?: boolean; breath?: number };
};

type ArmVal = { t: V3; pole: V3; finger: number };

export class ActorAnim {
  look: Look;
  lying: boolean;
  floating = false;
  sitting = false;
  kneeling = false;
  seat = 0.44;
  root: Track<number[]>;
  yaw: Track<number>;
  hipsZ: Track<number>;
  arms: Record<'L' | 'R', { t: Track<number[]>; pole: Track<number[]>; finger: Track<number> }>;
  legs: Record<'L' | 'R', { th: Track<number>; kn: Track<number> }>;
  face: Record<string, Track<number>> = {};
  blink = new Track<number>(1);
  talk = new Track<number>(0);
  talkNod = new Track<number>(0);
  neck = new Track<number[]>([0, 0]);
  head = new Track<number[]>([0, 0]);
  lean = new Track<number[]>([0, 0]);
  xray = new Track<number>(0);
  elder = new Track<number>(0);
  shivers: Array<[number, number, number]> = [];
  brainGlow = new Track<number>(0);
  brainColor = new Track<number>(0); // index into colors (step)
  colors: string[] = ['#7FC8FF'];
  idle: Array<[number, number]> = [];
  sitAmt: Track<number> | null = null; // sw06: animated sit<->stand (only set by 'stand'/'sit' events)
  armState: Record<'L' | 'R', ArmVal>;
  exprState = 'neutral';
  life: { blink: boolean; head: number; overshoot: boolean; breath: number } | null = null;

  constructor(public cfg: ActorCfg, public origin: V3, public point: (spec: any, frame?: number) => THREE.Vector3) {
    this.look = LOOKS[cfg.look ?? 'raka'] ?? LOOKS.raka;
    this.lying = cfg.posture === 'lying';
    this.floating = cfg.posture === 'float';
    this.sitting = cfg.posture === 'sit';
    this.kneeling = cfg.posture === 'kneel';
    this.seat = (cfg as any).seat ?? 0.44;
    const p = cfg.pos ?? [0, 0, 0];
    const start: V3 = [origin[0] + (p[0] ?? 0), origin[1] + (p[1] ?? 0), origin[2] + (p[2] ?? 0)];
    this.root = new Track<number[]>(start);
    this.yaw = new Track<number>(((cfg.facing ?? 0) * Math.PI) / 180);
    this.hipsZ = new Track<number>(HIP_Z);
    const restL = this.resolve('L', this.lying ? 'relaxed' : 'rest');
    const restR = this.resolve('R', this.lying ? 'relaxed' : 'rest');
    this.armState = { L: restL, R: restR };
    this.arms = {
      L: { t: new Track<number[]>(restL.t), pole: new Track<number[]>(restL.pole), finger: new Track<number>(0) },
      R: { t: new Track<number[]>(restR.t), pole: new Track<number[]>(restR.pole), finger: new Track<number>(0) },
    };
    this.legs = { L: { th: new Track(0), kn: new Track(0) }, R: { th: new Track(0), kn: new Track(0) } };
    const n = EXPRESSIONS.neutral;
    ['browZ', 'browRot', 'eyes', 'smile', 'frown', 'open', 'round'].forEach((k, i) => (this.face[k] = new Track<number>(n[i])));
    if (cfg.life) {
      const l = typeof cfg.life === 'object' ? cfg.life : {};
      this.life = { blink: l.blink !== false, head: l.head ?? 0.045, overshoot: l.overshoot !== false, breath: l.breath ?? 1.4 };
      if (this.life.blink) { // natural blink rhythm (2–4.5 s, occasional double blink)
        const r = rng(cfg.id.length * 31 + 7);
        for (let b = 8 + Math.floor(r() * 30); b < 9000; b += 60 + Math.floor(r() * 75)) {
          this.blink.set(b, 1); this.blink.set(b + 2, 0.06); this.blink.set(b + 5, 1);
          if (r() < 0.18) { this.blink.set(b + 8, 0.1); this.blink.set(b + 11, 1); b += 11; }
        }
      }
    }
    const init = cfg.init ?? {};
    if (init.L) this.arm('L', init.L, 0, 0);
    if (init.R) this.arm('R', init.R, 0, 0);
    if (init.expr) this.expression(init.expr, 0, 0);
    for (const ev of [...(cfg.timeline ?? [])].sort((a, b) => a.at - b.at)) this.event(ev);
  }

  resolve(side: 'L' | 'R', pose: string | Pose, offset: V3 = [0, 0, 0]): ArmVal {
    const P = typeof pose === 'string' ? ARM_POSES[pose] : pose;
    if (!P) throw new Error(`unknown arm pose ${pose}`);
    const sx = side === 'L' ? 1 : -1;
    const t: V3 = P.abs ? P.t : [sx * P.t[0], P.t[1], P.t[2]];
    const pole: V3 = P.abs ? P.pole : [sx * P.pole[0], P.pole[1], P.pole[2]];
    return { t: [t[0] + offset[0], t[1] + offset[1], t[2] + offset[2]], pole, finger: typeof pose === 'string' && pose.startsWith('point') ? 1 : 0 };
  }

  arm(side: 'L' | 'R', pose: string | Pose, frame: number, trans = 8, offset: V3 = [0, 0, 0]) {
    const a = this.arms[side];
    const prev = this.armState[side];
    a.t.set(frame, prev.t);
    a.pole.set(frame, prev.pole);
    a.finger.set(frame, prev.finger);
    const nv = this.resolve(side, pose, offset);
    const e = this.life?.overshoot && trans >= 5 ? 'outBack' : undefined; // ep024: eased gesture with a small overshoot
    a.t.set(frame + trans, nv.t, e);
    a.pole.set(frame + trans, nv.pole);
    a.finger.set(frame + trans, nv.finger);
    this.armState[side] = nv;
  }

  expression(name: string, frame: number, trans = 5) {
    const keys = ['browZ', 'browRot', 'eyes', 'smile', 'frown', 'open', 'round'];
    const prev = EXPRESSIONS[this.exprState];
    const next = EXPRESSIONS[name];
    if (!next) throw new Error(`unknown expression ${name}`);
    keys.forEach((k, i) => {
      this.face[k].set(frame, prev[i]);
      this.face[k].set(frame + trans, next[i]);
    });
    this.exprState = name;
  }

  chestWorld(frame: number) {
    const local = fk(this.poseAt(frame));
    return worldOf(local, 'chest');
  }

  event(ev: Record<string, any>) {
    const f = ev.at as number;
    const tr = ev.trans ?? 8;
    switch (ev.do) {
      case 'idle': {
        this.idle.push([f, ev.until ?? 1e9]);
        const r = rng(ev.seed ?? 3);
        let b = f + 15 + Math.floor(r() * 35);
        while (b < (ev.until ?? f + 2000) - 5 && b < f + 3000) {
          this.blink.set(b, 1);
          this.blink.set(b + 2, 0.08);
          this.blink.set(b + 4, 1);
          b += 55 + Math.floor(r() * 55);
        }
        break;
      }
      case 'arms':
        if (ev.L) this.arm('L', ev.L, f, tr);
        if (ev.R) this.arm('R', ev.R, f, tr);
        break;
      case 'expr':
        this.expression(ev.name, f, ev.trans ?? 5);
        break;
      case 'look':
        this.neck.set(f, this.neck.last());
        this.neck.set(f + tr, [ev.yaw ?? 0, ev.pitch ?? 0]);
        break;
      case 'look_at': {
        const local = this.chestWorld(f + tr).invert();
        const p = this.point(ev.target, f + tr).applyMatrix4(local).sub(HEAD_C);
        const yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(p.x, -p.y)));
        const pitch = Math.max(-0.6, Math.min(0.6, Math.atan2(p.z, Math.hypot(p.x, p.y))));
        this.neck.set(f, this.neck.last());
        this.neck.set(f + tr, [yaw, pitch]);
        break;
      }
      case 'tilt':
        this.head.set(f, this.head.last());
        this.head.set(f + tr, [ev.roll ?? 0, ev.nod ?? 0]);
        break;
      case 'lean':
        this.lean.set(f, this.lean.last());
        this.lean.set(f + tr, [ev.fwd ?? 0, ev.side ?? 0]);
        break;
      case 'talk': {
        const r = rng(ev.seed ?? 1);
        let t = f;
        while (t < ev.until) {
          this.talk.set(t, (0.35 + 0.65 * r()) * (ev.strength ?? 1));
          t += 3 + Math.floor(r() * 3);
          this.talk.set(t, 0.1);
          t += 2 + Math.floor(r() * 2);
        }
        this.talk.set(ev.until + 2, 0);
        for (let k = 0, fr = f; fr < ev.until; fr += 18, k++) this.talkNod.set(fr, 0.05 * (k % 2 ? 1 : -0.4));
        this.talkNod.set(ev.until + 6, 0);
        break;
      }
      case 'speak': {
        // ep024: mouth flap from VO word timings. words: [[f0, f1, amp?], ...] scene-local frames
        // (builder: lead + word.start*fps). Syllable-ish open/close inside each word, closed between words.
        const r = rng(ev.seed ?? 5);
        for (const w of ev.words ?? []) {
          const [a, b] = w; const amp = (w[2] ?? 1) * (ev.strength ?? 1);
          this.talk.set(Math.max(0, a - 1), 0.05);
          for (let t = a; t < b - 1; t += 3 + Math.floor(r() * 2)) { this.talk.set(t + 1, (0.45 + 0.55 * r()) * amp); this.talk.set(t + 3, 0.15 * amp); }
          this.talk.set(b + 1, 0.03);
        }
        if (ev.nod !== false) for (const [k, w] of (ev.words ?? []).entries()) if (k % 3 === 0) { this.talkNod.set(w[0], 0); this.talkNod.set(w[0] + 5, 0.035 * (k % 2 ? 1 : -1)); this.talkNod.set(w[0] + 12, 0); }
        break;
      }
      case 'drift': {
        // zero-g glide: no stepping, optional slow spin
        const o = this.origin;
        const cur = this.root.at(f) as V3;
        const to = ev.to ?? [cur[0] - o[0], cur[1] - o[1]];
        this.root.set(f, cur);
        this.root.set(ev.until, [o[0] + to[0], o[1] + to[1], to[2] !== undefined ? o[2] + to[2] : cur[2]]);
        if (ev.spin) {
          this.yaw.set(f, this.yaw.at(f));
          this.yaw.set(ev.until, this.yaw.at(f) + (ev.spin * Math.PI) / 180);
        }
        break;
      }
      case 'walk': {
        const o = this.origin;
        const p0: V3 = [o[0] + ev.from[0], o[1] + ev.from[1], this.root.last()[2]];
        const p1: V3 = [o[0] + ev.to[0], o[1] + ev.to[1], this.root.last()[2]];
        const yaw = Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]));
        this.yaw.set(f, yaw);
        this.root.set(f, p0);
        this.root.set(ev.until, p1);
        const step = ev.step ?? 16;
        for (let fr = f, i = 0; fr <= ev.until; fr += step, i++) {
          const ph = i % 2 === 0 ? 1 : -1;
          const last = fr + step > ev.until;
          const amp = last ? 0 : 0.42;
          for (const [side, sg] of [['L', 1], ['R', -1]] as const) {
            this.legs[side].th.set(fr, -amp * ph * sg);
            this.legs[side].kn.set(fr, last ? 0 : ph * sg < 0 ? 0.55 : 0.1);
            this.arm(side, 'rest', fr, 1, [0, 0.13 * ph * sg * (last ? 0 : 1), 0.03]);
          }
          this.hipsZ.set(fr, HIP_Z + (last ? 0 : 0.025));
          const mid = fr + Math.floor(step / 2);
          if (mid < ev.until) this.hipsZ.set(mid, HIP_Z - 0.012);
        }
        this.arm('L', 'rest', ev.until, 4);
        this.arm('R', 'rest', ev.until, 4);
        break;
      }
      case 'turn':
        this.yaw.set(f, this.yaw.last());
        this.yaw.set(f + tr, ((ev.facing ?? 0) * Math.PI) / 180);
        break;
      case 'hop':
        this.hipsZ.set(f, HIP_Z);
        this.hipsZ.set(f + 4, HIP_Z + 0.06);
        this.hipsZ.set(f + 9, HIP_Z);
        break;
      case 'wave': {
        this.arm(ev.side ?? 'R', 'wave', f, 8);
        let k = 0;
        for (let fr = f + 8; fr < ev.until - 6; fr += 6, k++) this.arm(ev.side ?? 'R', 'wave', fr, 6, [k % 2 ? 0.06 : -0.06, 0, 0]);
        this.arm(ev.side ?? 'R', 'rest', ev.until - 6, 10);
        break;
      }
      case 'xray':
        this.xray.set(f, this.xray.last());
        this.xray.set(f + (ev.dur ?? 15), 1);
        break;
      case 'elder':
        this.elder.set(f, this.elder.at(f));
        this.elder.set(f + (ev.dur ?? 8), 1);
        break;
      case 'young':
        this.elder.set(f, this.elder.at(f));
        this.elder.set(f + (ev.dur ?? 8), 0);
        break;
      case 'cpr': {
        // chest compressions: rhythmic forward lean, ~110/min
        const end = ev.until ?? f + 90;
        const base = ev.fwd ?? 0.32;
        for (let fr = f, k = 0; fr < end; fr += 8, k++) this.lean.set(fr, [base + (k % 2 ? 0 : 0.12), 0]);
        this.lean.set(end + 6, [base, 0]);
        break;
      }
      case 'shiver':
        this.shivers.push([f, ev.until ?? f + 20, ev.amp ?? 0.012]);
        break;
      case 'xray_off':
        this.xray.set(f, this.xray.last());
        this.xray.set(f + (ev.dur ?? 10), 0);
        break;
      case 'brain_glow': {
        const ci = this.colors.indexOf(ev.color ?? '#7FC8FF');
        const idx = ci >= 0 ? ci : this.colors.push(ev.color) - 1;
        this.brainColor.set(f, idx);
        this.brainGlow.set(f, this.brainGlow.at(f));
        this.brainGlow.set(f + (ev.dur ?? 10), ev.strength ?? 1);
        if (ev.hold !== undefined) {
          this.brainGlow.set(f + (ev.dur ?? 10) + ev.hold, ev.strength ?? 1);
          this.brainGlow.set(f + (ev.dur ?? 10) + ev.hold + (ev.fade ?? 8), 0);
        }
        break;
      }
      case 'stand':
      case 'sit': {
        // sw06: rise from / sink into the seat; root slides `fwd` m along facing so the feet stay planted
        const up = ev.do === 'stand';
        const dur = ev.dur ?? 18;
        if (!this.sitAmt) this.sitAmt = new Track<number>(this.sitting ? 1 : 0);
        this.sitting = true;
        this.sitAmt.set(f, up ? 1 : 0);
        this.sitAmt.set(f + dur, up ? 0 : 1);
        const yaw = this.yaw.at(f);
        const d = (ev.fwd ?? 0.28) * (up ? 1 : -1);
        const cur = this.root.at(f) as V3;
        this.root.set(f, cur);
        this.root.set(f + dur, [cur[0] + Math.sin(yaw) * d, cur[1] - Math.cos(yaw) * d, cur[2]]);
        this.lean.set(f, this.lean.last());
        this.lean.set(f + Math.round(dur * 0.45), [0.38, 0]);
        this.lean.set(f + dur + 6, [0, 0]);
        break;
      }
      case 'blink':
        this.blink.set(f, 1);
        this.blink.set(f + 2, 0.08);
        this.blink.set(f + 4, 1);
        break;
      case 'reach': {
        const side = ev.side ?? 'R';
        const inv = this.chestWorld(f + tr).invert();
        const local = this.point(ev.target, f + tr).applyMatrix4(inv);
        const sx = side === 'L' ? 1 : -1;
        this.arm(side, { t: [local.x, local.y, local.z], pole: [sx, 0.6, -1], abs: true }, f, tr);
        break;
      }
      default:
        throw new Error(`unknown actor action ${ev.do}`);
    }
  }

  poseAt(f: number): CharPose {
    const idleOn = !!this.life || this.idle.some(([a, b]) => f >= a && f <= b);
    const breath = idleOn ? (0.5 + 0.5 * Math.sin((f / 60) * Math.PI * 2)) * (this.life?.breath ?? 1) : 0;
    const arm = (s: 'L' | 'R') => ({ t: this.arms[s].t.at(f) as V3, pole: this.arms[s].pole.at(f) as V3, finger: this.arms[s].finger.at(f) });
    const fc = this.face;
    let neck = this.neck.at(f);
    let head = this.head.at(f);
    if (this.life && this.life.head > 0) { // slow organic head drift (layered sines, deterministic)
      const h = this.life.head, s = this.cfg.id.length;
      neck = [neck[0] + h * (Math.sin(f / 41 + s) * 0.6 + Math.sin(f / 17.3 + 2 * s) * 0.25), neck[1] + h * 0.5 * Math.sin(f / 53 + s * 0.7)];
      head = [head[0] + h * 0.4 * Math.sin(f / 37 + s * 1.3), head[1]];
    }
    let root = this.root.at(f) as V3;
    for (const [a, b, amp] of this.shivers) {
      if (f >= a && f < b) {
        const r = rng(f * 977 + 3);
        root = [root[0] + (r() * 2 - 1) * amp, root[1], root[2] + (r() * 2 - 1) * amp * 0.5];
      }
    }
    let lean = this.lean.at(f) as [number, number];
    let legs: CharPose['legs'] = { L: [this.legs.L.th.at(f), this.legs.L.kn.at(f)], R: [this.legs.R.th.at(f), this.legs.R.kn.at(f)] };
    let hipsZ = this.hipsZ.at(f);
    if (this.kneeling) {
      hipsZ = hipsZ - HIP_Z + 0.47;
      legs = { L: [legs.L[0] - 0.15, legs.L[1] + 1.55], R: [legs.R[0] - 0.15, legs.R[1] + 1.55] };
    }
    if (this.sitting) {
      const s = this.sitAmt ? this.sitAmt.at(f) : 1;
      hipsZ = hipsZ + (this.seat - HIP_Z) * s;
      legs = { L: [legs.L[0] - 1.45 * s, legs.L[1] + 1.45 * s], R: [legs.R[0] - 1.45 * s, legs.R[1] + 1.45 * s] };
    }
    if (this.floating) {
      // zero gravity: hover, bob, gentle tumble, relaxed bent legs
      root = [root[0], root[1], root[2] + 0.42 + 0.05 * Math.sin(f / 22)];
      lean = [lean[0] + 0.06 * Math.sin(f / 37), lean[1] + 0.05 * Math.sin(f / 29)];
      legs = { L: [legs.L[0] + 0.35 + 0.08 * Math.sin(f / 31), legs.L[1] + 0.55], R: [legs.R[0] - 0.12 + 0.08 * Math.sin(f / 27), legs.R[1] + 0.35] };
    }
    return {
      root,
      yaw: this.yaw.at(f),
      lying: this.lying,
      hipsZ,
      sway: idleOn ? 0.025 * Math.sin(f / 23) : 0,
      lean,
      breath,
      neck: [neck[0], neck[1]],
      head: [head[0], head[1] + this.talkNod.at(f)],
      arms: { L: arm('L'), R: arm('R') },
      legs,
      face: {
        browZ: fc.browZ.at(f), browRot: fc.browRot.at(f), eyes: fc.eyes.at(f) * this.blink.at(f), smile: fc.smile.at(f),
        frown: fc.frown.at(f, true), open: Math.max(fc.open.at(f), this.talk.at(f)), round: fc.round.at(f, true),
        eyeOff: [Math.max(-0.012, Math.min(0.012, neck[0] * 0.02)), Math.max(-0.01, Math.min(0.01, neck[1] * 0.02))],
      },
      xray: this.xray.at(f),
      elder: this.elder.at(f),
      brainGlow: this.brainGlow.at(f),
      brainColor: this.colors[this.brainColor.at(f, true)] ?? '#7FC8FF',
    };
  }

  /** world position of a named anchor at frame f */
  anchor(part: string, f: number): THREE.Vector3 {
    const local = fk(this.poseAt(f));
    const map: Record<string, [string, V3]> = {
      head: ['headC', [0, 0, 0]], brain: ['headC', [0, 0.01, 0.025]], chest: ['chest', [0, 0, 0]], hips: ['hips', [0, 0, 0]],
      root: ['root', [0, 0, 0]], handR: ['handR', [0, 0, 0]], handL: ['handL', [0, 0, 0]],
    };
    const [node, off] = map[part] ?? ['headC', [0, 0, 0]];
    return new THREE.Vector3(...off).applyMatrix4(worldOf(local, node));
  }
}
