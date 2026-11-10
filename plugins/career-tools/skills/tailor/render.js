#!/usr/bin/env node
'use strict';
// Render a resume or cover letter draft (JSON) to DOCX and PDF with no dependencies.
//
//   node render.js paths <application-slug>
//       Create the output folder and print where drafts and outputs go, as JSON.
//       Output root: $CAREER_TOOLS_OUTPUT_DIR, else ./applications.
//   node render.js render <draft.json> <output path without extension>
//       Write <output>.docx and <output>.pdf; print their paths and the PDF page count.
//
// The PDF uses the standard Times / Helvetica fonts every reader ships, so text is limited
// to the Windows-1252 character set. Anything outside it is rejected before writing, so the
// DOCX and PDF never disagree.

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------- fonts and characters

const times = (head, digits, mid, caps, punct, lower, tail) =>
  [...head, ...Array(10).fill(digits), ...mid, ...caps, ...punct, ...lower, ...tail];

// Adobe AFM advance widths for ASCII 32..126, in 1/1000 em.
const W = {
  'Times-Roman': times(
    [250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278], 500,
    [278, 278, 564, 564, 564, 444, 921],
    [722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611],
    [333, 278, 333, 469, 500, 333],
    [444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444],
    [480, 200, 480, 541]),
  'Times-Bold': times(
    [250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278], 500,
    [333, 333, 570, 570, 570, 500, 930],
    [722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667],
    [333, 278, 333, 581, 500, 333],
    [500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500, 556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444],
    [394, 220, 394, 520]),
  'Times-Italic': times(
    [250, 333, 420, 500, 500, 833, 778, 214, 333, 333, 500, 675, 250, 333, 250, 278], 500,
    [333, 333, 675, 675, 675, 500, 920],
    [611, 611, 667, 722, 611, 611, 722, 722, 333, 444, 667, 556, 833, 667, 722, 611, 722, 611, 500, 556, 722, 611, 833, 611, 556, 556],
    [389, 278, 389, 422, 500, 333],
    [500, 500, 444, 500, 444, 278, 500, 500, 278, 278, 444, 278, 722, 500, 500, 500, 500, 389, 389, 278, 500, 444, 667, 444, 444, 389],
    [400, 275, 400, 541]),
  'Times-BoldItalic': times(
    [250, 389, 555, 500, 500, 833, 778, 278, 333, 333, 500, 570, 250, 333, 250, 278], 500,
    [333, 333, 570, 570, 570, 500, 832],
    [667, 667, 667, 722, 667, 667, 722, 778, 389, 500, 667, 611, 889, 722, 722, 611, 722, 667, 556, 611, 722, 667, 889, 667, 611, 611],
    [333, 278, 333, 570, 500, 333],
    [500, 500, 444, 500, 444, 333, 500, 556, 278, 278, 500, 278, 778, 556, 500, 500, 500, 389, 389, 278, 556, 444, 667, 500, 444, 389],
    [348, 220, 348, 570]),
  Helvetica: times(
    [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278], 556,
    [278, 278, 584, 584, 584, 556, 1015],
    [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611],
    [278, 278, 278, 469, 556, 333],
    [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500],
    [334, 260, 334, 584]),
  'Helvetica-Bold': times(
    [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278], 556,
    [333, 333, 584, 584, 584, 611, 975],
    [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611],
    [333, 278, 333, 584, 556, 333],
    [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500],
    [389, 280, 389, 584]),
};
W['Helvetica-Oblique'] = W.Helvetica;
W['Helvetica-BoldOblique'] = W['Helvetica-Bold'];

// Widths for the Windows-1252 punctuation a resume actually uses: quotes, bullet, dashes,
// ellipsis, multiplication sign.
const extra = (q1, q2, dash, emdash, times_) =>
  ({ 0x91: q1, 0x92: q1, 0x93: q2, 0x94: q2, 0x95: 350, 0x96: dash, 0x97: emdash, 0x85: emdash, 0xd7: times_ });
const X = {
  'Times-Roman': extra(333, 444, 500, 1000, 564),
  'Times-Bold': extra(333, 500, 500, 1000, 570),
  'Times-Italic': extra(333, 556, 500, 889, 675),
  'Times-BoldItalic': extra(333, 500, 500, 1000, 570),
  Helvetica: extra(222, 333, 556, 1000, 584),
  'Helvetica-Bold': extra(278, 500, 556, 1000, 584),
};
X['Helvetica-Oblique'] = X.Helvetica;
X['Helvetica-BoldOblique'] = X['Helvetica-Bold'];

