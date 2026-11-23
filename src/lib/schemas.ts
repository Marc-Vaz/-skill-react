import { z } from 'zod';

export type TemplateId =
  | 'kpi-digest'
  | 'product-launch'
  | 'personalized-onboarding'
  | 'social-quote';

export type AspectRatioId = '16:9' | '9:16' | '1:1';

export interface AspectRatioSpec {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
  usage: string;
}

export const ASPECT_RATIOS: Record<AspectRatioId, AspectRatioSpec> = {
  '16:9': {
    id: '16:9',
    label: '16:9 Horizontal',
    width: 1280,
    height: 720,
    usage: 'YouTube, reportes y escritorio',
  },
  '9:16': {
    id: '9:16',
    label: '9:16 Vertical',
    width: 720,
    height: 1280,
    usage: 'Reels, Shorts y móvil',
  },
  '1:1': {
    id: '1:1',
    label: '1:1 Cuadrado',
    width: 900,
    height: 900,
    usage: 'LinkedIn y feeds sociales',
  },
};

export interface SequenceLayer {
  id: string;
  name: string;
  from: number;
  durationInFrames: number;
  track: number;
}

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Usa un color hexadecimal válido (ej. #E14D2A)');

export const MEXICAN_TTS_VOICES = [
  { id: 'es-MX-DaliaNeural', label: 'Dalia (es-MX · Femenina)' },
  { id: 'es-MX-JorgeNeural', label: 'Jorge (es-MX · Masculina)' },
  { id: 'es-MX-BeatrizNeural', label: 'Beatriz (es-MX · Femenina)' },
  { id: 'es-MX-CandelaNeural', label: 'Candela (es-MX · Femenina)' },
  { id: 'es-MX-CecilioNeural', label: 'Cecilio (es-MX · Masculina)' },
] as const;

export const voiceoverSchema = z
  .object({
    enabled: z.boolean().default(false),
    voice: z.string().min(2).max(60).default('es-MX-DaliaNeural'),
    script: z.string().max(400).default(''),
    audioUrl: z.string().max(500).default(''),
  })
  .optional();

export type VoiceoverConfig = NonNullable<z.infer<typeof voiceoverSchema>>;

export const kpiMetricSchema = z.object({
  label: z.string().min(1, 'Etiqueta obligatoria').max(32),
  value: z.string().min(1, 'Valor obligatorio').max(20),
  delta: z.string().min(1, 'Variación obligatoria').max(16),
  score: z.number().min(10).max(100),
});

export const kpiDigestSchema = z.object({
  brandName: z.string().min(1, 'Nombre de marca obligatorio').max(40),
  recipientName: z.string().min(1, 'Destinatario obligatorio').max(48),
  period: z.string().min(1, 'Periodo obligatorio').max(32),
  headline: z.string().min(3, 'Titular obligatorio').max(90),
  accentColor: hexColorSchema,
  metrics: z
    .array(kpiMetricSchema)
    .min(2, 'Incluye al menos 2 métricas')
    .max(3, 'Máximo 3 métricas por escena'),
  ctaText: z.string().min(2, 'Llamado a la acción obligatorio').max(56),
  voiceover: voiceoverSchema,
});

export const productLaunchSchema = z.object({
  brandName: z.string().min(1, 'Nombre de marca obligatorio').max(40),
  productName: z.string().min(2, 'Nombre del producto obligatorio').max(54),
  tagline: z.string().min(4, 'Subtítulo obligatorio').max(100),
  price: z.string().min(1, 'Precio obligatorio').max(20),
  accentColor: hexColorSchema,
  imageUrl: z.string().min(1, 'Ruta de imagen obligatoria'),
  highlights: z
    .array(z.string().min(2, 'Característica vacía').max(58))
    .min(2, 'Incluye al menos 2 características')
    .max(3, 'Máximo 3 características'),
  ctaText: z.string().min(2, 'Llamado a la acción obligatorio').max(56),
  voiceover: voiceoverSchema,
});

export const personalizedOnboardingSchema = z.object({
  brandName: z.string().min(1, 'Nombre de marca obligatorio').max(40),
  customerName: z.string().min(1, 'Nombre del cliente obligatorio').max(48),
  companyName: z.string().min(1, 'Empresa obligatoria').max(48),
  planName: z.string().min(1, 'Plan obligatorio').max(36),
  accountManager: z.string().min(1, 'Ejecutivo de cuenta obligatorio').max(48),
  accentColor: hexColorSchema,
  nextSteps: z
    .array(z.string().min(3, 'Paso demasiado corto').max(64))
    .min(2, 'Incluye al menos 2 pasos')
    .max(3, 'Máximo 3 pasos'),
  ctaText: z.string().min(2, 'Llamado a la acción obligatorio').max(56),
  voiceover: voiceoverSchema,
});

export const socialQuoteSchema = z.object({
  brandName: z.string().min(1, 'Nombre de marca obligatorio').max(40),
  quote: z.string().min(12, 'La cita debe tener al menos 12 caracteres').max(160),
  authorName: z.string().min(2, 'Autor obligatorio').max(48),
  authorRole: z.string().min(2, 'Cargo obligatorio').max(60),
  statHighlight: z.string().min(2, 'Dato de respaldo obligatorio').max(48),
  accentColor: hexColorSchema,
  ctaText: z.string().min(2, 'Llamado a la acción obligatorio').max(56),
  voiceover: voiceoverSchema,
});

export type KpiDigestProps = z.infer<typeof kpiDigestSchema>;
export type ProductLaunchProps = z.infer<typeof productLaunchSchema>;
export type PersonalizedOnboardingProps = z.infer<typeof personalizedOnboardingSchema>;
export type SocialQuoteProps = z.infer<typeof socialQuoteSchema>;

export type CompositionProps =
  | KpiDigestProps
  | ProductLaunchProps
  | PersonalizedOnboardingProps
  | SocialQuoteProps;

export interface TemplateDefinition<T extends CompositionProps = CompositionProps> {
  id: TemplateId;
  compositionId: string;
  name: string;
  category: string;
  description: string;
  fps: number;
  durationInFrames: number;
  defaultAspectRatio: AspectRatioId;
  sequences: SequenceLayer[];
  schema: z.ZodType<T>;
  defaultProps: T;
  presets: Array<{
    id: string;
    label: string;
    props: T;
  }>;
}

export const GENERATED_PRODUCT_IMAGE =
  '/src/assets/images/product_audio_interface_1795234887386.jpg';
export const GENERATED_BACKDROP_IMAGE =
  '/src/assets/images/studio_backdrop_slate_1795234886894.jpg';

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  'kpi-digest': {
    id: 'kpi-digest',
    compositionId: 'KpiDigestVideo',
    name: 'Reporte de Métricas KPI',
    category: 'Analítica B2B',
    description:
      'Resume indicadores clave trimestrales con gráficas animadas personalizadas por cliente.',
    fps: 30,
    durationInFrames: 180,
    defaultAspectRatio: '16:9',
    sequences: [
      { id: 'intro', name: 'Escena 1: Apertura y titular', from: 0, durationInFrames: 50, track: 0 },
      { id: 'metrics', name: 'Escena 2: Tarjetas y barras KPI', from: 42, durationInFrames: 98, track: 1 },
      { id: 'outro', name: 'Escena 3: Cierre y CTA', from: 132, durationInFrames: 48, track: 2 },
    ],
    schema: kpiDigestSchema,
    defaultProps: {
      brandName: 'Finova Cloud',
      recipientName: 'Sofía Morales',
      period: 'Q4 2026',
      headline: 'Crecimiento sostenido en ingresos recurrentes',
      accentColor: '#E14D2A',
      metrics: [
        { label: 'Ingresos MRR', value: '$428k', delta: '+34%', score: 88 },
        { label: 'Retención Neta', value: '118%', delta: '+6 pts', score: 94 },
        { label: 'Activación 7d', value: '79.4%', delta: '+12%', score: 79 },
      ],
      ctaText: 'Abrir tablero interactivo en Finova',
      voiceover: {
        enabled: true,
        voice: 'es-MX-DaliaNeural',
        script:
          'Hola Sofía, aquí tienes el resumen Q4 de Finova Cloud: tus ingresos recurrentes crecieron 34 por ciento con retención neta de 118 por ciento.',
        audioUrl: '/audio/finova-q4.mp3',
      },
    },
    presets: [
      {
        id: 'finova-q4',
        label: 'Finova Q4',
        props: {
          brandName: 'Finova Cloud',
          recipientName: 'Sofía Morales',
          period: 'Q4 2026',
          headline: 'Crecimiento sostenido en ingresos recurrentes',
          accentColor: '#E14D2A',
          metrics: [
            { label: 'Ingresos MRR', value: '$428k', delta: '+34%', score: 88 },
            { label: 'Retención Neta', value: '118%', delta: '+6 pts', score: 94 },
            { label: 'Activación 7d', value: '79.4%', delta: '+12%', score: 79 },
          ],
          ctaText: 'Abrir tablero interactivo en Finova',
        },
      },
      {
        id: 'krono-ops',
        label: 'Krono SLA',
        props: {
          brandName: 'Krono Logística',
          recipientName: 'Mateo Herrera',
          period: 'Octubre 2026',
          headline: 'Entregas puntuales en toda la red regional',
          accentColor: '#0D9488',
          metrics: [
            { label: 'Entregas a tiempo', value: '98.6%', delta: '+2.4%', score: 98 },
            { label: 'Envíos procesados', value: '64.2k', delta: '+19%', score: 84 },
            { label: 'Costo por ruta', value: '$4.12', delta: '-11%', score: 76 },
          ],
          ctaText: 'Descargar reporte operativo completo',
        },
      },
    ],
  },
  'product-launch': {
    id: 'product-launch',
    compositionId: 'ProductSpotlightVideo',
    name: 'Lanzamiento de Producto',
    category: 'Catálogo E-Commerce',
    description:
      'Genera cápsulas promocionales desde fichas técnicas estructuradas con fotografía y precio.',
    fps: 30,
    durationInFrames: 180,
    defaultAspectRatio: '16:9',
    sequences: [
      { id: 'hero', name: 'Escena 1: Fotografía y precio', from: 0, durationInFrames: 60, track: 0 },
      { id: 'specs', name: 'Escena 2: Destacados técnicos', from: 52, durationInFrames: 86, track: 1 },
      { id: 'cta', name: 'Escena 3: Oferta y cierre', from: 132, durationInFrames: 48, track: 2 },
    ],
    schema: productLaunchSchema,
    defaultProps: {
      brandName: 'Klang Audio',
      productName: 'Monolith Dial One',
      tagline: 'Control de estudio CNC de aluminio anodizado con respuesta háptica',
      price: '$349 USD',
      accentColor: '#D97706',
      imageUrl: GENERATED_PRODUCT_IMAGE,
      highlights: [
        'Conversor DAC 32-bit / 384 kHz sin latencia',
        'Doble puerto USB-C y salida balanceada de estudio',
        'Chasis fresado en una sola pieza de aluminio',
      ],
      ctaText: 'Reservar edición de lanzamiento',
    },
    presets: [
      {
        id: 'monolith-dial',
        label: 'Monolith Dial One',
        props: {
          brandName: 'Klang Audio',
          productName: 'Monolith Dial One',
          tagline: 'Control de estudio CNC de aluminio anodizado con respuesta háptica',
          price: '$349 USD',
          accentColor: '#D97706',
          imageUrl: GENERATED_PRODUCT_IMAGE,
          highlights: [
            'Conversor DAC 32-bit / 384 kHz sin latencia',
            'Doble puerto USB-C y salida balanceada de estudio',
            'Chasis fresado en una sola pieza de aluminio',
          ],
          ctaText: 'Reservar edición de lanzamiento',
        },
      },
      {
        id: 'monolith-pro-bundle',
        label: 'Monolith Studio Kit',
        props: {
          brandName: 'Klang Audio',
          productName: 'Monolith Studio Kit',
          tagline: 'Interfaz de escritorio con calibración acústica automatizada',
          price: '$489 USD',
          accentColor: '#E14D2A',
          imageUrl: GENERATED_PRODUCT_IMAGE,
          highlights: [
            'Preamp transparente con +72 dB de ganancia limpia',
            'Integración nativa con perfiles de mezcla MIDI',
            'Garantía directa de 5 años y soporte prioritario',
          ],
          ctaText: 'Ver disponibilidad para estudios',
        },
      },
    ],
  },
  'personalized-onboarding': {
    id: 'personalized-onboarding',
    compositionId: 'CustomerOnboardingVideo',
    name: 'Bienvenida Personalizada',
    category: 'CRM y Retención',
    description:
      'Automatiza videos de onboarding desde webhooks de CRM con plan, pasos y ejecutivo asignado.',
    fps: 30,
    durationInFrames: 180,
    defaultAspectRatio: '16:9',
    sequences: [
      { id: 'welcome', name: 'Escena 1: Saludo personalizado', from: 0, durationInFrames: 54, track: 0 },
      { id: 'steps', name: 'Escena 2: Ruta de activación', from: 46, durationInFrames: 92, track: 1 },
      { id: 'manager', name: 'Escena 3: Ejecutivo y agenda', from: 132, durationInFrames: 48, track: 2 },
    ],
    schema: personalizedOnboardingSchema,
    defaultProps: {
      brandName: 'Norte CRM',
      customerName: 'Valeria Mendoza',
      companyName: 'Grupo Altiplano',
      planName: 'Plan Enterprise',
      accountManager: 'Diego Salgado',
      accentColor: '#2563EB',
      nextSteps: [
        'Conectar origen de datos PostgreSQL o HubSpot',
        'Invitar al equipo comercial y asignar permisos',
        'Activar el primer flujo de videos automatizados',
      ],
      ctaText: 'Agendar sesión de arranque de 20 min',
    },
    presets: [
      {
        id: 'altiplano',
        label: 'Grupo Altiplano — Enterprise',
        props: {
          brandName: 'Norte CRM',
          customerName: 'Valeria Mendoza',
          companyName: 'Grupo Altiplano',
          planName: 'Plan Enterprise',
          accountManager: 'Diego Salgado',
          accentColor: '#2563EB',
          nextSteps: [
            'Conectar origen de datos PostgreSQL o HubSpot',
            'Invitar al equipo comercial y asignar permisos',
            'Activar el primer flujo de videos automatizados',
          ],
          ctaText: 'Agendar sesión de arranque de 20 min',
        },
      },
      {
        id: 'solaris',
        label: 'Solaris Bio — Escala',
        props: {
          brandName: 'Norte CRM',
          customerName: 'Andrés Castellanos',
          companyName: 'Solaris Bio',
          planName: 'Plan Escala',
          accountManager: 'Camila Navarro',
          accentColor: '#16A34A',
          nextSteps: [
            'Importar plantillas de reporte clínico semanal',
            'Configurar webhooks hacia tu agente de IA',
            'Validar el primer lote de 50 videos dinámicos',
          ],
          ctaText: 'Iniciar configuración guiada',
        },
      },
    ],
  },
  'social-quote': {
    id: 'social-quote',
    compositionId: 'EditorialQuoteReel',
    name: 'Cápsula Editorial y Cita',
    category: 'Contenido Social',
    description:
      'Convierte testimonios o citas clave en piezas de video tipográficas listas para redes.',
    fps: 30,
    durationInFrames: 180,
    defaultAspectRatio: '9:16',
    sequences: [
      { id: 'quote', name: 'Escena 1: Tipografía cinética', from: 0, durationInFrames: 72, track: 0 },
      { id: 'author', name: 'Escena 2: Autor y evidencia', from: 64, durationInFrames: 74, track: 1 },
      { id: 'brand', name: 'Escena 3: Cierre de marca', from: 132, durationInFrames: 48, track: 2 },
    ],
    schema: socialQuoteSchema,
    defaultProps: {
      brandName: 'FrameHook Studio',
      quote:
        'Pasamos de producir 4 videos semanales a renderizar 1,200 piezas personalizadas cada mañana desde nuestro CRM.',
      authorName: 'Lucía Fernández',
      authorRole: 'Directora de Operaciones en Verba',
      statHighlight: '1,200 videos diarios en menos de 9 minutos',
      accentColor: '#E14D2A',
      ctaText: 'Conoce la arquitectura del plugin',
    },
    presets: [
      {
        id: 'verba-case',
        label: 'Caso Verba — Escala diaria',
        props: {
          brandName: 'FrameHook Studio',
          quote:
            'Pasamos de producir 4 videos semanales a renderizar 1,200 piezas personalizadas cada mañana desde nuestro CRM.',
          authorName: 'Lucía Fernández',
          authorRole: 'Directora de Operaciones en Verba',
          statHighlight: '1,200 videos diarios en menos de 9 minutos',
          accentColor: '#E14D2A',
          ctaText: 'Conoce la arquitectura del plugin',
        },
      },
      {
        id: 'pulso-edtech',
        label: 'Caso Pulso — Certificados',
        props: {
          brandName: 'Pulso EdTech',
          quote:
            'Cada estudiante recibe un resumen en video con sus logros al terminar el módulo sin intervención manual.',
          authorName: 'Ricardo Paredes',
          authorRole: 'Líder de Producto en Pulso',
          statHighlight: '+41% tasa de compartidos en LinkedIn',
          accentColor: '#0D9488',
          ctaText: 'Explora la integración con agentes IA',
        },
      },
    ],
  },
};

