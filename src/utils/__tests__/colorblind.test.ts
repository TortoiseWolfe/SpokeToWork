import { describe, it, expect } from 'vitest';
import {
  ColorblindType,
  ColorblindSeverity,
  ColorblindSettings,
  DEFAULT_COLORBLIND_SETTINGS,
  COLORBLIND_LABELS,
  COLORBLIND_FILTER_IDS,
  COLORBLIND_STORAGE_KEY,
  getColorblindSeverity,
} from '../colorblind';

describe('colorblind utilities', () => {
  describe('ColorblindType enum', () => {
    it('should have all expected colorblind types', () => {
      expect(ColorblindType.NONE).toBe('none');
      expect(ColorblindType.PROTANOPIA).toBe('protanopia');
      expect(ColorblindType.PROTANOMALY).toBe('protanomaly');
      expect(ColorblindType.DEUTERANOPIA).toBe('deuteranopia');
      expect(ColorblindType.DEUTERANOMALY).toBe('deuteranomaly');
      expect(ColorblindType.TRITANOPIA).toBe('tritanopia');
      expect(ColorblindType.TRITANOMALY).toBe('tritanomaly');
      expect(ColorblindType.ACHROMATOPSIA).toBe('achromatopsia');
      expect(ColorblindType.ACHROMATOMALY).toBe('achromatomaly');
    });
  });

  describe('ColorblindSeverity enum', () => {
    it('should have all expected severity levels', () => {
      expect(ColorblindSeverity.NONE).toBe('none');
      expect(ColorblindSeverity.ANOMALOUS).toBe('anomalous');
      expect(ColorblindSeverity.DICHROMAT).toBe('dichromat');
      expect(ColorblindSeverity.MONOCHROMAT).toBe('monochromat');
    });
  });

  describe('DEFAULT_COLORBLIND_SETTINGS', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_COLORBLIND_SETTINGS.mode).toBe(ColorblindType.NONE);
      expect(DEFAULT_COLORBLIND_SETTINGS.patternsEnabled).toBe(false);
      expect(DEFAULT_COLORBLIND_SETTINGS.simulationMode).toBe(false);
    });
  });

  describe('COLORBLIND_LABELS', () => {
    it('should have labels for all types', () => {
      expect(COLORBLIND_LABELS[ColorblindType.NONE]).toBe('No Correction');
      expect(COLORBLIND_LABELS[ColorblindType.PROTANOPIA]).toContain(
        'Red-Blind'
      );
      expect(COLORBLIND_LABELS[ColorblindType.DEUTERANOPIA]).toContain(
        'Green-Blind'
      );
      expect(COLORBLIND_LABELS[ColorblindType.TRITANOPIA]).toContain(
        'Blue-Blind'
      );
      expect(COLORBLIND_LABELS[ColorblindType.ACHROMATOPSIA]).toContain(
        'Complete'
      );
    });
  });

  describe('COLORBLIND_FILTER_IDS', () => {
    it('should have filter IDs for all types', () => {
      expect(COLORBLIND_FILTER_IDS[ColorblindType.NONE]).toBe('none');
      expect(COLORBLIND_FILTER_IDS[ColorblindType.PROTANOPIA]).toBe(
        'url(#protanopia)'
      );
      expect(COLORBLIND_FILTER_IDS[ColorblindType.DEUTERANOPIA]).toBe(
        'url(#deuteranopia)'
      );
    });
  });

  describe('COLORBLIND_STORAGE_KEY', () => {
    it('should be the expected value', () => {
      expect(COLORBLIND_STORAGE_KEY).toBe('colorblind-settings');
    });
  });

  describe('getColorblindSeverity', () => {
    it('should return NONE for normal vision', () => {
      expect(getColorblindSeverity(ColorblindType.NONE)).toBe(
        ColorblindSeverity.NONE
      );
    });

    it('should return ANOMALOUS for weak variants', () => {
      expect(getColorblindSeverity(ColorblindType.PROTANOMALY)).toBe(
        ColorblindSeverity.ANOMALOUS
      );
      expect(getColorblindSeverity(ColorblindType.DEUTERANOMALY)).toBe(
        ColorblindSeverity.ANOMALOUS
      );
      expect(getColorblindSeverity(ColorblindType.TRITANOMALY)).toBe(
        ColorblindSeverity.ANOMALOUS
      );
      expect(getColorblindSeverity(ColorblindType.ACHROMATOMALY)).toBe(
        ColorblindSeverity.ANOMALOUS
      );
    });

    it('should return DICHROMAT for complete color loss', () => {
      expect(getColorblindSeverity(ColorblindType.PROTANOPIA)).toBe(
        ColorblindSeverity.DICHROMAT
      );
      expect(getColorblindSeverity(ColorblindType.DEUTERANOPIA)).toBe(
        ColorblindSeverity.DICHROMAT
      );
      expect(getColorblindSeverity(ColorblindType.TRITANOPIA)).toBe(
        ColorblindSeverity.DICHROMAT
      );
    });

    it('should return MONOCHROMAT for complete colorblindness', () => {
      expect(getColorblindSeverity(ColorblindType.ACHROMATOPSIA)).toBe(
        ColorblindSeverity.MONOCHROMAT
      );
    });

    it('should return NONE for unknown types', () => {
      // Edge case: passing an unknown value
      expect(getColorblindSeverity('unknown' as ColorblindType)).toBe(
        ColorblindSeverity.NONE
      );
    });
  });

  describe('ColorblindSettings type', () => {
    it('should accept valid settings', () => {
      const settings: ColorblindSettings = {
        mode: ColorblindType.DEUTERANOPIA,
        patternsEnabled: true,
        simulationMode: true,
      };
      expect(settings.mode).toBe(ColorblindType.DEUTERANOPIA);
      expect(settings.patternsEnabled).toBe(true);
    });

    it('should allow optional simulationMode', () => {
      const settings: ColorblindSettings = {
        mode: ColorblindType.NONE,
        patternsEnabled: false,
      };
      expect(settings.simulationMode).toBeUndefined();
    });
  });
});