const FAMILIES = {
  serif: { docx: 'Times New Roman', fallback: 500, faces: { r: 'Times-Roman', b: 'Times-Bold', i: 'Times-Italic', bi: 'Times-BoldItalic' } },
  sans: { docx: 'Arial', fallback: 556, faces: { r: 'Helvetica', b: 'Helvetica-Bold', i: 'Helvetica-Oblique', bi: 'Helvetica-BoldOblique' } },
};
const PAPER = { a4: { w: 595.28, h: 841.89, tw: 11906, th: 16838 }, letter: { w: 612, h: 792, tw: 12240, th: 15840 } };

const CP1252 = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89,
  'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95,
  '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
};
const UNICODE_SPACE = /[\u00a0\u2000-\u200a\u202f\u205f]/;

function cp1252(ch) {
  if (UNICODE_SPACE.test(ch)) return 0x20;
  const c = ch.codePointAt(0);
  if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff)) return c;
  return CP1252[ch] ?? null;
}

function charWidth(font, ch) {
  const code = cp1252(ch);
  if (code === null) return font.startsWith('Times') ? 500 : 556;
  if (code <= 0x7e) return W[font][code - 32];
  if (X[font][code] !== undefined) return X[font][code];
  const base = ch.normalize('NFD').codePointAt(0);
  if (base >= 0x20 && base <= 0x7e) return W[font][base - 32];
  return font.startsWith('Times') ? 500 : 556;
}

const textWidth = (text, font, size) => {
  let w = 0;
  for (const ch of text) w += charWidth(font, ch);
  return (w * size) / 1000;
};

// ---------------------------------------------------------------- input

function fail(message) {
  process.stderr.write(`render: ${message}\n`);
  process.exit(1);
}

const INLINE = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

function parseInline(src) {
  const runs = [];
  let last = 0;
  let m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(src))) {
    if (m.index > last) runs.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ text: m[1], link: m[2] });
    else if (m[3] !== undefined) runs.push({ text: m[3], bold: true });
    else runs.push({ text: m[4], italic: true });
    last = INLINE.lastIndex;
  }
  if (last < src.length) runs.push({ text: src.slice(last) });
  return runs;
}

