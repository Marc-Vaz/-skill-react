import {
  TEMPLATES,
  validateCompositionProps,
  type CompositionProps,
  type TemplateId,
  type ValidationFieldError,
} from './schemas';

export interface BatchRowItem {
  id: string;
  label: string;
  templateId: TemplateId;
  props: CompositionProps;
  valid: boolean;
  errors: ValidationFieldError[];
  status: 'listo' | 'error' | 'encolado' | 'renderizado';
  jobId?: string;
}

export interface BatchParseResult {
  items: BatchRowItem[];
  parseError: string | null;
}

function deriveRowLabel(templateId: TemplateId, payload: Record<string, unknown>, index: number): string {
  if (templateId === 'kpi-digest') {
    const rec = typeof payload.recipientName === 'string' ? payload.recipientName : '';
    const brand = typeof payload.brandName === 'string' ? payload.brandName : '';
    return rec || brand || `Registro KPI #${index + 1}`;
  }
  if (templateId === 'product-launch') {
    return (typeof payload.productName === 'string' && payload.productName) || `Producto #${index + 1}`;
  }
  if (templateId === 'personalized-onboarding') {
    const customer = typeof payload.customerName === 'string' ? payload.customerName : '';
    const company = typeof payload.companyName === 'string' ? payload.companyName : '';
    return customer && company ? `${customer} — ${company}` : customer || company || `Cliente #${index + 1}`;
  }
  const author = typeof payload.authorName === 'string' ? payload.authorName : '';
  return author || `Cita editorial #${index + 1}`;
}

function parseSimpleCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function mergeCsvRowWithTemplateDefaults(
  templateId: TemplateId,
  headers: string[],
  cells: string[]
): Record<string, unknown> {
  const defaults = structuredClone(TEMPLATES[templateId].defaultProps) as Record<string, unknown>;
  const rowMap: Record<string, string> = {};
  headers.forEach((h, idx) => {
    rowMap[h.trim()] = (cells[idx] ?? '').trim();
  });

  for (const [key, value] of Object.entries(rowMap)) {
    if (!value) continue;
    if (key === 'highlights' || key === 'nextSteps') {
      defaults[key] = value.split('|').map((s) => s.trim()).filter(Boolean);
    } else if (key === 'metrics') {
      try {
        defaults[key] = JSON.parse(value);
      } catch {
        defaults[key] = value;
      }
    } else {
      defaults[key] = value;
    }
  }

  return defaults;
}

export function parseBatchRecords(
  templateId: TemplateId,
  rawText: string
): BatchParseResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      items: [],
      parseError: 'Pega un arreglo JSON válido o filas CSV con encabezados para importar el lote.',
    };
  }

  let rawObjects: unknown[] = [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      rawObjects = Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      return {
        items: [],
        parseError: `Error de sintaxis JSON: ${error instanceof Error ? error.message : 'formato inválido'}`,
      };
    }
  } else {
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return {
        items: [],
        parseError: 'El formato CSV requiere una línea de encabezados y al menos una fila de datos.',
      };
    }
    const headers = parseSimpleCsvLine(lines[0]);
    rawObjects = lines.slice(1).map((line) => {
      const cells = parseSimpleCsvLine(line);
      return mergeCsvRowWithTemplateDefaults(templateId, headers, cells);
    });
  }

  const items: BatchRowItem[] = rawObjects.map((entry, idx) => {
    const validation = validateCompositionProps(templateId, entry);
    const obj =
      entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return {
      id: `batch-${templateId}-${idx + 1}-${Math.abs(JSON.stringify(obj).length)}`,
      label: deriveRowLabel(templateId, obj, idx),
      templateId,
      props: (validation.data ?? obj) as CompositionProps,
      valid: validation.valid,
      errors: validation.errors,
      status: validation.valid ? 'listo' : 'error',
    };
  });

  return { items, parseError: null };
}

export function getSeededBatchItems(templateId: TemplateId): BatchRowItem[] {
  if (templateId === 'kpi-digest') {
    const seed = [
      {
        ...TEMPLATES['kpi-digest'].defaultProps,
        recipientName: 'Sofía Morales',
        brandName: 'Finova Cloud',
        period: 'Q4 2026',
      },
      {
        brandName: 'Vértice Pagos',
        recipientName: 'Daniela Quiroga',
        period: 'Q4 2026',
        headline: 'Volumen procesado récord en comercios B2B',
        accentColor: '#0D9488',
        metrics: [
          { label: 'Volumen TPV', value: '$18.6M', delta: '+41%', score: 92 },
          { label: 'Aprobación', value: '99.2%', delta: '+1.4%', score: 97 },
          { label: 'Ticket Medio', value: '$312', delta: '+9%', score: 81 },
        ],
        ctaText: 'Revisar liquidaciones en Vértice',
      },
      {
        brandName: 'Krono Logística',
        recipientName: 'Mateo Herrera',
        period: 'Q4 2026',
        headline: 'Reducción sostenida en tiempos de última milla',
        accentColor: '#2563EB',
        metrics: [
          { label: 'SLA Puntual', value: '98.4%', delta: '+3.1%', score: 96 },
          { label: 'Rutas Activas', value: '1,420', delta: '+16%', score: 85 },
          { label: 'Costo Unitario', value: '$3.85', delta: '-14%', score: 78 },
        ],
        ctaText: 'Descargar reporte operativo Q4',
      },
    ];
    return parseBatchRecords('kpi-digest', JSON.stringify(seed)).items;
  }

  if (templateId === 'product-launch') {
    const base = TEMPLATES['product-launch'].defaultProps;
    const seed = [
      base,
      {
        ...base,
        productName: 'Monolith Compact Mini',
        tagline: 'Controlador portátil CNC para mezcla en campo y podcast',
        price: '$229 USD',
        accentColor: '#E14D2A',
      },
      {
        ...base,
        productName: 'Monolith Mastering Pro',
        tagline: 'Monitoreo calibrado de 4 canales con medidor de picos real',
        price: '$590 USD',
        accentColor: '#2563EB',
      },
    ];
    return parseBatchRecords('product-launch', JSON.stringify(seed)).items;
  }

  if (templateId === 'personalized-onboarding') {
    const base = TEMPLATES['personalized-onboarding'].defaultProps;
    const seed = [
      base,
      {
        ...base,
        customerName: 'Andrés Castellanos',
        companyName: 'Solaris Bio',
        planName: 'Plan Escala',
        accountManager: 'Camila Navarro',
        accentColor: '#16A34A',
      },
      {
        ...base,
        customerName: 'Elena Vargas',
        companyName: 'Estudio Brava',
        planName: 'Plan Pro',
        accountManager: 'Diego Salgado',
        accentColor: '#E14D2A',
      },
    ];
    return parseBatchRecords('personalized-onboarding', JSON.stringify(seed)).items;
  }

  const base = TEMPLATES['social-quote'].defaultProps;
  const seed = [
    base,
    {
      ...base,
      authorName: 'Ricardo Paredes',
      authorRole: 'Líder de Producto en Pulso',
      quote:
        'Cada alumno recibe un video personalizado con su avance mensual generado directo desde nuestra base de datos.',
      statHighlight: '+41% tasa de compartidos orgánicos',
      accentColor: '#0D9488',
    },
  ];
  return parseBatchRecords('social-quote', JSON.stringify(seed)).items;
}
