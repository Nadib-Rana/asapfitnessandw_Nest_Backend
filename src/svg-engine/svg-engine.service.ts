import { Injectable, BadRequestException, Logger } from '@nestjs/common';

interface SvgNode {
  name: string;
  attributes: Record<string, string>;
  children: SvgNode[];
  text?: string;
}

export interface ParsedLayer {
  elementId: string;
  layerName: string;
  layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP';
  category?: 'BODY' | 'SLEEVE' | 'COLLAR' | 'CUFF' | 'LOGO' | 'SPONSOR' | 'TEXT_NAME' | 'TEXT_NUMBER' | 'BADGE' | 'PATTERN' | 'DECORATION' | 'IMAGE_PLACEHOLDER';
  defaultColor?: string;
  parentGroupId?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: string;
  visibility?: string;
  transform?: string;
  display?: string;
  textValue?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textAnchor?: string;
  href?: string;
  width?: string;
  height?: string;
  attributes: Record<string, string>;
  children?: ParsedLayer[];
}

@Injectable()
export class SvgEngineService {
  private readonly logger = new Logger(SvgEngineService.name);

  private readonly DRAWABLE_ELEMENTS = new Set([
    'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'tspan', 'textpath', 'image', 'use'
  ]);

  private readonly IGNORE_ELEMENTS = new Set([
    'defs', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'style', 'metadata', 'script', 'foreignobject'
  ]);

  classifyLayer(name: string, idOrName: string): ParsedLayer['category'] {
    const lower = idOrName.toLowerCase();
    if (name === 'text' || name === 'tspan' || name === 'textpath') {
      if (lower.includes('number') || lower.includes('num') || lower.includes('digit')) return 'TEXT_NUMBER';
      return 'TEXT_NAME';
    }
    if (name === 'image' || name === 'use') return 'IMAGE_PLACEHOLDER';
    if (lower.includes('sleeve') || lower.includes('arm')) return 'SLEEVE';
    if (lower.includes('collar') || lower.includes('neck')) return 'COLLAR';
    if (lower.includes('cuff')) return 'CUFF';
    if (lower.includes('logo') || lower.includes('crest') || lower.includes('badge')) return 'LOGO';
    if (lower.includes('sponsor')) return 'SPONSOR';
    if (lower.includes('pattern') || lower.includes('stripe')) return 'PATTERN';
    if (lower.includes('body') || lower.includes('panel') || lower.includes('front') || lower.includes('back')) return 'BODY';
    return 'DECORATION';
  }

