#!/usr/bin/env node
'use strict';
// Render a resume or cover letter draft (JSON) to DOCX, then convert that DOCX to PDF so the
// two files always match.
//
//   node render.js paths <application-slug>
//       Create the output folder and print where drafts, outputs, and the candidate facts
//       file go, as JSON.
//       Output root: $CAREER_TOOLS_OUTPUT_DIR, else ./applications.
//   node render.js render <draft.json> <output path without extension>
//       Write <output>.docx and <output>.pdf; print their paths, the page count, and the
//       hyperlink targets.
//
// Requires the `docx` npm package (local or `npm install -g docx`) and a converter:
// Microsoft Word on Windows, or LibreOffice anywhere.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(message) {
  process.stderr.write(`render: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- input

const INLINE = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

// A link that parseInline did not consume, such as one whose URL contains a space.
const STRAY_LINK = /\]\(\s*(?:https?:\/\/|mailto:)/;

// Split inline text into styled runs. Marks nest, so `**[text](url)**` and `[**text**](url)`
// are both a bold hyperlink: each match is parsed again with its own style added.
function parseInline(src, style = {}) {
  const runs = [];
  const plain = (text) => {
    if (STRAY_LINK.test(text)) fail(`cannot attach the link in "${src}"; write it as [text](url) with no spaces in the URL`);
    runs.push({ ...style, text });
  };
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) plain(src.slice(last, m.index));
    if (m[1] !== undefined) runs.push(...parseInline(m[1], { ...style, link: m[2] }));
    else if (m[3] !== undefined) runs.push(...parseInline(m[3], { ...style, bold: true }));
    else runs.push(...parseInline(m[4], { ...style, italic: true }));
    last = m.index + m[0].length;
  }
  if (last < src.length) plain(src.slice(last));
  return runs;
}

const FONTS = { serif: 'Times New Roman', sans: 'Arial', calibri: 'Calibri' };
const HEADERS = ['center', 'left'];
const PAPER = { a4: { w: 11906, h: 16838 }, letter: { w: 12240, h: 15840 } };

function validate(doc) {
  const errors = [];
  const str = (v, at) => {
    if (typeof v !== 'string' || !v.trim()) errors.push(`${at} must be a non-empty string`);
  };

  if (!doc || typeof doc !== 'object') fail('the draft must be a JSON object');
  if (!['resume', 'letter'].includes(doc.kind)) errors.push('kind must be "resume" or "letter"');
  str(doc.name, 'name');
  if (doc.contact !== undefined) {
    if (!Array.isArray(doc.contact)) errors.push('contact must be an array of strings');
    else doc.contact.forEach((c, i) => str(c, `contact[${i}]`));
  }
  const style = doc.style || {};
  if (style.font !== undefined && !FONTS[style.font]) errors.push('style.font must be "serif", "sans", or "calibri"');
  if (style.header !== undefined && !HEADERS.includes(style.header)) errors.push('style.header must be "center" or "left"');
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
        } else errors.push(`${bt}: "${key}" must be p (string), bullets (non-empty array), or row ([left, right])`);
      });
    });
  }

  if (errors.length) fail(`invalid draft:\n  - ${errors.join('\n  - ')}`);
}

// ---------------------------------------------------------------- layout model

// Sizes in points; spacing in points before/after each paragraph.
const KIND = {
  resume: { size: 10, margin: 36, nameSize: 18, nameAfter: 2, headerAfter: 2, headingBefore: 6, headingAfter: 3, rowBefore: 3, pAfter: 2, bulletAfter: 0, listAfter: 1 },
  letter: { size: 11, margin: 72, line: 276, nameSize: 16, nameAfter: 2, headerAfter: 18, headingBefore: 10, headingAfter: 4, rowBefore: 6, pAfter: 12, bulletAfter: 2, listAfter: 12 },
};
// A left header is a letterhead: the name, then muted contact lines one point smaller, over a
// light rule.
const MUTED = '555555';
const RULE = { heading: { color: '000000', space: 1 }, header: { color: 'BBBBBB', space: 8 } };
const BULLET = { glyph: 4, text: 14 };

function buildParas(doc) {
  const k = KIND[doc.kind];
  const size = (doc.style && doc.style.size) || k.size;
  const paras = [];
  const push = (p) => paras.push({ before: 0, after: 0, size, ...p });

  const contact = doc.contact || [];
  const left = Boolean(doc.style && doc.style.header === 'left');
  const align = left ? undefined : 'center';
  push({ type: 'name', runs: [{ text: doc.name, bold: true }], align, size: k.nameSize, after: contact.length ? k.nameAfter : k.headerAfter });
  contact.forEach((c, i) => push({
    type: 'contact',
    runs: parseInline(c),
    align,
    size: left ? size - 1 : size,
    color: left ? MUTED : undefined,
    after: i === contact.length - 1 ? k.headerAfter : left ? k.nameAfter : 0,
  }));
  if (left) paras[paras.length - 1].rule = 'header';

  for (const s of doc.sections) {
    if (s.heading) push({ type: 'heading', runs: [{ text: s.heading, bold: true }], caps: true, rule: 'heading', keepNext: true, before: k.headingBefore, after: k.headingAfter });
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

function loadDocx() {
  try {
    return require('docx');
  } catch {
    // Global packages are not on Node's module path; ask npm where they live.
    const npm = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' });
    const root = npm.status === 0 && npm.stdout.trim();
    try {
      if (root) return require(path.join(root, 'docx'));
    } catch { /* fall through */ }
  }
  return fail('the docx package is not installed; run: npm install -g docx');
}

const tw = (pt) => Math.round(pt * 20);

function renderDocx(paras, doc) {
  const D = loadDocx();
  const k = KIND[doc.kind];
  const paper = PAPER[(doc.style && doc.style.paper) || 'a4'];
  const font = FONTS[(doc.style && doc.style.font) || 'serif'];
  const bodySize = (doc.style && doc.style.size) || k.size;
  const line = k.line || 240;
  const margin = tw(k.margin);

  const runs = (r, size, caps, color) => {
    const base = {
      bold: r.bold || undefined,
      italics: r.italic || undefined,
      allCaps: caps || undefined,
      color: color || undefined,
      size: size === bodySize ? undefined : size * 2,
      style: r.link ? 'Hyperlink' : undefined,
    };
    const out = r.text.split('\n').map((text, i) => new D.TextRun({ ...base, text, break: i ? 1 : undefined }));
    return r.link ? [new D.ExternalHyperlink({ link: r.link, children: out })] : out;
  };

  const children = paras.map((p) => new D.Paragraph({
    children: p.type === 'row'
      ? [
        ...p.left.flatMap((r) => runs(r, p.size)),
        ...(p.right.length ? [new D.TextRun({ children: [new D.Tab()] }), ...p.right.flatMap((r) => runs(r, p.size))] : []),
      ]
      : p.runs.flatMap((r) => runs(r, p.size, p.caps, p.color)),
    alignment: p.align === 'center' ? D.AlignmentType.CENTER : undefined,
    spacing: { before: tw(p.before), after: tw(p.after), line },
    keepNext: p.keepNext || undefined,
    border: p.rule ? { bottom: { style: D.BorderStyle.SINGLE, size: 6, ...RULE[p.rule] } } : undefined,
    tabStops: p.type === 'row' ? [{ type: D.TabStopType.RIGHT, position: paper.w - 2 * margin }] : undefined,
    numbering: p.type === 'bullet' ? { reference: 'bullets', level: 0 } : undefined,
  }));

  const document = new D.Document({
    creator: doc.name,
    title: `${doc.name} - ${doc.kind === 'resume' ? 'Resume' : 'Cover Letter'}`,
    styles: {
      default: {
        document: {
          run: { font, size: bodySize * 2 },
          paragraph: { spacing: { after: 0, line } },
        },
      },
    },
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: D.LevelFormat.BULLET,
          text: '•',
          alignment: D.AlignmentType.LEFT,
          style: { paragraph: { indent: { left: tw(BULLET.text), hanging: tw(BULLET.text - BULLET.glyph) } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { size: { width: paper.w, height: paper.h }, margin: { top: margin, right: margin, bottom: margin, left: margin, header: 0, footer: 0 } } },
      children,
    }],
  });
  return D.Packer.toBuffer(document);
}

// ---------------------------------------------------------------- PDF (converted from the DOCX)

const WORD_EXPORT = `
$ErrorActionPreference = 'Stop'
try { $word = New-Object -ComObject Word.Application } catch { exit 3 }
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($env:CT_DOCX, $false, $true)
  $pages = $doc.ComputeStatistics(2)
  $doc.ExportAsFixedFormat($env:CT_PDF, 17)
  $doc.Close($false)
  Write-Output $pages
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 4 }
finally { $word.Quit() }
`;

function findLibreOffice() {
  const names = process.platform === 'win32' ? ['soffice.exe', 'soffice.com'] : ['soffice', 'libreoffice'];
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const dir of dirs) for (const n of names) if (dir && fs.existsSync(path.join(dir, n))) return path.join(dir, n);
  const known = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];
  return known.find((p) => fs.existsSync(p)) || null;
}

function convertToPdf(docxPath, pdfPath) {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WORD_EXPORT], {
      encoding: 'utf8',
      env: { ...process.env, CT_DOCX: docxPath, CT_PDF: pdfPath },
    });
    if (r.status === 0) return { converter: 'Microsoft Word', pages: Number(r.stdout.trim().split(/\s+/).pop()) };
    if (r.status !== 3) fail(`Word could not export ${pdfPath}: ${(r.stderr || r.stdout || '').trim() || `exit ${r.status}`}`);
  }

  const soffice = findLibreOffice();
  if (!soffice) {
    fail('no PDF converter found; install LibreOffice (winget install TheDocumentFoundation.LibreOffice, '
      + 'brew install --cask libreoffice, or your package manager) or Microsoft Word on Windows');
  }
  const r = spawnSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', path.dirname(pdfPath), docxPath], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(pdfPath)) fail(`LibreOffice could not convert ${docxPath}: ${(r.stderr || r.stdout || '').trim()}`);
  const pages = (fs.readFileSync(pdfPath, 'latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  return { converter: 'LibreOffice', pages };
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
  const root = outputRoot();
  const outDir = path.join(root, slug);
  const draftDir = path.join(os.tmpdir(), 'career-tools', slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(draftDir, { recursive: true });
  process.stdout.write(`${JSON.stringify({
    outDir,
    resumeDraft: path.join(draftDir, 'resume.json'),
    letterDraft: path.join(draftDir, 'cover-letter.json'),
    // One file per output root, shared by every application: what the candidate has said
    // about their experience in earlier runs. The skill reads and appends to it.
    factsFile: path.join(root, 'candidate-facts.md'),
  }, null, 2)}\n`);
}

function assertWritable(file) {
  if (!fs.existsSync(file)) return;
  try {
    fs.closeSync(fs.openSync(file, 'a'));
  } catch (err) {
    if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) fail(`${file} is open in another program; close it and run again`);
    throw err;
  }
}

async function cmdRender(draftPath, outBase) {
  if (!draftPath || !outBase) fail('usage: render <draft.json> <output path without extension>');
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  } catch (err) {
    fail(`cannot read ${draftPath}: ${err.message}`);
  }
  validate(doc);

  const base = path.resolve(outBase.replace(/\.(docx|pdf)$/i, ''));
  const docxPath = `${base}.docx`;
  const pdfPath = `${base}.pdf`;
  fs.mkdirSync(path.dirname(base), { recursive: true });
  assertWritable(docxPath);
  assertWritable(pdfPath);

  const paras = buildParas(doc);
  // Every hyperlink target, in document order, so the caller can check none went missing.
  const links = [...new Set(paras.flatMap((p) => p.runs || [...p.left, ...p.right]).filter((r) => r.link).map((r) => r.link))];
  fs.writeFileSync(docxPath, await renderDocx(paras, doc));
  const { converter, pages } = convertToPdf(docxPath, pdfPath);
  process.stdout.write(`${JSON.stringify({ docx: docxPath, pdf: pdfPath, pages, converter, links }, null, 2)}\n`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'paths') cmdPaths(args[0]);
else if (command === 'render') cmdRender(args[0], args[1]).catch((err) => fail(err.stack || String(err)));
else fail('usage: render.js paths <application-slug> | render.js render <draft.json> <output path without extension>');
