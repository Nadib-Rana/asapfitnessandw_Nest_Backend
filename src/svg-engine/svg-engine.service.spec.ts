import { Test, TestingModule } from '@nestjs/testing';
import { SvgEngineService } from './svg-engine.service';

describe('SvgEngineService', () => {
  let service: SvgEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SvgEngineService],
    }).compile();

    service = module.get<SvgEngineService>(SvgEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSvg', () => {
    it('should validate correctly structured SVGs', () => {
      expect(service.validateSvg('<svg viewBox="0 0 100 100"></svg>')).toBe(true);
      expect(service.validateSvg('   <svg></svg>')).toBe(true);
    });

    it('should reject non-SVG text', () => {
      expect(service.validateSvg('<div>hello</div>')).toBe(false);
    });
  });

  describe('parseSvg', () => {
    it('should parse simple elements and attributes', () => {
      const mockSvg = `
        <svg width="200" height="200" viewBox="0 0 200 200">
          <g id="bodyGroup">
            <path id="sleeve" fill="#ff0000" stroke="#000000" d="M0,0 L10,10" />
            <rect id="collar" fill="#ffffff" x="0" y="0" width="10" height="10" />
          </g>
          <text id="textLabel">Hello</text>
        </svg>
      `;

      const result = service.parseSvg(mockSvg);

      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
      expect(result.layers).toHaveLength(4);

      // Verify group
      const bodyGroup = result.layers.find(l => l.elementId === 'bodyGroup');
      expect(bodyGroup).toBeDefined();
      expect(bodyGroup?.layerType).toBe('GROUP');

      // Verify nested path
      const sleeve = result.layers.find(l => l.elementId === 'sleeve');
      expect(sleeve).toBeDefined();
      expect(sleeve?.layerType).toBe('FILL');
      expect(sleeve?.defaultColor).toBe('#ff0000');
      expect(sleeve?.parentGroupId).toBe('bodyGroup');

      // Verify text
      const textLabel = result.layers.find(l => l.elementId === 'textLabel');
      expect(textLabel).toBeDefined();
      expect(textLabel?.layerType).toBe('TEXT');
      expect(textLabel?.parentGroupId).toBeUndefined();
    });
  });
});
