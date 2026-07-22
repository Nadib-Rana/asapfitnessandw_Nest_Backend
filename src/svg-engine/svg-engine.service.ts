import { Injectable, BadRequestException, Logger } from '@nestjs/common';

interface SvgNode {
  name: string;
  attributes: Record<string, string>;
  children: SvgNode[];
}

export interface ParsedLayer {
  elementId: string;
  layerName: string;
  layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP';
  defaultColor?: string;
  parentGroupId?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: string;
  visibility?: string;
  transform?: string;
  display?: string;
  attributes: Record<string, string>;
  children?: ParsedLayer[];
}

@Injectable()
export class SvgEngineService {
  private readonly logger = new Logger(SvgEngineService.name);

  private readonly DRAWABLE_ELEMENTS = new Set([
    'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'image', 'use'
  ]);

  private readonly IGNORE_ELEMENTS = new Set([
    'defs', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'style', 'metadata'
  ]);

  validateSvg(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('<svg') || trimmed.includes('<svg');
  }

  parseSvg(svgContent: string) {
    if (!this.validateSvg(svgContent)) {
      throw new BadRequestException('Invalid SVG vector document');
    }

    // 1. Build Node Tree using simple XML parsing state-machine
    const rootNodes = this.buildSvgTree(svgContent);

    // 2. Locate SVG root element to read properties and begin recursive walking
    const svgNode = rootNodes.find((n) => n.name === 'svg');
    let width = 800;
    let height = 800;

    if (svgNode) {
      const attrs = svgNode.attributes;
      if (attrs.width) width = parseInt(attrs.width, 10) || 800;
      if (attrs.height) height = parseInt(attrs.height, 10) || 800;
      if (attrs.viewBox) {
        const parts = attrs.viewBox.split(/[\s,]+/);
        if (parts.length === 4) {
          width = parseInt(parts[2], 10) || width;
          height = parseInt(parts[3], 10) || height;
        }
      }
    }

    const nestedLayers: ParsedLayer[] = [];
    const counter = { value: 0, drawableCount: 0, skippedCount: 0 };

    if (svgNode) {
      for (const child of svgNode.children) {
        const layer = this.walkNode(child, counter, undefined);
        if (layer) {
          nestedLayers.push(layer);
        }
      }
    }

    // 3. Flatten list of layers for DB schema ingestion and flat list responses
    const flatLayers = this.flattenLayers(nestedLayers);

    this.logger.log(
      `SVG parsed successfully: ${counter.drawableCount} drawable nodes detected, ` +
      `${counter.skippedCount} non-renderable nodes ignored, ` +
      `${flatLayers.length} flat layers generated.`
    );

    return { width, height, layers: flatLayers, hierarchy: nestedLayers };
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

  private buildSvgTree(svgContent: string): SvgNode[] {
    const cleanContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');
    const tagRegex = /<(\/?[a-zA-Z0-9:_-]+)([^>]*?)>/g;
    let match;

    const root: SvgNode = { name: 'root', attributes: {}, children: [] };
    const stack: SvgNode[] = [root];
    let nodeCount = 0;

    while ((match = tagRegex.exec(cleanContent)) !== null) {
      const rawTagName = match[1];
      const rawAttrs = match[2];

      const isClose = rawTagName.startsWith('/');
      const isSelfClosing = rawAttrs.trim().endsWith('/');
      const name = (isClose ? rawTagName.slice(1) : rawTagName).toLowerCase();

      const attrs = this.parseAttributes(rawAttrs);

      if (isClose) {
        let popped: SvgNode | undefined;
        while (stack.length > 1) {
          popped = stack.pop();
          if (popped && popped.name === name) {
            break;
          }
        }
      } else {
        nodeCount++;
        const node: SvgNode = { name, attributes: attrs, children: [] };
        stack[stack.length - 1].children.push(node);
        if (!isSelfClosing) {
          stack.push(node);
        }
      }
    }

    this.logger.log(`SVG Loaded: parsed ${nodeCount} total XML nodes.`);
    return root.children;
  }

  private walkNode(
    node: SvgNode,
    counter: { value: number; drawableCount: number; skippedCount: number },
    parentGroupId?: string,
  ): ParsedLayer | null {
    const name = node.name;
    const attrs = node.attributes;

    if (this.IGNORE_ELEMENTS.has(name)) {
      counter.skippedCount++;
      this.logger.debug(`Skipped element <${name}>: listed in non-renderable ignore-list.`);
      return null;
    }

    // Naming attributes detection order
    const rawId =
      attrs.id ||
      attrs['data-name'] ||
      attrs.name ||
      attrs['inkscape:label'] ||
      attrs['aria-label'] ||
      attrs.class ||
      '';
    const cleanId = rawId.trim();

    let elementId = cleanId;
    let layerName =
      attrs.name ||
      attrs['data-name'] ||
      attrs['inkscape:label'] ||
      attrs['aria-label'] ||
      cleanId;

    if (!cleanId) {
      counter.value++;
      elementId = `layer_${counter.value}`;
      layerName = elementId;
    }

    let layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP' = 'GROUP';
    let isLayer = false;

    if (name === 'g') {
      layerType = 'GROUP';
      isLayer = true;
    } else if (name === 'text') {
      layerType = 'TEXT';
      isLayer = true;
      counter.drawableCount++;
    } else if (name === 'image') {
      layerType = 'IMAGE';
      isLayer = true;
      counter.drawableCount++;
    } else if (this.DRAWABLE_ELEMENTS.has(name)) {
      const hasStroke = attrs.stroke && attrs.stroke !== 'none';
      const hasFill = attrs.fill && attrs.fill !== 'none';
      layerType = hasStroke && !hasFill ? 'STROKE' : 'FILL';
      isLayer = true;
      counter.drawableCount++;
    }

    const childLayers: ParsedLayer[] = [];
    for (const child of node.children) {
      const childLayer = this.walkNode(
        child,
        counter,
        isLayer && layerType === 'GROUP' ? elementId : parentGroupId,
      );
      if (childLayer) {
        childLayers.push(childLayer);
      }
    }

    if (isLayer) {
      let defaultColor: string | undefined;
      if (attrs.fill && attrs.fill !== 'none' && attrs.fill.startsWith('#')) {
        defaultColor = attrs.fill;
      } else if (attrs.stroke && attrs.stroke !== 'none' && attrs.stroke.startsWith('#')) {
        defaultColor = attrs.stroke;
      }

      return {
        elementId,
        layerName,
        layerType,
        defaultColor,
        parentGroupId,
        fill: attrs.fill,
        stroke: attrs.stroke,
        strokeWidth: attrs['stroke-width'] || attrs['strokeWidth'],
        opacity: attrs.opacity,
        visibility: attrs.visibility,
        transform: attrs.transform,
        display: attrs.display,
        attributes: attrs,
        children: childLayers.length > 0 ? childLayers : undefined,
      };
    }

    return null;
  }

  private flattenLayers(layers: ParsedLayer[]): ParsedLayer[] {
    const flat: ParsedLayer[] = [];
    const traverse = (list: ParsedLayer[]) => {
      for (const item of list) {
        const { children, ...rest } = item;
        flat.push(rest);
        if (children && children.length > 0) {
          traverse(children);
        }
      }
    };
    traverse(layers);
    return flat;
  }
}
