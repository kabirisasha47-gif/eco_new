/**
 * Pure TypeScript ISO/IEC 18004 QR Code matrix generator (Byte mode, ECC Level L, Versions 1..6).
 * Generates a scannable boolean[][] matrix with zero external dependencies.
 */

// Version capacities for Byte mode at ECC Level L (total codewords, ec codewords per block, data codewords)
const VERSION_TABLE: Record<
  number,
  {
    size: number;
    totalCodewords: number;
    ecCodewords: number;
    dataCapacity: number;
    align: number[];
  }
> = {
  1: { size: 21, totalCodewords: 26, ecCodewords: 7, dataCapacity: 17, align: [] },
  2: { size: 25, totalCodewords: 44, ecCodewords: 10, dataCapacity: 32, align: [6, 18] },
  3: { size: 29, totalCodewords: 70, ecCodewords: 15, dataCapacity: 53, align: [6, 22] },
  4: { size: 33, totalCodewords: 100, ecCodewords: 20, dataCapacity: 78, align: [6, 26] },
  5: { size: 37, totalCodewords: 134, ecCodewords: 26, dataCapacity: 106, align: [6, 30] },
  6: { size: 41, totalCodewords: 172, ecCodewords: 36, dataCapacity: 134, align: [6, 34] },
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]!;
      next[j + 1] ^= gfMul(poly[j]!, root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j]!, coef);
      }
    }
  }
  return msg.slice(data.length);
}

function interleaveVersion6IfNeeded(data: Uint8Array, version: number, ecLen: number): Uint8Array {
  if (version !== 6) {
    const ec = rsEncode(data, ecLen);
    const out = new Uint8Array(data.length + ec.length);
    out.set(data, 0);
    out.set(ec, data.length);
    return out;
  }
  // Version 6-L uses 2 blocks of (68 data, 18 ec)
  const b1 = data.slice(0, 68);
  const b2 = data.slice(68, 136);
  const ec1 = rsEncode(b1, 18);
  const ec2 = rsEncode(b2, 18);
  const out = new Uint8Array(172);
  let idx = 0;
  for (let i = 0; i < 68; i++) {
    out[idx++] = b1[i]!;
    out[idx++] = b2[i]!;
  }
  for (let i = 0; i < 18; i++) {
    out[idx++] = ec1[i]!;
    out[idx++] = ec2[i]!;
  }
  return out;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  while (version <= 6 && VERSION_TABLE[version]!.dataCapacity < bytes.length) {
    version++;
  }
  if (version > 6) version = 6;
  const spec = VERSION_TABLE[version]!;
  const dataBytes = bytes.slice(0, spec.dataCapacity);

  // Build bit stream: 0100 (Byte mode) + 8-bit length + bytes + terminator
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(dataBytes.length, 8);
  for (const b of dataBytes) pushBits(b, 8);

  const totalDataBits = (spec.totalCodewords - spec.ecCodewords) * 8;
  for (let i = 0; i < 4 && bits.length < totalDataBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2]!, 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(bits.length / 8);
  for (let i = 0; i < dataCodewords.length; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]!;
    dataCodewords[i] = b;
  }

  const codewords = interleaveVersion6IfNeeded(dataCodewords, version, spec.ecCodewords);

  const size = spec.size;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r]![c] = dark;
      isFunction[r]![c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r0 + dr;
        const cc = c0 + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(rr, cc, inOuter && (onBorder || inInner));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment pattern
  if (spec.align.length === 2) {
    const r0 = spec.align[1]!;
    const c0 = spec.align[1]!;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        setFunctionModule(r0 + dr, c0 + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
  }

  // Reserve format info areas + dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false);
      setFunctionModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false);
    setFunctionModule(size - 1 - i, 8, false);
  }
  setFunctionModule(size - 8, 8, true);

  // Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = rightCol - j;
        if (!isFunction[r]![c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark = ((codewords[bitIdx >> 3]! >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Apply mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) dark = !dark;
          modules[r]![c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Format information for ECC Level L (01) and Mask 0 (000) -> 0x77c4
  const formatBits = 0x77c4;
  const getFormatBit = (i: number) => ((formatBits >> i) & 1) === 1;

  for (let i = 0; i <= 5; i++) modules[8]![i] = getFormatBit(i);
  modules[8]![7] = getFormatBit(6);
  modules[8]![8] = getFormatBit(7);
  modules[7]![8] = getFormatBit(8);
  for (let i = 9; i < 15; i++) modules[14 - i]![8] = getFormatBit(i);

  for (let i = 0; i < 8; i++) modules[8]![size - 1 - i] = getFormatBit(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i]![8] = getFormatBit(i);

  return modules;
}