  sanitizeSvg(content: string): string {
    if (!content) return '';
    let clean = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');

    clean = clean
      .replace(/\s*on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href=""');

    return clean;
  }

  validateSvg(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('<svg') || trimmed.includes('<svg');
  }

  parseSvg(svgContent: string) {
    if (!this.validateSvg(svgContent)) {
      throw new BadRequestException('Invalid SVG vector document');
    }

    const sanitizedContent = this.sanitizeSvg(svgContent);
    const classMap = this.parseStyleBlocks(sanitizedContent);

    // 1. Build Node Tree using simple XML parsing state-machine
    const rootNodes = this.buildSvgTree(sanitizedContent);

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
        const layer = this.walkNode(child, counter, classMap, undefined);
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
    const tagOrTextRegex = /<(\/?[a-zA-Z0-9:_-]+)([^>]*?)>|([^<]+)/g;
    let match;

    const root: SvgNode = { name: 'root', attributes: {}, children: [] };
    const stack: SvgNode[] = [root];
    let nodeCount = 0;

    while ((match = tagOrTextRegex.exec(cleanContent)) !== null) {
      const rawTagName = match[1];
      const rawAttrs = match[2];
      const textContent = match[3];

      if (textContent) {
        const trimmed = textContent.trim();
        if (trimmed && stack.length > 1) {
          const current = stack[stack.length - 1];
          current.text = current.text ? `${current.text} ${trimmed}` : trimmed;
        }
        continue;
      }

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

  private extractNodeText(node: SvgNode): string {
    let result = node.text || '';
    if (node.children) {
      for (const child of node.children) {
        const childText = this.extractNodeText(child);
        if (childText) {
          result = result ? `${result} ${childText}` : childText;
        }
      }
    }
    return result.trim();
  }

  private parseStyleBlocks(svgText: string): Map<string, Record<string, string>> {
    const classMap = new Map<string, Record<string, string>>();
    if (!svgText) return classMap;
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRegex.exec(svgText)) !== null) {
      const cssContent = match[1];
      const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
      let ruleMatch;
      while ((ruleMatch = ruleRegex.exec(cssContent)) !== null) {
        const className = ruleMatch[1].trim();
        const declarations = ruleMatch[2];
        const props: Record<string, string> = {};
        for (const decl of declarations.split(';')) {
          const [key, val] = decl.split(':');
          if (key && val) {
            props[key.trim().toLowerCase()] = val.trim();
          }
        }
        classMap.set(className, props);
      }
    }
    return classMap;
  }

  private parseInlineStyle(styleAttr?: string): Record<string, string> {
    const map: Record<string, string> = {};
    if (!styleAttr) return map;
    const pairs = styleAttr.split(';');
    for (const pair of pairs) {
      const parts = pair.split(':');
      if (parts.length === 2) {
        map[parts[0].trim().toLowerCase()] = parts[1].trim();
      }
    }
    return map;
  }

  private walkNode(
    node: SvgNode,
    counter: { value: number; drawableCount: number; skippedCount: number },
    classMap: Map<string, Record<string, string>>,
    parentGroupId?: string,
  ): ParsedLayer | null {
    const name = node.name;
    const attrs = node.attributes;

    if (this.IGNORE_ELEMENTS.has(name)) {
      counter.skippedCount++;
      this.logger.debug(`Skipped element <${name}>: listed in non-renderable ignore-list.`);
      return null;
    }

    const inlineStyles = this.parseInlineStyle(attrs.style);

    // If element uses class="st0", look up class styles in classMap
    const className = attrs.class ? attrs.class.split(' ')[0].replace(/^\./, '').trim() : '';
    const classProps = className ? classMap.get(className) || {} : {};

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
      if (name === 'text' || name === 'tspan' || name === 'textpath') {
        elementId = `text_${counter.value}`;
      } else if (name === 'image' || name === 'use') {
        elementId = `image_${counter.value}`;
      } else {
        elementId = `layer_${counter.value}`;
      }
      layerName = elementId;
    }

    let layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP' = 'GROUP';
    let isLayer = false;

    const fillVal = attrs.fill || inlineStyles['fill'] || classProps['fill'];
    const strokeVal = attrs.stroke || inlineStyles['stroke'] || classProps['stroke'];

    if (name === 'g') {
      layerType = 'GROUP';
      isLayer = true;
    } else if (name === 'text' || name === 'tspan' || name === 'textpath') {
      layerType = 'TEXT';
      isLayer = true;
      counter.drawableCount++;
    } else if (name === 'image' || name === 'use') {
      layerType = 'IMAGE';
      isLayer = true;
      counter.drawableCount++;
    } else if (this.DRAWABLE_ELEMENTS.has(name)) {
      const hasStroke = strokeVal && strokeVal !== 'none';
      const hasFill = fillVal && fillVal !== 'none';
      layerType = hasStroke && !hasFill ? 'STROKE' : 'FILL';
      isLayer = true;
      counter.drawableCount++;
    }

    const childLayers: ParsedLayer[] = [];
    for (const child of node.children) {
      const childLayer = this.walkNode(
        child,
        counter,
        classMap,
        isLayer && layerType === 'GROUP' ? elementId : parentGroupId,
      );
      if (childLayer) {
        childLayers.push(childLayer);
      }
    }

    if (isLayer) {
      let defaultColor: string | undefined;
      if (fillVal && fillVal !== 'none') {
        defaultColor = fillVal;
      } else if (strokeVal && strokeVal !== 'none') {
        defaultColor = strokeVal;
      }

      const extractedText = (name === 'text' || name === 'tspan' || name === 'textpath')
        ? (this.extractNodeText(node) || attrs['data-text'] || attrs.value || layerName)
        : undefined;

      const fontFamily = attrs['font-family'] || attrs['fontFamily'] || inlineStyles['font-family'];
      const fontSize = attrs['font-size'] || attrs['fontSize'] || inlineStyles['font-size'];
      const fontWeight = attrs['font-weight'] || attrs['fontWeight'] || inlineStyles['font-weight'];
      const textAnchor = attrs['text-anchor'] || attrs['textAnchor'] || inlineStyles['text-anchor'];

      return {
        elementId,
        layerName,
        layerType,
        category: this.classifyLayer(name, elementId),
        defaultColor,
        parentGroupId,
        fill: fillVal,
        stroke: strokeVal,
        strokeWidth: attrs['stroke-width'] || attrs['strokeWidth'] || inlineStyles['stroke-width'],
        opacity: attrs.opacity || inlineStyles['opacity'],
        visibility: attrs.visibility || inlineStyles['visibility'],
        transform: attrs.transform,
        display: attrs.display || inlineStyles['display'],
        textValue: extractedText,
        fontFamily,
        fontSize,
        fontWeight,
        textAnchor,
        href: attrs.href || attrs['xlink:href'],
        width: attrs.width,
        height: attrs.height,
        attributes: attrs,
        children: childLayers.length > 0 ? childLayers : undefined,
      };
    }

    return null;
  }

  private flattenLayers(layers: ParsedLayer[]): ParsedLayer[] {
    const flat: ParsedLayer[] = [];
    const traverse = (list: ParsedLayer[], insideNamedGroup = false) => {
      for (const item of list) {
        const { children, ...rest } = item;
        const isAnonymousAutoId = /^layer_\d+$/i.test(item.elementId) || /^text_\d+$/i.test(item.elementId) || /^image_\d+$/i.test(item.elementId);
        const isAnonymousGroup = item.layerType === 'GROUP' && isAnonymousAutoId;

        // Skip empty or anonymous group wrappers
        if (isAnonymousGroup) {
          if (children && children.length > 0) {
            traverse(children, insideNamedGroup);
          }
          continue;
        }

        // If inside a named parent group, skip anonymous sub-paths (they are controlled by the parent group)
        if (insideNamedGroup && isAnonymousAutoId) {
          continue;
        }

        flat.push(rest);

        const isNamedGroup = item.layerType === 'GROUP' && !isAnonymousAutoId;
        if (children && children.length > 0) {
          traverse(children, insideNamedGroup || isNamedGroup);
        }
      }
    };
    traverse(layers, false);
    return flat;
  }
}
