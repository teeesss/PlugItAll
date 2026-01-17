import { describe, expect, test } from 'vitest';
import { matchSubscription } from '../src/utils/matcher';

describe('Enhanced Merchant Keywords (TASK-009)', () => {

    describe('Netflix variations', () => {
        test('matches Netflix.com', () => {
            expect(matchSubscription('NETFLIX.COM')).toEqual(expect.objectContaining({ id: 'netflix' }));
        });

        test('matches Netflix Inc', () => {
            expect(matchSubscription('NETFLIX INC')).toEqual(expect.objectContaining({ id: 'netflix' }));
        });

        test('matches PayPal Netflix', () => {
            expect(matchSubscription('PAYPAL *NETFLIX')).toEqual(expect.objectContaining({ id: 'netflix' }));
        });
    });

    describe('Spotify variations', () => {
        test('matches Spotify USA', () => {
            expect(matchSubscription('SPOTIFY USA')).toEqual(expect.objectContaining({ id: 'spotify' }));
        });

        test('matches Spotify.com', () => {
            expect(matchSubscription('SPOTIFY.COM')).toEqual(expect.objectContaining({ id: 'spotify' }));
        });

        test('matches Spotify Premium', () => {
            expect(matchSubscription('SPOTIFY PREMIUM')).toEqual(expect.objectContaining({ id: 'spotify' }));
        });
    });

    describe('Hulu variations', () => {
        test('matches Hulu.com', () => {
            expect(matchSubscription('HULU.COM')).toEqual(expect.objectContaining({ id: 'hulu' }));
        });

        test('matches Hulu LLC', () => {
            expect(matchSubscription('HULU LLC')).toEqual(expect.objectContaining({ id: 'hulu' }));
        });
    });

    describe('WSJ variations', () => {
        test('matches Wall Street Journal', () => {
            const result = matchSubscription('WALL STREET JOURNAL');
            expect(result).toBeTruthy();
            expect(result?.name).toContain('Wall Street Journal');
        });

        test('matches WSJ.COM', () => {
            const result = matchSubscription('WSJ.COM');
            expect(result).toBeTruthy();
            expect(result?.name).toContain('Wall Street Journal');
        });

        test('matches Dow Jones', () => {
            const result = matchSubscription('DOW JONES');
            expect(result).toBeTruthy();
            expect(result?.name).toContain('Wall Street Journal');
        });
    });

    describe('GitHub variations', () => {
        test('matches GitHub.com', () => {
            expect(matchSubscription('GITHUB.COM')).toEqual(expect.objectContaining({ id: 'github' }));
        });

        test('matches PayPal GitHub', () => {
            expect(matchSubscription('PAYPAL *GITHUB')).toEqual(expect.objectContaining({ id: 'github' }));
        });
    });

    describe('Medium variations', () => {
        test('matches Medium', () => {
            expect(matchSubscription('MEDIUM')).toEqual(expect.objectContaining({ id: 'medium' }));
        });

        test('matches A Medium Corporation', () => {
            expect(matchSubscription('A MEDIUM CORPORATION')).toEqual(expect.objectContaining({ id: 'medium' }));
        });
    });

    describe('Patreon variations', () => {
        test('matches Patreon.com', () => {
            expect(matchSubscription('PATREON.COM')).toEqual(expect.objectContaining({ id: 'patreon' }));
        });
    });

    describe('Apple variations', () => {
        test('matches Apple.com Bill', () => {
            expect(matchSubscription('APPLE.COM BILL')).toEqual(expect.objectContaining({ id: 'apple_services' }));
        });

        test('matches App Store', () => {
            expect(matchSubscription('APP STORE')).toEqual(expect.objectContaining({ id: 'apple_services' }));
        });
    });
});
