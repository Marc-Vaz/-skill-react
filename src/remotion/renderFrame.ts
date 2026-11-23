import {
  interpolate,
  spring,
  easeOutCubic,
} from '../lib/motionMath';
import {
  type CompositionProps,
  type KpiDigestProps,
  type PersonalizedOnboardingProps,
  type ProductLaunchProps,
  type SocialQuoteProps,
  type TemplateId,
} from '../lib/schemas';

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frame: number;
  fps: number;
  durationInFrames: number;
  templateId: TemplateId;
  props: CompositionProps;
  productImage?: HTMLImageElement | null;
  backdropImage?: HTMLImageElement | null;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom = 1
) {
  const imgRatio = img.naturalWidth / Math.max(img.naturalHeight, 1);
  const boxRatio = w / Math.max(h, 1);
  let drawW = w * zoom;
  let drawH = h * zoom;

  if (imgRatio > boxRatio) {
    drawH = h * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgRatio;
  }

  const offsetX = x + (w - drawW) / 2;
  const offsetY = y + (h - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function drawStageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  frame: number,
  backdropImage?: HTMLImageElement | null
) {
  ctx.fillStyle = '#0C0F14';
  ctx.fillRect(0, 0, width, height);

  if (backdropImage && backdropImage.complete && backdropImage.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    const subtleZoom = 1 + interpolate(frame, [0, 180], [0, 0.06], { extrapolateRight: 'clamp' });
    drawImageCover(ctx, backdropImage, 0, 0, width, height, subtleZoom);
    ctx.restore();
  }

  // Subtle architectural grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1;
  const step = Math.round(Math.min(width, height) / 10);
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Measured radial accent glow in top corner
  const grad = ctx.createRadialGradient(
    width * 0.85,
    height * 0.14,
    10,
    width * 0.85,
    height * 0.14,
    Math.max(width, height) * 0.55
  );
  grad.addColorStop(0, `${accentColor}26`);
  grad.addColorStop(1, 'rgba(12, 15, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Thin top progress hairline
  const progress = Math.min(1, Math.max(0, frame / 179));
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width * progress, 4);
}

function drawFooterBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brandName: string,
  ctaText: string,
  accentColor: string,
  frame: number,
  fps: number
) {
  const pad = Math.round(Math.min(width, height) * 0.065);
  const outroAnim = spring({ frame, fps, delay: 132, config: { damping: 16, stiffness: 110 } });
  const barY = height - pad - 44;

  // Brand watermark footer (quiet)
  ctx.save();
  ctx.fillStyle = 'rgba(248, 250, 252, 0.58)';
  ctx.font = `500 ${Math.round(Math.min(width, height) * 0.022)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(brandName, pad, barY + 26);

  if (frame >= 126) {
    const shiftY = (1 - outroAnim) * 18;
    ctx.globalAlpha = Math.max(0, Math.min(1, outroAnim));
    const fontSize = Math.round(Math.min(width, height) * 0.024);
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    const textW = ctx.measureText(ctaText).width;
    const btnW = Math.min(width - pad * 2, textW + 44);
    const btnH = 44;
    const btnX = width - pad - btnW;
    const btnY = barY + shiftY;

    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ctaText, btnX + 22, btnY + 28, btnW - 36);
  }
  ctx.restore();
}

function renderKpiDigest(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  fps: number,
  props: KpiDigestProps
) {
  const isVertical = height > width;
  const pad = Math.round(Math.min(width, height) * 0.07);
  const accent = props.accentColor || '#E14D2A';

  const introProgress = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const introShift = (1 - introProgress) * 28;

  // Header metadata line (clean unboxed text)
  ctx.save();
  ctx.globalAlpha = Math.min(1, introProgress * 1.2);
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(Math.min(width, height) * 0.024)}px "JetBrains Mono", monospace`;
  ctx.fillText(`${props.brandName}  ·  ${props.period}`, pad, pad + 18 + introShift);

  ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
  ctx.font = `500 ${Math.round(Math.min(width, height) * 0.024)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(`Preparado para ${props.recipientName}`, pad, pad + 52 + introShift);

  // Headline
  const headlineSize = isVertical
    ? Math.round(width * 0.068)
    : Math.round(height * 0.068);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${headlineSize}px "Bricolage Grotesque", sans-serif`;
  const lines = wrapTextLines(ctx, props.headline, width - pad * 2, 2);
  lines.forEach((line, idx) => {
    ctx.fillText(
      line,
      pad,
      pad + 112 + idx * (headlineSize * 1.15) + introShift
    );
  });
  ctx.restore();

  // Metrics Scene (frames 40..180)
  if (frame >= 32) {
    const metrics = props.metrics.slice(0, 3);
    const areaTop = pad + (isVertical ? 280 : 240);
    const areaBottom = height - pad - 80;
    const availH = Math.max(180, areaBottom - areaTop);
    const gap = 20;

    metrics.forEach((metric, idx) => {
      const cardAnim = spring({
        frame,
        fps,
        delay: 38 + idx * 10,
        config: { damping: 14, stiffness: 110 },
      });
      const alpha = Math.max(0, Math.min(1, cardAnim));
      const yOffset = (1 - cardAnim) * 24;

      let cardX: number;
      let cardY: number;
      let cardW: number;
      let cardH: number;

      if (isVertical) {
        cardW = width - pad * 2;
        cardH = Math.min(180, (availH - gap * (metrics.length - 1)) / metrics.length);
        cardX = pad;
        cardY = areaTop + idx * (cardH + gap) + yOffset;
      } else {
        cardW = (width - pad * 2 - gap * (metrics.length - 1)) / metrics.length;
        cardH = Math.min(250, availH);
        cardX = pad + idx * (cardW + gap);
        cardY = areaTop + yOffset;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.font = `500 ${Math.round(Math.min(width, height) * 0.022)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(metric.label, cardX + 24, cardY + 38, cardW - 48);

      // Value
      const valSize = isVertical ? Math.round(width * 0.072) : Math.round(height * 0.072);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${valSize}px "JetBrains Mono", monospace`;
      ctx.fillText(metric.value, cardX + 24, cardY + 38 + valSize * 1.1, cardW - 48);

      // Delta
      ctx.fillStyle = accent;
      ctx.font = `600 ${Math.round(Math.min(width, height) * 0.023)}px "JetBrains Mono", monospace`;
      ctx.fillText(metric.delta, cardX + 24, cardY + cardH - 42);

      // Animated progress bar
      const barProgress = easeOutCubic(
        interpolate(frame, [52 + idx * 10, 96 + idx * 10], [0, metric.score / 100], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      );
      const barY = cardY + cardH - 22;
      const barW = cardW - 48;
      drawRoundedRect(ctx, cardX + 24, barY, barW, 8, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();

      drawRoundedRect(ctx, cardX + 24, barY, Math.max(8, barW * barProgress), 8, 4);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();
    });
  }

  drawFooterBar(ctx, width, height, props.brandName, props.ctaText, accent, frame, fps);
}

function renderProductLaunch(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  fps: number,
  props: ProductLaunchProps,
  productImage?: HTMLImageElement | null
) {
  const isVertical = height > width;
  const pad = Math.round(Math.min(width, height) * 0.068);
  const accent = props.accentColor || '#D97706';

  const heroAnim = spring({ frame, fps, config: { damping: 16, stiffness: 115 } });
  const imgZoom = 1 + interpolate(frame, [0, 180], [0.02, 0.12], { extrapolateRight: 'clamp' });

  // Media box coordinates
  const imgX = isVertical ? pad : width * 0.52;
  const imgY = isVertical ? pad + 18 : pad + 24;
  const imgW = isVertical ? width - pad * 2 : width * 0.48 - pad;
  const imgH = isVertical ? height * 0.36 : height - pad * 2 - 72;

  // Draw product photography card
  ctx.save();
  ctx.globalAlpha = Math.min(1, heroAnim);
  drawRoundedRect(ctx, imgX, imgY, imgW, imgH, 16);
  ctx.clip();

  if (productImage && productImage.complete && productImage.naturalWidth > 0) {
    drawImageCover(ctx, productImage, imgX, imgY, imgW, imgH, imgZoom);
  } else {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(imgX, imgY, imgW, imgH);
  }

  // Contrast scrim at bottom of photo for price tag
  const scrim = ctx.createLinearGradient(0, imgY + imgH * 0.55, 0, imgY + imgH);
  scrim.addColorStop(0, 'rgba(12, 15, 20, 0)');
  scrim.addColorStop(1, 'rgba(12, 15, 20, 0.84)');
  ctx.fillStyle = scrim;
  ctx.fillRect(imgX, imgY, imgW, imgH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${Math.round(Math.min(width, height) * 0.045)}px "JetBrains Mono", monospace`;
  ctx.fillText(props.price, imgX + 24, imgY + imgH - 26);
  ctx.restore();

  // Left / Lower Editorial Copy Column
  const textX = pad;
  const textW = isVertical ? width - pad * 2 : width * 0.44 - pad;
  const textTop = isVertical ? imgY + imgH + 46 : pad + 42;
  const textShift = (1 - heroAnim) * 24;

  ctx.save();
  ctx.globalAlpha = Math.min(1, heroAnim);
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(Math.min(width, height) * 0.023)}px "JetBrains Mono", monospace`;
  ctx.fillText(props.brandName, textX, textTop + textShift);

  const titleSize = isVertical ? Math.round(width * 0.072) : Math.round(height * 0.072);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${titleSize}px "Bricolage Grotesque", sans-serif`;
  const titleLines = wrapTextLines(ctx, props.productName, textW, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, textX, textTop + 56 + idx * (titleSize * 1.1) + textShift);
  });

  const tagTop = textTop + 56 + titleLines.length * (titleSize * 1.1) + 18;
  const tagSize = Math.round(Math.min(width, height) * 0.026);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.font = `400 ${tagSize}px "Plus Jakarta Sans", sans-serif`;
  const tagLines = wrapTextLines(ctx, props.tagline, textW, 3);
  tagLines.forEach((line, idx) => {
    ctx.fillText(line, textX, tagTop + idx * (tagSize * 1.4) + textShift);
  });
  ctx.restore();

  // Animated Feature Highlights (frames 50..180)
  if (frame >= 48) {
    const listTop = tagTop + tagLines.length * (tagSize * 1.4) + 34;
    props.highlights.slice(0, 3).forEach((item, idx) => {
      const itemAnim = spring({
        frame,
        fps,
        delay: 52 + idx * 12,
        config: { damping: 16, stiffness: 120 },
      });
      const y = listTop + idx * 46 + (1 - itemAnim) * 16;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, itemAnim));

      ctx.fillStyle = accent;
      ctx.font = `600 ${Math.round(Math.min(width, height) * 0.021)}px "JetBrains Mono", monospace`;
      ctx.fillText(`0${idx + 1}.`, textX, y);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = `500 ${Math.round(Math.min(width, height) * 0.022)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(item, textX + 42, y, textW - 46);
      ctx.restore();
    });
  }

  drawFooterBar(ctx, width, height, props.brandName, props.ctaText, accent, frame, fps);
}

function renderOnboarding(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  fps: number,
  props: PersonalizedOnboardingProps
) {
  const isVertical = height > width;
  const pad = Math.round(Math.min(width, height) * 0.072);
  const accent = props.accentColor || '#2563EB';
  const intro = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const shift = (1 - intro) * 26;

  ctx.save();
  ctx.globalAlpha = Math.min(1, intro);
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(Math.min(width, height) * 0.024)}px "JetBrains Mono", monospace`;
  ctx.fillText(`${props.brandName}  ·  ${props.planName}`, pad, pad + 20 + shift);

  const titleSize = isVertical ? Math.round(width * 0.074) : Math.round(height * 0.076);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${titleSize}px "Bricolage Grotesque", sans-serif`;
  ctx.fillText(`Hola, ${props.customerName}`, pad, pad + 92 + shift, width - pad * 2);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.font = `400 ${Math.round(Math.min(width, height) * 0.028)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(
    `Tu espacio para ${props.companyName} ya está listo con ${props.accountManager}.`,
    pad,
    pad + 144 + shift,
    width - pad * 2
  );
  ctx.restore();

  // Checklist steps (frames 44..180)
  if (frame >= 40) {
    const startY = pad + (isVertical ? 240 : 210);
    const stepH = isVertical ? 112 : 84;
    const gap = 16;

    props.nextSteps.slice(0, 3).forEach((step, idx) => {
      const anim = spring({
        frame,
        fps,
        delay: 46 + idx * 14,
        config: { damping: 15, stiffness: 115 },
      });
      const y = startY + idx * (stepH + gap) + (1 - anim) * 20;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, anim));
      drawRoundedRect(ctx, pad, y, width - pad * 2, stepH, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Step index box
      drawRoundedRect(ctx, pad + 20, y + (stepH - 36) / 2, 36, 36, 8);
      ctx.fillStyle = `${accent}30`;
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.font = `700 18px "JetBrains Mono", monospace`;
      ctx.fillText(`0${idx + 1}`, pad + 27, y + stepH / 2 + 6);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = `500 ${Math.round(Math.min(width, height) * 0.026)}px "Plus Jakarta Sans", sans-serif`;
      const stepLines = wrapTextLines(ctx, step, width - pad * 2 - 104, 2);
      stepLines.forEach((line, lIdx) => {
        ctx.fillText(line, pad + 76, y + (stepLines.length > 1 ? 36 + lIdx * 28 : stepH / 2 + 7));
      });
      ctx.restore();
    });
  }

  drawFooterBar(ctx, width, height, props.brandName, props.ctaText, accent, frame, fps);
}

function renderSocialQuote(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  fps: number,
  props: SocialQuoteProps
) {
  const isVertical = height > width;
  const pad = Math.round(Math.min(width, height) * 0.08);
  const accent = props.accentColor || '#E14D2A';

  // Kinetic word reveal for quote
  const words = props.quote.split(/\s+/).filter(Boolean);
  const visibleCount = Math.max(
    1,
    Math.floor(
      interpolate(frame, [4, 62], [1, words.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    )
  );
  const revealedText = `“${words.slice(0, visibleCount).join(' ')}${
    visibleCount >= words.length ? '”' : ''
  }`;

  ctx.save();
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(Math.min(width, height) * 0.025)}px "JetBrains Mono", monospace`;
  ctx.fillText(props.brandName, pad, pad + 20);

  const quoteSize = isVertical ? Math.round(width * 0.068) : Math.round(height * 0.068);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `700 ${quoteSize}px "Bricolage Grotesque", sans-serif`;
  const lines = wrapTextLines(ctx, revealedText, width - pad * 2, isVertical ? 6 : 4);
  lines.forEach((line, idx) => {
    ctx.fillText(line, pad, pad + 110 + idx * (quoteSize * 1.24));
  });
  ctx.restore();

  // Attribution & proof stat (frames 64..180)
  if (frame >= 60) {
    const attrAnim = spring({ frame, fps, delay: 64, config: { damping: 16, stiffness: 120 } });
    const blockY = height - pad - (isVertical ? 280 : 185) + (1 - attrAnim) * 20;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, attrAnim));

    // Hairline separator
    ctx.fillStyle = accent;
    ctx.fillRect(pad, blockY - 24, 56, 3);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(Math.min(width, height) * 0.034)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(props.authorName, pad, blockY + 14);

    ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
    ctx.font = `400 ${Math.round(Math.min(width, height) * 0.024)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(props.authorRole, pad, blockY + 46);

    ctx.fillStyle = accent;
    ctx.font = `600 ${Math.round(Math.min(width, height) * 0.025)}px "JetBrains Mono", monospace`;
    ctx.fillText(props.statHighlight, pad, blockY + 88, width - pad * 2);
    ctx.restore();
  }

  drawFooterBar(ctx, width, height, props.brandName, props.ctaText, accent, frame, fps);
}

export function renderCompositionFrame(params: RenderFrameParams): void {
  const {
    ctx,
    width,
    height,
    frame,
    fps,
    templateId,
    props,
    productImage,
    backdropImage,
  } = params;

  const accentColor =
    typeof (props as { accentColor?: string }).accentColor === 'string'
      ? (props as { accentColor: string }).accentColor
      : '#E14D2A';

  drawStageBackground(ctx, width, height, accentColor, frame, backdropImage);

  switch (templateId) {
    case 'kpi-digest':
      renderKpiDigest(ctx, width, height, frame, fps, props as KpiDigestProps);
      break;
    case 'product-launch':
      renderProductLaunch(
        ctx,
        width,
        height,
        frame,
        fps,
        props as ProductLaunchProps,
        productImage
      );
      break;
    case 'personalized-onboarding':
      renderOnboarding(
        ctx,
        width,
        height,
        frame,
        fps,
        props as PersonalizedOnboardingProps
      );
      break;
    case 'social-quote':
      renderSocialQuote(ctx, width, height, frame, fps, props as SocialQuoteProps);
      break;
  }
}
