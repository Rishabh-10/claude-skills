'use strict';
// End-to-end tests for the career-tools renderer: run render.js on a draft, then inspect the
// DOCX it wrote. Needs the same things the renderer does (the `docx` package and Word or
// LibreOffice).
//
//   node --test plugins/career-tools/tests/

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const RENDER = path.join(__dirname, '..', 'skills', 'tailor', 'render.js');

// Read named entries out of a zip (a DOCX is one) with no dependency beyond zlib.
function unzip(file, names) {
  const buf = fs.readFileSync(file);
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const out = {};
  for (let i = 0; i < count; i += 1) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const skip = buf.readUInt16LE(at + 30) + buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    if (names.includes(name)) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      out[name] = (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
    }
    at += 46 + nameLen + skip;
  }
  return out;
}

function draft(blocks) {
  return {
    kind: 'resume',
    name: 'Test Person',
    contact: ['Somewhere | [me@example.com](mailto:me@example.com)'],
    sections: [{ heading: 'Projects', blocks }],
  };
}

function render(doc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-tools-test-'));
  const draftPath = path.join(dir, 'draft.json');
  fs.writeFileSync(draftPath, JSON.stringify(doc));
  const r = spawnSync(process.execPath, [RENDER, 'render', draftPath, path.join(dir, 'out')], { encoding: 'utf8' });
  return { dir, status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function readDocx(dir) {
  const files = unzip(path.join(dir, 'out.docx'), ['word/document.xml', 'word/_rels/document.xml.rels']);
  return { xml: files['word/document.xml'], rels: files['word/_rels/document.xml.rels'] };
}

// The <w:hyperlink> elements in document order, each with its relationship target resolved.
function hyperlinks({ xml, rels }) {
  const targets = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]);
    const target = /Target="([^"]+)"/.exec(m[0]);
    if (id && target) targets[id[1]] = target[1];
  }
  return [...xml.matchAll(/<w:hyperlink\b[^>]*r:id="([^"]+)"[^>]*>(.*?)<\/w:hyperlink>/g)].map((m) => ({
    target: targets[m[1]],
    text: [...m[2].matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(''),
    bold: /<w:b\/>/.test(m[2]),
    italic: /<w:i\/>/.test(m[2]),
  }));
}

test('a bold project title link renders as a bold hyperlink, not literal markdown', async () => {
  const out = render(draft([
    { row: ['**[Sports Assistant](https://example.com/sports)**', 'Python | SQLite'] },
    { bullets: ['Built a thing.'] },
  ]));
  assert.strictEqual(out.status, 0, out.stderr);

  const docx = await readDocx(out.dir);
  assert.ok(!docx.xml.includes(']('), 'markdown link syntax leaked into the document text');

  const link = hyperlinks(docx).find((h) => h.text === 'Sports Assistant');
  assert.ok(link, 'the project title is not a hyperlink');
  assert.strictEqual(link.target, 'https://example.com/sports');
  assert.strictEqual(link.bold, true, 'the project title link is not bold');
});

test('bold inside the link text and italic around a link both keep the hyperlink', async () => {
  const out = render(draft([
    { row: ['[**Job Queue**](https://example.com/queue)', ''] },
    { p: 'See *[the write-up](https://example.com/post)* for details.' },
  ]));
  assert.strictEqual(out.status, 0, out.stderr);

  const links = hyperlinks(await readDocx(out.dir));
  const queue = links.find((h) => h.text === 'Job Queue');
  assert.ok(queue && queue.bold, 'bold link text lost its hyperlink or its weight');
  assert.strictEqual(queue.target, 'https://example.com/queue');
  const post = links.find((h) => h.text === 'the write-up');
  assert.ok(post && post.italic, 'italic link lost its hyperlink or its slant');
  assert.strictEqual(post.target, 'https://example.com/post');
});

test('the render report lists every link target', () => {
  const out = render(draft([{ row: ['**[Sports Assistant](https://example.com/sports)**', ''] }]));
  assert.strictEqual(out.status, 0, out.stderr);
  assert.deepStrictEqual(JSON.parse(out.stdout).links, ['mailto:me@example.com', 'https://example.com/sports']);
});

test('a link the renderer cannot attach fails the render instead of printing markdown', () => {
  const out = render(draft([{ row: ['**[Broken](https://example.com/has space)**', ''] }]));
  assert.notStrictEqual(out.status, 0);
  assert.match(out.stderr, /link/i);
});

function letter(style) {
  return {
    kind: 'letter',
    style,
    name: 'Test Person',
    contact: ['Backend Engineer | Somewhere', '+1 555 0100 | me@example.com'],
    sections: [{ blocks: [
      { p: '12 November 2026' },
      { p: 'Hiring Team\nPlatform\nAcme' },
      { p: '**Re: Backend Engineer**' },
      { p: 'Dear Hiring Team,' },
      { p: 'A paragraph of the letter.' },
      { p: 'Sincerely,' },
      { p: '**Test Person**' },
    ] }],
  };
}

test('a letter with a left header gets a left-aligned letterhead over a rule, in the chosen font', async () => {
  const out = render(letter({ header: 'left', font: 'calibri' }));
  assert.strictEqual(out.status, 0, out.stderr);

  const { xml } = await readDocx(out.dir);
  assert.ok(!xml.includes('<w:jc w:val="center"/>'), 'the letterhead is still centred');
  const paras = xml.split('<w:p>').slice(1);
  const lastContact = paras.find((p) => p.includes('me@example.com'));
  assert.match(lastContact, /<w:pBdr><w:bottom\b/, 'no rule under the letterhead');
  assert.match(lastContact, /<w:color w:val="555555"\/>/, 'the contact line is not muted');
  assert.ok(!/<w:pBdr>/.test(paras.find((p) => p.includes('Backend Engineer | Somewhere'))), 'the rule belongs under the last header line only');
  assert.match(paras.find((p) => p.includes('A paragraph of the letter.')), /w:line="276"/, 'letter body is not at 1.15 line spacing');

  const { 'word/styles.xml': styles } = unzip(path.join(out.dir, 'out.docx'), ['word/styles.xml']);
  assert.match(styles, /w:ascii="Calibri"/);
});

test('a letter without a header style keeps the centred header and no rule', async () => {
  const out = render(letter({ font: 'serif' }));
  assert.strictEqual(out.status, 0, out.stderr);
  const { xml } = await readDocx(out.dir);
  assert.ok(xml.includes('<w:jc w:val="center"/>'));
  assert.ok(!xml.includes('<w:pBdr>'));
});

test('an unknown header style is rejected', () => {
  const out = render(letter({ header: 'right' }));
  assert.notStrictEqual(out.status, 0);
  assert.match(out.stderr, /style\.header/);
});

test('paths reports one facts file shared by every application under the output root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'career-tools-root-'));
  const run = (slug) => {
    const r = spawnSync(process.execPath, [RENDER, 'paths', slug], { encoding: 'utf8', env: { ...process.env, CAREER_TOOLS_OUTPUT_DIR: root } });
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  const a = run('acme-backend-engineer');
  const b = run('globex-data-engineer');
  assert.strictEqual(a.factsFile, path.join(root, 'candidate-facts.md'));
  assert.strictEqual(b.factsFile, a.factsFile);
  assert.notStrictEqual(a.outDir, b.outDir);
});
