import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interpolate,
  spring,
  formatTimecode,
  getActiveSequences,
} from './motionMath';
import {
  TEMPLATES,
  validateCompositionProps,
  type TemplateId,
} from './schemas';
import { parseBatchRecords, getSeededBatchItems } from './batchParser';
import {
  generateAgentToolManifest,
  generateMcpServerCode,
  generateRemotionTsx,
  generateRestSnippet,
  buildRemotionCliCommand,
} from './codeGenerators';

test('interpolate clamps boundaries and scales linearly', () => {
  assert.equal(interpolate(5, [0, 10], [0, 100]), 50);
  assert.equal(
    interpolate(-10, [0, 10], [0, 100], { extrapolateLeft: 'clamp' }),
    0
  );
  assert.equal(
    interpolate(25, [0, 10], [0, 100], { extrapolateRight: 'clamp' }),
    100
  );
});

test('spring starts at 0 and converges to 1', () => {
  assert.equal(spring({ frame: 0, fps: 30 }), 0);
  assert.equal(spring({ frame: 5, fps: 30, delay: 10 }), 0);
  const mid = spring({ frame: 15, fps: 30 });
  assert.ok(mid > 0.3 && mid < 1.3, `Expected spring midpoint, got ${mid}`);
  const settled = spring({ frame: 120, fps: 30 });
  assert.equal(settled, 1);
});

test('formatTimecode formats frames accurately at 30fps', () => {
  assert.equal(formatTimecode(0, 30), '00:00:00');
  assert.equal(formatTimecode(45, 30), '00:01:15');
  assert.equal(formatTimecode(180, 30), '00:06:00');
});

test('getActiveSequences identifies overlapping Remotion sequences', () => {
  const sequences = TEMPLATES['kpi-digest'].sequences;
  const atStart = getActiveSequences(sequences, 10);
  assert.equal(atStart.length, 1);
  assert.equal(atStart[0].id, 'intro');

  const atOverlap = getActiveSequences(sequences, 45);
  assert.equal(atOverlap.length, 2);
});

test('validateCompositionProps validates all 4 templates and rejects missing required fields', () => {
  const ids: TemplateId[] = [
    'kpi-digest',
    'product-launch',
    'personalized-onboarding',
    'social-quote',
  ];

  for (const id of ids) {
    const validRes = validateCompositionProps(id, TEMPLATES[id].defaultProps);
    assert.equal(validRes.valid, true, `Default props should pass for ${id}`);
    assert.equal(validRes.errors.length, 0);
  }

  const invalidKpi = validateCompositionProps('kpi-digest', {
    brandName: '',
    accentColor: 'not-a-hex',
    metrics: [],
  });
  assert.equal(invalidKpi.valid, false);
  assert.ok(invalidKpi.errors.length >= 3);

  const unknownTpl = validateCompositionProps('non-existent', {});
  assert.equal(unknownTpl.valid, false);
  assert.equal(unknownTpl.errors[0].path, 'templateId');
});

test('parseBatchRecords parses JSON arrays and CSV rows with validation status', () => {
  const seeded = getSeededBatchItems('kpi-digest');
  assert.equal(seeded.length, 3);
  assert.ok(seeded.every((row) => row.valid && row.status === 'listo'));

  const csvInput = [
    'customerName,companyName,planName,accountManager',
    'Carlos Ruiz,Aether Labs,Plan Enterprise,Diego Salgado',
    'Laura Gómez,Nova Salud,Plan Pro,Camila Navarro',
  ].join('\n');

  const csvRes = parseBatchRecords('personalized-onboarding', csvInput);
  assert.equal(csvRes.parseError, null);
  assert.equal(csvRes.items.length, 2);
  assert.equal(csvRes.items[0].valid, true);
  assert.equal(csvRes.items[0].label, 'Carlos Ruiz — Aether Labs');

  const badJson = parseBatchRecords('kpi-digest', '[{ broken json');
  assert.ok(badJson.parseError !== null);
  assert.equal(badJson.items.length, 0);
});

test('plugin code generators output valid manifest, MCP server, TSX, and CLI commands', () => {
  const manifestText = generateAgentToolManifest('product-launch', '9:16');
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.activeTemplate, 'product-launch');
  assert.equal(manifest.defaultAspectRatio, '9:16');
  assert.equal(manifest.tools.length, 2);

  const mcp = generateMcpServerCode('kpi-digest', '16:9');
  assert.ok(mcp.includes('render_kpi_digest'));
  assert.ok(mcp.includes('/api/plugin/render'));

  const tsx = generateRemotionTsx(
    'social-quote',
    '9:16',
    TEMPLATES['social-quote'].defaultProps
  );
  assert.ok(tsx.includes('EditorialQuoteReel'));
  assert.ok(tsx.includes('width={720}'));

  const cli = buildRemotionCliCommand('kpi-digest', '16:9');
  assert.ok(cli.includes('npx remotion render'));
  assert.ok(cli.includes('KpiDigestVideo'));
});

test('voiceover schema and generators inject Remotion Audio and edge-tts commands', () => {
  const kpiProps = {
    ...TEMPLATES['kpi-digest'].defaultProps,
    voiceover: {
      enabled: true,
      voice: 'es-MX-JorgeNeural',
      script: 'Hola, este es tu reporte trimestral.',
      audioUrl: '/audio/reporte-q4.mp3',
    },
  };

  const validation = validateCompositionProps('kpi-digest', kpiProps);
  assert.equal(validation.valid, true);

  const tsx = generateRemotionTsx('kpi-digest', '16:9', kpiProps);
  assert.ok(tsx.includes('Audio,'));
  assert.ok(tsx.includes('staticFile'));
  assert.ok(tsx.includes('<Audio'));

  const rest = generateRestSnippet('kpi-digest', '16:9', kpiProps);
  assert.ok(rest.includes('edge-tts --voice "es-MX-JorgeNeural"'));
  assert.ok(rest.includes('public/audio/reporte-q4.mp3'));
});