export const TEMPLATE_LIST: TemplateDefinition[] = Object.values(TEMPLATES);

export interface ValidationFieldError {
  path: string;
  message: string;
}

export interface ValidationResult<T extends CompositionProps = CompositionProps> {
  valid: boolean;
  templateId: TemplateId;
  compositionId: string;
  durationInFrames: number;
  fps: number;
  data?: T;
  errors: ValidationFieldError[];
}

export function validateCompositionProps(
  templateId: string,
  rawPayload: unknown
): ValidationResult {
  const template = TEMPLATES[templateId as TemplateId];
  if (!template) {
    return {
      valid: false,
      templateId: 'kpi-digest',
      compositionId: 'Unknown',
      durationInFrames: 0,
      fps: 30,
      errors: [
        {
          path: 'templateId',
          message: `Plantilla no reconocida: "${templateId}". Usa una de: ${Object.keys(TEMPLATES).join(', ')}`,
        },
      ],
    };
  }

  const parsed = template.schema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      valid: false,
      templateId: template.id,
      compositionId: template.compositionId,
      durationInFrames: template.durationInFrames,
      fps: template.fps,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : 'root',
        message: issue.message,
      })),
    };
  }

  return {
    valid: true,
    templateId: template.id,
    compositionId: template.compositionId,
    durationInFrames: template.durationInFrames,
    fps: template.fps,
    data: parsed.data,
    errors: [],
  };
}
