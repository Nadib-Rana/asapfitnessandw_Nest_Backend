import { SvgEngineService } from '../src/svg-engine/svg-engine.service';

describe('Production SVG Engine Pipeline (E2E Integration Test)', () => {
  let svgEngine: SvgEngineService;

  beforeEach(() => {
    svgEngine = new SvgEngineService();
  });

  it('should sanitize security risks (script and foreignObject) from raw SVG', () => {
    const maliciousSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <script>alert('hack')</script>
        <foreignObject><body>Bad Content</body></foreignObject>
        <path id="body_front" fill="#FF0000" onclick="alert(1)" d="M0 0h100v100H0z"/>
      </svg>
    `;
    const clean = svgEngine.sanitizeSvg(maliciousSvg);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<foreignObject>');
    expect(clean).not.toContain('onclick=');
    expect(clean).toContain('id="body_front"');
  });

  it('should detect text and image elements accurately from vector SVGs', () => {
    const sampleSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
        <g id="Jersey">
          <path id="jersey_body" fill="#00FF00" d="M10 10h100v100H10z" />
          <text id="player_name" font-family="Montserrat" font-size="24px" fill="#FFFFFF">SMITH</text>
          <image id="sponsor_logo" href="logo.png" width="50" height="50" />
        </g>
      </svg>
    `;
    const result = svgEngine.parseSvg(sampleSvg);

    expect(result.layers).toBeDefined();
    expect(result.layers.length).toBeGreaterThan(0);

    const textLayer = result.layers.find((l) => l.elementId === 'player_name');
    expect(textLayer).toBeDefined();
    expect(textLayer?.layerType).toBe('TEXT');
    expect(textLayer?.fontFamily).toBe('Montserrat');

    const imageLayer = result.layers.find((l) => l.elementId === 'sponsor_logo');
    expect(imageLayer).toBeDefined();
    expect(imageLayer?.layerType).toBe('IMAGE');
    expect(imageLayer?.href).toBe('logo.png');
  });
});
