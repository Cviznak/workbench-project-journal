// Self-contained pure-JS QR code generator (Model 2, Byte Mode, Level L/M)
// Clean, dependency-free implementation for offline workshop QR labels.

const QR = (() => {
  const EXP = new Uint8Array(256);
  const LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 256; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[(LOG[a] + LOG[b]) % 255];
  }

  function rsGenPoly(n) {
    let poly = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= gfMul(poly[j], EXP[i]);
        next[j + 1] ^= poly[j];
      }
      poly = next;
    }
    return poly;
  }

  function rsCompute(data, ecCount) {
    const gen = rsGenPoly(ecCount);
    const result = new Array(ecCount).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ result[0];
      result.shift();
      result.push(0);
      for (let j = 0; j < ecCount; j++) {
        result[j] ^= gfMul(gen[j], factor);
      }
    }
    return result;
  }

  // Version specs: [version, totalBytes, ecBytes, remainderBits]
  // Level M:
  // V1: 21x21, 16 data, 10 EC
  // V2: 25x25, 28 data, 16 EC
  // V3: 29x29, 44 data, 26 EC
  // V4: 33x33, 64 data, 36 EC
  // V5: 37x37, 86 data, 48 EC (in 2 blocks)
  // V6: 41x41, 108 data, 64 EC (in 4 blocks)
  const VERSIONS = [
    { v: 1, size: 21, dataCap: 14, ecBytes: 7, totalBytes: 26, ecBlocks: 1 },
    { v: 2, size: 25, dataCap: 26, ecBytes: 10, totalBytes: 44, ecBlocks: 1 },
    { v: 3, size: 29, dataCap: 42, ecBytes: 15, totalBytes: 70, ecBlocks: 1 },
    { v: 4, size: 33, dataCap: 62, ecBytes: 20, totalBytes: 100, ecBlocks: 1 },
    { v: 5, size: 37, dataCap: 84, ecBytes: 26, totalBytes: 134, ecBlocks: 1 },
    { v: 6, size: 41, dataCap: 106, ecBytes: 18, totalBytes: 172, ecBlocks: 2 },
    { v: 7, size: 45, dataCap: 122, ecBytes: 20, totalBytes: 196, ecBlocks: 2 }
  ];

  function getAlignmentPatternCoords(v) {
    if (v === 1) return [];
    if (v === 2) return [6, 18];
    if (v === 3) return [6, 22];
    if (v === 4) return [6, 26];
    if (v === 5) return [6, 30];
    if (v === 6) return [6, 34];
    if (v === 7) return [6, 22, 38];
    return [6, v * 4 + 10];
  }

  function encode(text) {
    const utf8 = new TextEncoder().encode(text);
    let chosen = null;
    for (const ver of VERSIONS) {
      if (utf8.length <= ver.dataCap) {
        chosen = ver;
        break;
      }
    }
    if (!chosen) chosen = VERSIONS[VERSIONS.length - 1];

    // Data bits: Mode (0100) = 4 bits, Count = 8 bits, data = len * 8 bits
    const bits = [];
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >>> i) & 1);
      }
    }
    pushBits(0b0100, 4); // 8-bit byte mode
    pushBits(utf8.length, 8); // character count
    for (let i = 0; i < utf8.length; i++) {
      pushBits(utf8[i], 8);
    }
    // Terminator
    const capBits = chosen.dataCap * 8;
    for (let i = 0; i < 4 && bits.length < capBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    // Pad bytes
    const pad = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < capBits) {
      pushBits(pad[padIdx % 2], 8);
      padIdx++;
    }

    // Convert bits to data bytes
    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataBytes.push(b);
    }

    // Compute Error Correction
    const ecPerBlock = chosen.ecBytes;
    const blocks = chosen.ecBlocks;
    const blockDataLen = Math.floor(dataBytes.length / blocks);
    const dataBlocks = [];
    const ecBlocks = [];

    for (let b = 0; b < blocks; b++) {
      const start = b * blockDataLen;
      const end = (b === blocks - 1) ? dataBytes.length : start + blockDataLen;
      const bData = dataBytes.slice(start, end);
      dataBlocks.push(bData);
      ecBlocks.push(rsCompute(bData, ecPerBlock));
    }

    // Interleave
    const finalBytes = [];
    const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < blocks; b++) {
        if (i < dataBlocks[b].length) finalBytes.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < blocks; b++) {
        finalBytes.push(ecBlocks[b][i]);
      }
    }

    // Build matrix
    const size = chosen.size;
    const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
    const isReserved = Array.from({ length: size }, () => new Array(size).fill(false));

    function setModule(r, c, val, reserved = true) {
      matrix[r][c] = val;
      if (reserved) isReserved[r][c] = true;
    }

    // 1. Finder patterns
    function addFinder(top, left) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const row = top + r;
          const col = left + c;
          if (row < 0 || row >= size || col < 0 || col >= size) continue;
          const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(row, col, isBlack ? 1 : 0);
        }
      }
    }
    addFinder(0, 0);
    addFinder(0, size - 7);
    addFinder(size - 7, 0);

    // 2. Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setModule(6, i, i % 2 === 0 ? 1 : 0);
      setModule(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // 3. Dark module
    setModule(size - 8, 8, 1);

    // 4. Alignment patterns
    const alignCoords = getAlignmentPatternCoords(chosen.v);
    for (const r of alignCoords) {
      for (const c of alignCoords) {
        if (isReserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(r + dr, c + dc, isBlack ? 1 : 0);
          }
        }
      }
    }

    // 5. Reserve format info
    for (let i = 0; i < 9; i++) {
      if (!isReserved[8][i]) setModule(8, i, 0);
      if (!isReserved[i][8]) setModule(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!isReserved[8][size - 1 - i]) setModule(8, size - 1 - i, 0);
      if (!isReserved[size - 1 - i][8]) setModule(size - 1 - i, 8, 0);
    }

    // 6. Place data bits
    let byteIdx = 0;
    let bitIdx = 7;
    let upwards = true;

    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // skip timing column
      for (let vert = 0; vert < size; vert++) {
        const r = upwards ? (size - 1 - vert) : vert;
        for (let colOffset = 0; colOffset < 2; colOffset++) {
          const c = right - colOffset;
          if (isReserved[r][c]) continue;
          let bit = 0;
          if (byteIdx < finalBytes.length) {
            bit = (finalBytes[byteIdx] >>> bitIdx) & 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              byteIdx++;
            }
          }
          // Mask pattern 0: (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0 ? 1 : 0;
          matrix[r][c] = bit ^ mask;
        }
      }
      upwards = !upwards;
    }

    // 7. Format bits for Level L/M (Mask 000)
    // Level L: 01, Mask 000 -> 01000 -> BCH 15 bits: 111011111000100 ^ 101010000010010 = 010001111010110
    const FORMAT_BITS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
    const MASK_FORMAT = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    const maskedFormat = FORMAT_BITS.map((b, i) => b ^ MASK_FORMAT[i]);

    // Top-left format info
    for (let i = 0; i < 6; i++) matrix[8][i] = maskedFormat[i];
    matrix[8][7] = maskedFormat[6];
    matrix[8][8] = maskedFormat[7];
    matrix[7][8] = maskedFormat[8];
    for (let i = 9; i < 15; i++) matrix[14 - i][8] = maskedFormat[i];

    // Bottom-left / Top-right format info
    for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = maskedFormat[i];
    for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = maskedFormat[i];

    return { size, matrix };
  }

  function toSVG(text, { cellSize = 4, margin = 2 } = {}) {
    const { size, matrix } = encode(text);
    const totalSize = (size + margin * 2) * cellSize;
    let paths = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths.trim()}" fill="#000000"/></svg>`;
  }

  return { encode, toSVG };
})();

if (typeof window !== "undefined") window.QR = QR;
if (typeof globalThis !== "undefined") globalThis.QR = QR;
if (typeof module !== "undefined") module.exports = QR;
