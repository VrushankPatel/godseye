import { describe, it, expect } from 'vitest';
import {
  buildRadioTunerTicks,
  getStationCategoryColor,
  RADIO_CATEGORY_COLORS,
  COMMON_GENRE_TAGS,
} from '../../src/services/radioService';
import { LAYER_DEFS, SURVEILLANCE_PRIMARY_LAYERS, API_URLS } from '../../src/constants/dataSources';

describe('Radio Subsystem & Tuner Tests', () => {
  it('registers radio in LAYER_DEFS and SURVEILLANCE_PRIMARY_LAYERS', () => {
    expect(LAYER_DEFS.radio).toBeDefined();
    expect(LAYER_DEFS.radio.label).toBe('WORLD RADIO');
    expect(LAYER_DEFS.radio.color).toBe('#ff6f4f');
    expect(SURVEILLANCE_PRIMARY_LAYERS).toContain('radio');
    expect(API_URLS.RADIO_STATIONS).toBe('/api/radio/stations');
  });

  it('calculates empty ticks for 0 stations', () => {
    const model = buildRadioTunerTicks(0, 0, 300);
    expect(model.ticks).toEqual([]);
    expect(model.ratio).toBe(0);
  });

  it('calculates centered needle for single station', () => {
    const model = buildRadioTunerTicks(0, 1, 300, { insetPx: 10 });
    expect(model.ticks.length).toBe(1);
    expect(model.ticks[0].channel).toBe(1);
    expect(model.ticks[0].label).toBe('01');
    expect(model.ratio).toBe(0.5);
    expect(model.needleX).toBe(150);
  });

  it('calculates dynamic ticks across multiple stations', () => {
    const model = buildRadioTunerTicks(5, 50, 400);
    expect(model.ticks.length).toBeGreaterThan(0);
    expect(model.ratio).toBeCloseTo(5 / 49, 4);

    const currentTick = model.ticks.find((t) => t.current);
    expect(currentTick).toBeDefined();
    expect(currentTick.stationIndex).toBe(5);
    expect(currentTick.channel).toBe(6);
  });

  it('assigns correct category colors based on station tags', () => {
    expect(getStationCategoryColor({ tags: ['news', 'politics'] })).toBe(RADIO_CATEGORY_COLORS.news);
    expect(getStationCategoryColor({ tags: ['talk', 'podcast'] })).toBe(RADIO_CATEGORY_COLORS.talk);
    expect(getStationCategoryColor({ tags: ['ambient', 'electronic'] })).toBe(RADIO_CATEGORY_COLORS.electronic);
    expect(getStationCategoryColor({ tags: ['bollywood', 'hits'] })).toBe(RADIO_CATEGORY_COLORS.music);
    expect(getStationCategoryColor({ tags: ['police', 'scanner'] })).toBe(RADIO_CATEGORY_COLORS['public-safety']);
    expect(getStationCategoryColor({ tags: ['unknown'] })).toBe(RADIO_CATEGORY_COLORS.all);
    expect(getStationCategoryColor(null)).toBe(RADIO_CATEGORY_COLORS.all);
  });

  it('provides verified common genre tags', () => {
    expect(COMMON_GENRE_TAGS.length).toBeGreaterThanOrEqual(8);
    const tagIds = COMMON_GENRE_TAGS.map((g) => g.id);
    expect(tagIds).toContain('all');
    expect(tagIds).toContain('news');
    expect(tagIds).toContain('bollywood');
    expect(tagIds).toContain('electronic');
  });
});
