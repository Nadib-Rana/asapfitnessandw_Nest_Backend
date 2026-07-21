import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class SvgEngineService {
  validateSvg(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('<svg') || trimmed.includes('<svg');
  }

  parseSvg(svgContent: string) {
    if (!this.validateSvg(svgContent)) {
      throw new BadRequestException('Invalid SVG vector document');
    }

    const layers: Array<{
      elementId: string;
      layerName: string;
      layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP';
      defaultColor?: string;
      parentGroupId?: string;
    }> = [];

    const svgTagMatch = svgContent.match(/<svg([^>]*?)>/);
    let width = 800;
    let height = 800;
    if (svgTagMatch) {
      const attrs = this.parseAttributes(svgTagMatch[1]);
      if (attrs.width) width = parseInt(attrs.width, 10) || 800;
      if (attrs.height) height = parseInt(attrs.height, 10) || 800;
    }

    const tagRegex = /<(\/?[a-zA-Z0-9:-]+)([^>]*?)>/g;
    let match;
    const groupStack: string[] = [];

    while ((match = tagRegex.exec(svgContent)) !== null) {
      const tagName = match[1].toLowerCase();
      const rawAttrs = match[2];

      if (tagName === '/g') {
        groupStack.pop();
        continue;
      }

      const attrs = this.parseAttributes(rawAttrs);
      const isSelfClosing = rawAttrs.trim().endsWith('/');

      if (tagName === 'g') {
        if (attrs.id) {
          layers.push({
            elementId: attrs.id,
            layerName: attrs.name || attrs.id,
            layerType: 'GROUP',
            parentGroupId: groupStack[groupStack.length - 1],
          });
          if (!isSelfClosing) {
            groupStack.push(attrs.id);
          }
        }
      } else if (
        tagName === 'path' ||
        tagName === 'rect' ||
        tagName === 'circle' ||
        tagName === 'polygon' ||
        tagName === 'ellipse'
      ) {
        if (attrs.id) {
          const defaultColor = attrs.fill && attrs.fill !== 'none' ? attrs.fill : undefined;
          layers.push({
            elementId: attrs.id,
            layerName: attrs.name || attrs.id,
            layerType: attrs.stroke && (!attrs.fill || attrs.fill === 'none') ? 'STROKE' : 'FILL',
            defaultColor: defaultColor?.startsWith('#') ? defaultColor : undefined,
            parentGroupId: groupStack[groupStack.length - 1],
          });
        }
      } else if (tagName === 'text') {
        if (attrs.id) {
          layers.push({
            elementId: attrs.id,
            layerName: attrs.name || attrs.id,
            layerType: 'TEXT',
            parentGroupId: groupStack[groupStack.length - 1],
          });
        }
      } else if (tagName === 'image') {
        if (attrs.id) {
          layers.push({
            elementId: attrs.id,
            layerName: attrs.name || attrs.id,
            layerType: 'IMAGE',
            parentGroupId: groupStack[groupStack.length - 1],
          });
        }
      }
    }

    return { width, height, layers };
  }

  private parseAttributes(rawAttrs: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*?)"|'([^']*?)')/g;
    let match;
    while ((match = attrRegex.exec(rawAttrs)) !== null) {
      attrs[match[1]] = match[2] || match[3];
    }
    return attrs;
  }
}
