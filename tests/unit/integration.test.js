import { describe, it, expect, beforeEach } from 'vitest';
import { parseAdsbPayload } from '../../src/utils/adsbParser';
import { classifyFlight } from '../../src/utils/aircraftClassification';
import { clearNetworkCircuitState } from '../../src/utils/network';

beforeEach(() => {
    clearNetworkCircuitState();
});

describe('integration: flight classification + parsing', () => {
    it('classifies parsed aircraft correctly', () => {
        const payload = {
            ac: [
                { lat: 40.7, lon: -74.0, flight: 'UAL123', alt_baro: 37000, ownOp: 'United Airlines' },
                { lat: 35.7, lon: -74.0, flight: 'FDX456', alt_baro: 35000, ownOp: 'FedEx' },
                { lat: 30.7, lon: -74.0, flight: 'RCH789', alt_baro: 33000 },
            ],
        };

        const aircraft = parseAdsbPayload(payload, 'test');
        
        expect(classifyFlight(aircraft[0])).toBe('passenger');
        expect(classifyFlight(aircraft[1])).toBe('cargo');
        expect(classifyFlight(aircraft[2])).toBe('military');
    });
});

describe('integration: multi-aircraft parsing', () => {
    it('handles large payload', () => {
        const aircraft = Array.from({ length: 100 }, (_, i) => ({
            lat: 40 + (i * 0.1),
            lon: -74 + (i * 0.1),
            flight: `ACFT${i}`,
            alt_baro: 35000,
        }));

        const payload = { ac: aircraft };
        const parsed = parseAdsbPayload(payload, 'test');

        expect(parsed.length).toBe(100);
    });
});