/**
 * User-labeled transaction categorization verification
 * From user's "Other" list with explicit labels
 */
import { describe, test, expect } from 'vitest';
import { categorizeTransaction } from '../src/utils/categorizer';

describe('User-labeled transaction categories', () => {

    // INVESTMENTS
    test('FID BKG SVC LLC MONEYLINE -> Savings & Investments', () => {
        const { category } = categorizeTransaction('Direct Payment FID BKG SVC LLC MONEYLINE Transaction ID: 1167-70978001', -13);
        expect(category).toBe('Savings & Investments');
    });
    test('Stash Capital -> Savings & Investments', () => {
        const { category } = categorizeTransaction('Direct Payment STASH CAPITAL (S ACH Transaction ID: 569-13834001', -5);
        expect(category).toBe('Savings & Investments');
    });
    test('Swan Raymond Jo (crypto) -> Savings & Investments', () => {
        const { category } = categorizeTransaction('Direct Payment Swan Raymond Jo Transaction ID: 963-935001', -71);
        expect(category).toBe('Savings & Investments');
    });
    test('Withdrawal To Savings -> Savings & Investments', () => {
        const { category } = categorizeTransaction('Withdrawal To Savings - 6536 Transaction ID: 1358-56756001', -80000);
        expect(category).toBe('Savings & Investments');
    });
    test('Idaho First Bank new account deposit -> Savings & Investments', () => {
        const { category } = categorizeTransaction('Direct Payment IDAHO FIRST BANK NEWACCDEP Transaction ID: 738-265604001', -100);
        expect(category).toBe('Savings & Investments');
    });

    // TRANSFERS
    test('ATM FLFWNB -> Transfers', () => {
        const { category } = categorizeTransaction('ATM FLFWNB Transaction ID: 1328-56362001', -204);
        expect(category).toBe('Transfers');
    });
    test('Cardmember Serv Web Pymt (CC payment) -> Transfers', () => {
        const { category } = categorizeTransaction('Direct Payment CARDMEMBER SERV WEB PYMT Transaction ID: 855-1876001', -300);
        expect(category).toBe('Transfers');
    });
    test('Withdrawal To Other Vault -> Transfers', () => {
        const { category } = categorizeTransaction('Withdrawal To Other Vault Transaction ID: 842-110039001', -10);
        expect(category).toBe('Transfers');
    });
    test('USAA FSB TRIALDEBIT -> Transfers', () => {
        const { category } = categorizeTransaction('Direct Payment USAA FSB TRIALDEBIT Transaction ID: 18-23559001', -1);
        expect(category).toBe('Transfers');
    });
    test('NATL FIN SVC LLC ACCTVERIFY -> Transfers', () => {
        const { category } = categorizeTransaction('Deposit NATL FIN SVC LLC ACCTVERIFY', 0.60);
        expect(category).toBe('Transfers');
    });

    // RETAIL
    test('DOLLAR-GENERAL -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('DOLLAR-GENERAL FORT WALTON B FL', -6);
        expect(category).toBe('Shopping & Retail');
    });
    test('DOLLAR-GE (abbreviated) -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('Debit Card DOLLAR-GE DG 135561198 Transaction ID: 789-3310001', -18);
        expect(category).toBe('Shopping & Retail');
    });
    test('DOLLARTRE -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('Debit Card DOLLARTRE 724 EGLIN PA Transaction ID: 788-3140001', -8);
        expect(category).toBe('Shopping & Retail');
    });
    test('FIVE BELO -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('Debit Card FIVE BELO 99 EGLIN PKW Transaction ID: 849-9512001', -16);
        expect(category).toBe('Shopping & Retail');
    });
    test('Old Time Pottery -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('OLD TIME POTTERY 0008 FOLEY AL', -30);
        expect(category).toBe('Shopping & Retail');
    });
    test('Tractor Supply -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('TRACTOR SUPPLY FOLEY AL', -16);
        expect(category).toBe('Shopping & Retail');
    });
    test('FT WALTON BEACH THRI (thrift) -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('FT WALTON BEACH THRI FORT WALTON B FL', -28);
        expect(category).toBe('Shopping & Retail');
    });
    test('GBB Valparaiso (clothing) -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('GBB - VALPARAISO 5267 VALPARAISO FL', -42);
        expect(category).toBe('Shopping & Retail');
    });
    test('Son Silver West Gallery -> Shopping & Retail', () => {
        const { category } = categorizeTransaction('SON SILVER WEST GALLER SEDONA AZ', -51);
        expect(category).toBe('Shopping & Retail');
    });

    // DINING
    test('Buffalo Wild Wings -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('BUFFALO WILD WNGS 3109 FORT WALTON FL', -73);
        expect(category).toBe('Dining & Restaurants');
    });
    test('The District Seville (dining) -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('THE DISTRICT SEVILLE S PENSACOLA FL', -160);
        expect(category).toBe('Dining & Restaurants');
    });
    test('Menchies frozen yogurt -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('MENCHIE ORLANDO FL', -9);
        expect(category).toBe('Dining & Restaurants');
    });
    test('ARA UWF Concessions -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('ARA UWF CONCESSIONS PENSACOLA FL', -12);
        expect(category).toBe('Dining & Restaurants');
    });
    test('WDW Churro Wagon -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('WDW CHURRO WAGON LAKE BUENA VI FL', -24);
        expect(category).toBe('Dining & Restaurants');
    });
    test('Truvi restaurant -> Dining & Restaurants', () => {
        const { category } = categorizeTransaction('TRUVI DOVER DE', -35);
        expect(category).toBe('Dining & Restaurants');
    });

    // ENTERTAINMENT
    test('TheSquadZone (gambling/entertainment) -> Entertainment', () => {
        const { category } = categorizeTransaction('Debit Card TheSquadZone Transaction ID: 951-80982001', -505);
        expect(category).toBe('Entertainment');
    });
    test('Adventures Unlimited -> Entertainment', () => {
        const { category } = categorizeTransaction('Debit Card Adventures Unlimited, Transaction ID: 864-71850001', -224);
        expect(category).toBe('Entertainment');
    });
    test('Gulf Shores OL Rec -> Entertainment', () => {
        const { category } = categorizeTransaction('Debit Card GULF SHORES OL REC Transaction ID: 806-62674001', -160);
        expect(category).toBe('Entertainment');
    });
    test('Urban Air trampoline park -> Entertainment', () => {
        const { category } = categorizeTransaction('URBAN AIR DESTIN DESTIN FL', -77);
        expect(category).toBe('Entertainment');
    });
    test('New Orleans Saints tickets -> Entertainment', () => {
        const { category } = categorizeTransaction('NEW ORLEANS SAINTS METAIRIE LA', -1905);
        expect(category).toBe('Entertainment');
    });

    // TRAVEL
    test("Universal's Aventura Hotel -> Travel", () => {
        const { category } = categorizeTransaction("UNIVERSALS AVENTURA HO ORLANDO FL", -228);
        expect(category).toBe('Travel');
    });
    test('HURAF ITT Unoff Travel -> Travel', () => {
        const { category } = categorizeTransaction('HURAF ITT UNOFF TRAVEL HURLBURT FLD FL', -823);
        expect(category).toBe('Travel');
    });

    // TRANSPORTATION/PARKING
    test('SP ULC-VH (SpotHero parking) -> Transportation', () => {
        const { category } = categorizeTransaction('SP ULC-VH NEW YORK NY', -54);
        expect(category).toBe('Transportation');
    });

    // CHILDCARE
    test('Our Family Wizard -> Childcare', () => {
        const { category } = categorizeTransaction('OUR FAMILY WIZARD MN', -110);
        expect(category).toBe('Childcare');
    });

    // FEES & LEGAL
    test('DMV Data.com -> Fees & Interest', () => {
        const { category } = categorizeTransaction('DMV DATA.COM 850-745-4562 FL', -24);
        expect(category).toBe('Fees & Interest');
    });
    test('HSMV Crash Report -> Fees & Interest', () => {
        const { category } = categorizeTransaction('HSMV CRASH REPORT 850-617-3438 FL', -12);
        expect(category).toBe('Fees & Interest');
    });
    test('Oberliesen Law Firm -> Fees & Interest', () => {
        const { category } = categorizeTransaction('Debit Card OBERLIESEN LAW FIRM Transaction ID: 1316-719001', -3000);
        expect(category).toBe('Fees & Interest');
    });

    // EDUCATION
    test('Educational Products TX -> Education', () => {
        const { category } = categorizeTransaction('EDUCATIONAL PRODUCTS 832-327-6300 TX', -116);
        expect(category).toBe('Education');
    });

    // HEALTHCARE
    test('NHC.com -> Healthcare', () => {
        const { category } = categorizeTransaction('NHC.COM 920-968-2360 TN', -72);
        expect(category).toBe('Healthcare');
    });
});
