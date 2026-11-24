/**
 * Code128B SVG barcode renderer.
 * Encodes ASCII 32-127 using Code128 subset B.
 */

// Code128 encoding table: index -> 11-module pattern (bar widths as string of digits)
// Source: standard Code128 symbol table
const CODE128_PATTERNS: string[] = [
  '11011001100', // 0  (space)  value 0
  '11001101100', // 1  !
  '11001100110', // 2  "
  '10010011000', // 3  #
  '10010001100', // 4  $
  '10001001100', // 5  %
  '10011001000', // 6  &
  '10011000100', // 7  \'
  '10001100100', // 8  (
  '11001001000', // 9  )
  '11001000100', // 10 *
  '11000100100', // 11 +
  '10110011100', // 12 ,
  '10011011100', // 13 -
  '10011001110', // 14 .
  '10111001100', // 15 /
  '10011101100', // 16 0
  '10011100110', // 17 1
  '11001110010', // 18 2
  '11001011100', // 19 3
  '11001001110', // 20 4
  '11011100100', // 21 5
  '11001110100', // 22 6
  '11101101110', // 23 7
  '11101001100', // 24 8
  '11100101100', // 25 9
  '11100100110', // 26 :
  '11101100100', // 27 ;
  '11100110100', // 28 <
  '11100110010', // 29 =
  '11011011000', // 30 >
  '11011000110', // 31 ?
  '11000110110', // 32 @
  '10100011000', // 33 A
  '10001011000', // 34 B
  '10001000110', // 35 C
  '10110001000', // 36 D
  '10001101000', // 37 E
  '10001100010', // 38 F
  '11010001000', // 39 G
  '11000101000', // 40 H
  '11000100010', // 41 I
  '10110111000', // 42 J
  '10110001110', // 43 K
  '10001101110', // 44 L
  '10111011000', // 45 M
  '10111000110', // 46 N
  '10001110110', // 47 O
  '11101110110', // 48 P
  '11010001110', // 49 Q
  '11000101110', // 50 R
  '11011101000', // 51 S
  '11011100010', // 52 T
  '11011101110', // 53 U
  '11101011000', // 54 V
  '11101000110', // 55 W
  '11100010110', // 56 X
  '11101101000', // 57 Y
  '11101100010', // 58 Z
  '11100011010', // 59 [
  '11101111010', // 60 backslash
  '11001000010', // 61 ]
  '13110010010', // 62 ^ -- will not appear in simple impl; use fallback
  '10100001100', // 63 _
  '10010001110', // 64 `
  '10000101100', // 65 a
  '10000100110', // 66 b
  '10110010000', // 67 c
  '10110000100', // 68 d
  '10011010000', // 69 e
  '10011000010', // 70 f
  '10000110100', // 71 g
  '10000110010', // 72 h
  '11000010010', // 73 i
  '11001010000', // 74 j
  '11110111010', // 75 k
  '11000010100', // 76 l
  '10001111010', // 77 m
  '10100111100', // 78 n
  '10010111100', // 79 o
  '10010011110', // 80 p
  '10111100100', // 81 q
  '10011110100', // 82 r
  '10011110010', // 83 s
  '11110100100', // 84 t
  '11110010100', // 85 u
  '11110010010', // 86 v
  '11011011110', // 87 w
  '11011110110', // 88 x
  '11110110110', // 89 y
  '10101111000', // 90 z
  '10100011110', // 91 {
  '10001011110', // 92 |
  '10111101000', // 93 }
  '10111100010', // 94 ~
  '11110101000', // 95 DEL (127)
  '11110100010', // 96
  '10111011110', // 97
  '10111101110', // 98
  '11101011110', // 99
  '11110101110', // 100
  '11010000100', // 101 FNC3
  '11010010000', // 102 FNC2
  '11010011100', // 103 START A
  '11010001100', // 104 START B
  '11010011000', // 105 START C
  // Stop symbol (13 modules: 1100011101011)
];

const START_B = 104;
const STOP_PATTERN = '1100011101011'; // 13 modules
const TERMINATION_BAR = '11'; // 2 dark modules

/**
 * Returns SVG markup for a Code128B barcode of the given text.
 */
export function code128Svg(
  text: string,
  options?: { width?: number; height?: number; showText?: boolean }
): string {
  const moduleWidth = 2;
  const height = options?.height ?? 60;
  const showText = options?.showText !== false;
  const fontSize = 10;
  const textHeight = showText ? fontSize + 4 : 0;
  const totalHeight = height + textHeight;

  // Build the bar pattern
  let modules = '';
  let checksum = START_B;

  // Start B
  modules += CODE128_PATTERNS[START_B];

  // Data characters
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    if (code < 32 || code > 126) continue; // skip non-printable
    const val = code - 32; // Code128B: char 32 -> index 0
    checksum += (i + 1) * val;
    modules += CODE128_PATTERNS[val];
  }

  // Checksum
  const checksumVal = checksum % 103;
  modules += CODE128_PATTERNS[checksumVal];

  // Stop + termination
  modules += STOP_PATTERN + TERMINATION_BAR;

  // Quiet zone (10 modules each side)
  const quietZone = moduleWidth * 10;
  const svgWidth = options?.width ?? (modules.length * moduleWidth + quietZone * 2);

  // Render bars
  let bars = '';
  let x = quietZone;
  let dark = true; // starts with a bar (dark)
  for (const ch of modules) {
    const w = parseInt(ch) * moduleWidth;
    if (dark) {
      bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
    }
    x += w;
    dark = !dark;
  }

  const textEl = showText
    ? `<text x="${svgWidth / 2}" y="${height + fontSize + 2}" font-family="monospace" font-size="${fontSize}" text-anchor="middle" fill="#000">${escapeXml(text)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${totalHeight}" viewBox="0 0 ${svgWidth} ${totalHeight}"><rect width="${svgWidth}" height="${totalHeight}" fill="#fff"/>${bars}${textEl}</svg>`;
}

/** Encode SVG as a data: URI for use in <img src> */
export function code128DataUrl(text: string, options?: { width?: number; height?: number; showText?: boolean }): string {
  const svg = code128Svg(text, options);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
