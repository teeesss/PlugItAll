# Sample Bank Data for Live Testing

## About This Package
This ZIP contains **10 representative bank CSV files** with synthetic transaction data for testing the subscription detection on the live site: https://www.bmwseals.com/plugit/

## Included Banks

### US Banks (8)
1. **chase.csv** - Standard MM/DD/YYYY format, negative amounts
2. **bofa.csv** - MM/DD/YY with trailing minus (15.99-)
3. **wells_fargo.csv** - Parenthetical amounts (15.99)
4. **capital_one.csv** - ISO YYYY-MM-DD with Debit/Credit columns
5. **amex.csv** - Full addresses and phone numbers in descriptions
6. **discover.csv** - Trans/Post date columns with categories
7. **ally.csv** - Clean ISO format, ACH prefixes
8. **chime.csv** - Digital bank with asterisks in merchant names

### International (2)
9. **hsbc_uk.csv** - European DD/MM/YYYY format, GBP (£)
10. **deutsche_bank.csv** - German DD.MM.YYYY, comma decimals (12,99), German headers

## Expected Subscriptions
Each CSV contains recurring charges for services like:
- Netflix ($15.99/month)
- Spotify ($9.99/month)
- Hulu, Disney+, HBO Max, YouTube Premium, etc.

## How to Test
1. Go to https://www.bmwseals.com/plugit/
2. Upload any CSV from this package
3. Verify subscriptions are correctly detected
4. Check for zero false positives

## What to Verify
✅ All recurring subscriptions detected  
✅ Correct amounts displayed  
✅ Frequency detection (Monthly/Yearly)  
✅ No false positives (one-time Amazon purchases should NOT be detected)

## File Location
Local path: `c:\projects\CancelSubscriptions\just-fucking-cancel\sample_bank_data.zip`