function validate(doc) {
  const errors = [];
  const strings = [];
  const str = (v, at) => {
    if (typeof v !== 'string' || !v.trim()) errors.push(`${at} must be a non-empty string`);
    else strings.push(v);
  };

  if (!doc || typeof doc !== 'object') fail('the draft must be a JSON object');
  if (!['resume', 'letter'].includes(doc.kind)) errors.push('kind must be "resume" or "letter"');
  str(doc.name, 'name');
  if (doc.contact !== undefined) {
    if (!Array.isArray(doc.contact)) errors.push('contact must be an array of strings');
    else doc.contact.forEach((c, i) => str(c, `contact[${i}]`));
  }
  const style = doc.style || {};
  if (style.font !== undefined && !FAMILIES[style.font]) errors.push('style.font must be "serif" or "sans"');
  if (style.paper !== undefined && !PAPER[style.paper]) errors.push('style.paper must be "a4" or "letter"');
  if (style.size !== undefined && !(typeof style.size === 'number' && style.size >= 8 && style.size <= 14)) {
    errors.push('style.size must be a number from 8 to 14');
  }

  if (!Array.isArray(doc.sections) || !doc.sections.length) {
    errors.push('sections must be a non-empty array');
  } else {
    doc.sections.forEach((s, i) => {
      const at = `sections[${i}]`;
      if (s.heading !== undefined) str(s.heading, `${at}.heading`);
      if (!Array.isArray(s.blocks) || !s.blocks.length) {
        errors.push(`${at}.blocks must be a non-empty array`);
        return;
      }
      s.blocks.forEach((b, j) => {
        const bt = `${at}.blocks[${j}]`;
        const keys = Object.keys(b || {});
        if (keys.length !== 1) {
          errors.push(`${bt} must have exactly one key: p, bullets, or row`);
          return;
        }
        const [key] = keys;
        const v = b[key];
        if (key === 'p') str(v, `${bt}.p`);
        else if (key === 'bullets' && Array.isArray(v) && v.length) v.forEach((x, k) => str(x, `${bt}.bullets[${k}]`));
        else if (key === 'row' && Array.isArray(v) && v.length === 2) {
          str(v[0], `${bt}.row[0]`);
          if (typeof v[1] !== 'string') errors.push(`${bt}.row[1] must be a string (may be empty)`);
          else strings.push(v[1]);
        }
        else errors.push(`${bt}: "${key}" must be p (string), bullets (non-empty array), or row ([left, right])`);
      });
    });
  }

  const unsupported = new Set();
  for (const s of strings) for (const ch of s) if (ch !== '\n' && cp1252(ch) === null) unsupported.add(ch);
  if (unsupported.size) {
    const list = [...unsupported].map((c) => `"${c}" (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    errors.push(`characters the PDF fonts cannot draw: ${list.join(', ')}; replace them with plain equivalents`);
  }

  if (errors.length) fail(`invalid draft:\n  - ${errors.join('\n  - ')}`);
}

// ---------------------------------------------------------------- shared layout model

const KIND = {
  resume: { size: 10, margin: 36, nameSize: 18, nameAfter: 2, headerAfter: 2, headingBefore: 6, headingAfter: 3, rowBefore: 3, pAfter: 2, bulletAfter: 0, listAfter: 1 },
  letter: { size: 11, margin: 72, nameSize: 16, nameAfter: 2, headerAfter: 18, headingBefore: 10, headingAfter: 4, rowBefore: 6, pAfter: 10, bulletAfter: 2, listAfter: 10 },
};
const BULLET = { glyph: 4, text: 14 };
const RULE = { gap: 1, width: 0.75 };
const LINK_RGB = [0x05 / 255, 0x63 / 255, 0xc1 / 255];

function buildParas(doc) {
  const k = KIND[doc.kind];
  const size = (doc.style && doc.style.size) || k.size;
  const paras = [];
  const push = (p) => paras.push({ before: 0, after: 0, size, ...p });

  const contact = doc.contact || [];
  push({ type: 'name', runs: [{ text: doc.name, bold: true }], align: 'center', size: k.nameSize, after: contact.length ? k.nameAfter : k.headerAfter });
  contact.forEach((c, i) => push({ type: 'contact', runs: parseInline(c), align: 'center', after: i === contact.length - 1 ? k.headerAfter : 0 }));

  for (const s of doc.sections) {
    if (s.heading) push({ type: 'heading', runs: [{ text: s.heading, bold: true }], caps: true, rule: true, keepNext: true, before: k.headingBefore, after: k.headingAfter });
    for (const b of s.blocks) {
      const prev = paras[paras.length - 1].type;
      if (b.p !== undefined) push({ type: 'p', runs: parseInline(b.p), after: k.pAfter });
      else if (b.bullets) b.bullets.forEach((t, i) => push({ type: 'bullet', runs: parseInline(t), after: i === b.bullets.length - 1 ? k.listAfter : k.bulletAfter }));
      else push({ type: 'row', left: parseInline(b.row[0]), right: parseInline(b.row[1]), keepNext: true, before: prev === 'row' ? 0 : prev === 'heading' ? 1 : k.rowBefore });
    }
  }
  return paras;
}

// ---------------------------------------------------------------- DOCX

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tw = (pt) => Math.round(pt * 20);

function renderDocx(paras, doc) {
  const k = KIND[doc.kind];
  const fam = FAMILIES[(doc.style && doc.style.font) || 'serif'];
  const paper = PAPER[(doc.style && doc.style.paper) || 'a4'];
  const bodySize = paras.find((p) => p.type !== 'name').size;
  const margin = tw(k.margin);
  const links = new Map();

  const run = (r, size, caps) => {
    const rpr = [];
    if (r.link) rpr.push('<w:rStyle w:val="Hyperlink"/>');
    if (r.bold) rpr.push('<w:b/><w:bCs/>');
    if (r.italic) rpr.push('<w:i/><w:iCs/>');
    if (caps) rpr.push('<w:caps/>');
    if (size !== bodySize) rpr.push(`<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>`);
    const text = r.text.split('\n').map((t) => `<w:t xml:space="preserve">${xmlEsc(t)}</w:t>`).join('<w:br/>');
    const xml = `<w:r>${rpr.length ? `<w:rPr>${rpr.join('')}</w:rPr>` : ''}${text}</w:r>`;
    if (!r.link) return xml;
    if (!links.has(r.link)) links.set(r.link, `rId${links.size + 3}`);
    return `<w:hyperlink r:id="${links.get(r.link)}" w:history="1">${xml}</w:hyperlink>`;
  };

  const body = paras.map((p) => {
    // Child order inside w:pPr is fixed by the schema; Word rejects the file otherwise.
    const ppr = [];
    if (p.keepNext) ppr.push('<w:keepNext/>');
    if (p.type === 'bullet') ppr.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
    if (p.rule) ppr.push(`<w:pBdr><w:bottom w:val="single" w:sz="${RULE.width * 8}" w:space="${RULE.gap}" w:color="000000"/></w:pBdr>`);
    if (p.type === 'row') ppr.push(`<w:tabs><w:tab w:val="right" w:pos="${paper.tw - 2 * margin}"/></w:tabs>`);
    ppr.push(`<w:spacing w:before="${tw(p.before)}" w:after="${tw(p.after)}"/>`);
    if (p.align === 'center') ppr.push('<w:jc w:val="center"/>');
    const runs = p.type === 'row'
      ? [...p.left.map((r) => run(r, p.size)), ...(p.right.length ? ['<w:r><w:tab/></w:r>', ...p.right.map((r) => run(r, p.size))] : [])]
      : p.runs.map((r) => run(r, p.size, p.caps));
    return `<w:p><w:pPr>${ppr.join('')}</w:pPr>${runs.join('')}</w:p>`;
  }).join('');

  const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const NS_PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const font = xmlEsc(fam.docx);
  const title = `${doc.name} - ${doc.kind === 'resume' ? 'Resume' : 'Cover Letter'}`;

  const files = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${NS_PR}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    'docProps/core.xml': `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(title)}</dc:title><dc:creator>${xmlEsc(doc.name)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
    'word/document.xml': `${XML}<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>${body}<w:sectPr><w:pgSz w:w="${paper.tw}" w:h="${paper.th}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    'word/styles.xml': `${XML}<w:styles xmlns:w="${NS_W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/><w:sz w:val="${bodySize * 2}"/><w:szCs w:val="${bodySize * 2}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`,
    'word/numbering.xml': `${XML}<w:numbering xmlns:w="${NS_W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${tw(BULLET.text)}" w:hanging="${tw(BULLET.text - BULLET.glyph)}"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
    'word/_rels/document.xml.rels': `${XML}<Relationships xmlns="${NS_PR}"><Relationship Id="rId1" Type="${NS_R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${NS_R}/numbering" Target="numbering.xml"/>${[...links].map(([url, id]) => `<Relationship Id="${id}" Type="${NS_R}/hyperlink" Target="${xmlEsc(url)}" TargetMode="External"/>`).join('')}</Relationships>`,
  };
  return zip(Object.entries(files).map(([name, text]) => ({ name, data: Buffer.from(text, 'utf8') })));
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = zlib.deflateRawSync(f.data);
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// ---------------------------------------------------------------- PDF

const num = (v) => String(Math.round(v * 100) / 100);
const LINE = 1.15;
const ASCENT = 0.89;

function pdfString(s) {
  let out = '';
  for (const ch of s) {
    const b = String.fromCharCode(cp1252(ch));
    out += b === '(' || b === ')' || b === '\\' ? `\\${b}` : b;
  }
  return `(${out})`;
}

function items(runs, fam, size, caps) {
  const out = [];
  for (const r of runs) {
    const key = `${r.bold ? 'b' : ''}${r.italic ? 'i' : ''}` || 'r';
    const font = fam.faces[key];
    const text = caps ? [...r.text].map((ch) => (cp1252(ch.toUpperCase()) === null ? ch : ch.toUpperCase())).join('') : r.text;
    for (const part of text.split(/(\n| +)/)) {
      if (!part) continue;
      const kind = part === '\n' ? 'br' : part[0] === ' ' ? 'space' : 'word';
      out.push({ kind, text: part, key, link: r.link, w: kind === 'br' ? 0 : textWidth(part, font, size) });
    }
  }
  return out;
}

function wrap(list, maxWidth) {
  const lines = [];
  let cur = [];
  let curW = 0;
  let space = null;
  const flush = () => {
    lines.push({ items: cur, w: curW });
    cur = [];
    curW = 0;
  };
  for (let i = 0; i < list.length;) {
    const it = list[i];
    if (it.kind === 'br') { flush(); space = null; i += 1; continue; }
    if (it.kind === 'space') { if (cur.length) space = it; i += 1; continue; }
    // A word can span several runs, e.g. "(**4x**)"; wrap only at spaces.
    let j = i;
    let wordW = 0;
    while (j < list.length && list[j].kind === 'word') { wordW += list[j].w; j += 1; }
    const spaceW = space ? space.w : 0;
    if (cur.length && curW + spaceW + wordW > maxWidth) flush();
    else if (space && cur.length) { cur.push(space); curW += spaceW; }
    space = null;
    for (let k = i; k < j; k += 1) { cur.push(list[k]); curW += list[k].w; }
    i = j;
  }
  flush();
  return lines;
}

function renderPdf(paras, doc) {
  const k = KIND[doc.kind];
  const fam = FAMILIES[(doc.style && doc.style.font) || 'serif'];
  const paper = PAPER[(doc.style && doc.style.paper) || 'a4'];
  const left = k.margin;
  const right = paper.w - k.margin;
  const width = right - left;
  const top = paper.h - k.margin;
  const bottom = k.margin;
  const FONT_IDS = { r: 1, b: 2, i: 3, bi: 4 };

  const laid = paras.map((p) => {
    if (p.type === 'row') {
      const r = wrap(items(p.right, fam, p.size), Infinity)[0];
      return { ...p, rightLine: r, lines: wrap(items(p.left, fam, p.size), width - r.w - 12) };
    }
    const indent = p.type === 'bullet' ? BULLET.text : 0;
    return { ...p, indent, lines: wrap(items(p.runs, fam, p.size, p.caps), width - indent) };
  });

  const pages = [];
  let page;
  let y;
  const newPage = () => {
    page = { ops: [], annots: [] };
    pages.push(page);
    y = top;
  };
  const atTop = () => y === top;
  const lineH = (p) => p.size * LINE;
  const height = (p) => p.lines.length * lineH(p) + (p.rule ? RULE.gap + RULE.width : 0);

  const drawLine = (line, x, baseline, size) => {
    const segs = [];
    for (const it of line.items) {
      const last = segs[segs.length - 1];
      if (last && last.key === it.key && last.link === it.link) { last.text += it.text; last.w += it.w; }
      else segs.push({ key: it.key, link: it.link, text: it.text, w: it.w });
    }
    for (const s of segs) {
      const rgb = s.link ? LINK_RGB.map(num).join(' ') : '0 0 0';
      page.ops.push(`${rgb} rg BT /F${FONT_IDS[s.key]} ${num(size)} Tf ${num(x)} ${num(baseline)} Td ${pdfString(s.text)} Tj ET`);
      if (s.link) {
        page.ops.push(`${num(x)} ${num(baseline - size * 0.12)} ${num(s.w)} ${num(size * 0.05)} re f`);
        page.annots.push(`<< /Type /Annot /Subtype /Link /Rect [${num(x)} ${num(baseline - size * 0.22)} ${num(x + s.w)} ${num(baseline + size * 0.8)}] /Border [0 0 0] /A << /S /URI /URI ${pdfString(s.link)} >> >>`);
      }
      x += s.w;
    }
  };

  newPage();
  laid.forEach((p, idx) => {
    const next = laid[idx + 1];
    if (!atTop()) {
      const need = p.before + (p.keepNext ? height(p) + (next ? next.before + lineH(next) : 0) : lineH(p));
      if (y - need < bottom) newPage();
      else y -= p.before;
    }
    p.lines.forEach((line, n) => {
      if (y - lineH(p) < bottom && !atTop()) newPage();
      const baseline = y - p.size * ASCENT;
      let x = left + (p.indent || 0);
      if (p.align === 'center') x = left + (width - line.w) / 2;
      if (n === 0 && p.type === 'bullet') {
        page.ops.push(`0 0 0 rg BT /F1 ${num(p.size)} Tf ${num(left + BULLET.glyph)} ${num(baseline)} Td ${pdfString('•')} Tj ET`);
      }
      if (n === 0 && p.rightLine) drawLine(p.rightLine, right - p.rightLine.w, baseline, p.size);
      drawLine(line, x, baseline, p.size);
      y -= lineH(p);
    });
    if (p.rule) {
      y -= RULE.gap + RULE.width / 2;
      page.ops.push(`0 0 0 RG ${RULE.width} w ${num(left)} ${num(y)} m ${num(right)} ${num(y)} l S`);
      y -= RULE.width / 2;
    }
    y -= p.after;
  });

  // Objects: 1 catalog, 2 pages, 3-6 fonts, 7 info, then per page: content, annotations, page.
  const objects = [];
  const set = (id, body) => { objects[id - 1] = Buffer.isBuffer(body) ? body : Buffer.from(body, 'latin1'); };
  ['r', 'b', 'i', 'bi'].forEach((key, n) => set(3 + n, `<< /Type /Font /Subtype /Type1 /BaseFont /${fam.faces[key]} /Encoding /WinAnsiEncoding >>`));
  const title = `${doc.name} - ${doc.kind === 'resume' ? 'Resume' : 'Cover Letter'}`;
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  set(7, `<< /Title ${pdfString(title)} /Author ${pdfString(doc.name)} /Producer (career-tools) /CreationDate (D:${stamp}Z) >>`);

  let nextId = 8;
  const kids = [];
  for (const pg of pages) {
    const stream = zlib.deflateSync(Buffer.from(pg.ops.join('\n'), 'latin1'));
    const contentId = nextId++;
    set(contentId, Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]));
    const annotIds = pg.annots.map((a) => { const id = nextId++; set(id, a); return id; });
    const pageId = nextId++;
    set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(paper.w)} ${num(paper.h)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> /Contents ${contentId} 0 R${annotIds.length ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`);
    kids.push(pageId);
  }
  set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  set(2, `<< /Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(' ')}] /Count ${kids.length} >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets = [];
  objects.forEach((body, i) => {
    const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
    const tail = Buffer.from('\nendobj\n', 'latin1');
    offsets.push(offset);
    chunks.push(head, body, tail);
    offset += head.length + body.length + tail.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${offset}\n%%EOF\n`, 'latin1'));
  return { pdf: Buffer.concat(chunks), pages: pages.length };
}

// ---------------------------------------------------------------- commands

function outputRoot() {
  let root = process.env.CAREER_TOOLS_OUTPUT_DIR;
  if (!root) return path.join(process.cwd(), 'applications');
  // A Git Bash path such as /c/Users/... means C:/Users/... to Node on Windows.
  if (process.platform === 'win32') root = root.replace(/^\/([a-zA-Z])(?=\/|$)/, '$1:');
  return path.resolve(root);
}

function cmdPaths(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail('paths needs a lowercase, hyphenated application slug such as acme-staff-engineer');
  const outDir = path.join(outputRoot(), slug);
  const draftDir = path.join(os.tmpdir(), 'career-tools', slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(draftDir, { recursive: true });
  process.stdout.write(`${JSON.stringify({
    outDir,
    resumeDraft: path.join(draftDir, 'resume.json'),
    letterDraft: path.join(draftDir, 'cover-letter.json'),
  }, null, 2)}\n`);
}

function cmdRender(draftPath, outBase) {
  if (!draftPath || !outBase) fail('usage: render <draft.json> <output path without extension>');
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  } catch (err) {
    fail(`cannot read ${draftPath}: ${err.message}`);
  }
  validate(doc);
  const paras = buildParas(doc);
  const docx = renderDocx(paras, doc);
  const { pdf, pages } = renderPdf(paras, doc);

  const base = path.resolve(outBase.replace(/\.(docx|pdf)$/i, ''));
  fs.mkdirSync(path.dirname(base), { recursive: true });
  const written = {};
  for (const [ext, buf] of [['docx', docx], ['pdf', pdf]]) {
    const file = `${base}.${ext}`;
    try {
      fs.writeFileSync(file, buf);
    } catch (err) {
      if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) fail(`${file} is open in another program; close it and run again`);
      throw err;
    }
    written[ext] = file;
  }
  process.stdout.write(`${JSON.stringify({ ...written, pdfPages: pages }, null, 2)}\n`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'paths') cmdPaths(args[0]);
else if (command === 'render') cmdRender(args[0], args[1]);
else fail('usage: render.js paths <application-slug> | render.js render <draft.json> <output path without extension>');
