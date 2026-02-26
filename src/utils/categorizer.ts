/**
 * categorizer.ts
 * Budget transaction categorization engine.
 * Maps raw transaction descriptions to budget categories using keyword scoring.
 * 100% client-side, no data leaves the browser.
 */

export type BudgetCategory =
    | 'Housing'
    | 'Utilities'
    | 'Groceries'
    | 'Dining & Restaurants'
    | 'Transportation'
    | 'Fuel & Gas'
    | 'Healthcare'
    | 'Insurance'
    | 'Subscriptions & Streaming'
    | 'Shopping & Retail'
    | 'Entertainment'
    | 'Travel'
    | 'Education'
    | 'Savings & Investments'
    | 'Income'
    | 'Transfers'
    | 'Fees & Interest'
    | 'Childcare'
    | 'Pets'
    | 'Personal Care'
    | 'Gifts & Donations'
    | 'Other';

export const ALL_CATEGORIES: BudgetCategory[] = [
    'Housing', 'Utilities', 'Groceries', 'Dining & Restaurants', 'Transportation',
    'Fuel & Gas', 'Healthcare', 'Insurance', 'Subscriptions & Streaming',
    'Shopping & Retail', 'Entertainment', 'Travel', 'Education',
    'Savings & Investments', 'Fees & Interest', 'Childcare', 'Pets',
    'Personal Care', 'Gifts & Donations', 'Transfers', 'Income', 'Other'
];

export const CATEGORY_COLORS: Record<BudgetCategory, string> = {
    Housing: '#6366f1',
    Utilities: '#8b5cf6',
    Groceries: '#22c55e',
    'Dining & Restaurants': '#f59e0b',
    Transportation: '#3b82f6',
    'Fuel & Gas': '#ef4444',
    Healthcare: '#ec4899',
    Insurance: '#14b8a6',
    'Subscriptions & Streaming': '#a855f7',
    'Shopping & Retail': '#f97316',
    Entertainment: '#eab308',
    Travel: '#06b6d4',
    Education: '#84cc16',
    'Savings & Investments': '#10b981',
    'Fees & Interest': '#dc2626',
    Childcare: '#fb7185',
    Pets: '#fbbf24',
    'Personal Care': '#c084fc',
    'Gifts & Donations': '#34d399',
    Transfers: '#64748b',
    Income: '#4ade80',
    Other: '#475569',
};

export interface CategorizedTransaction {
    date: string;
    description: string;
    amount: number;
    source?: string; // Filename of originating uploaded statement
    category: BudgetCategory;
    confidence: 'High' | 'Medium' | 'Low';
}

interface CategoryRule {
    category: BudgetCategory;
    keywords: string[];
    weight: number; // Higher = more confident match
}

const CATEGORY_RULES: CategoryRule[] = [
    // --- HIGH-PRIORITY OVERRIDES (must come first) ---
    // Account verification micro-deposits/debits always = Transfers regardless of bank name
    {
        category: 'Transfers',
        keywords: [
            'acctverify',       // Fidelity/brokerage account verification
            'trialdebit',       // USAA / bank trial debit
            'trial debit',
            'account verify',
            'micro deposit',
        ],
        weight: 12,  // Highest weight — beats everything else
    },

    // --- INCOME ---
    {

        category: 'Income',
        keywords: [
            'payroll', 'direct dep', 'direct deposit', 'ach deposit', 'salary', 'wages',
            'paycheck', 'employer', 'paychex', 'adp', 'gusto', 'zelle dep', 'venmo dep',
            'cashapp dep', 'tax refund', 'irs treas', 'state tax', 'social security',
            'ssa treas', 'pension', 'dividend', 'interest paid', 'transfer in',
        ],
        weight: 10,
    },

    // --- HOUSING ---
    {
        category: 'Housing',
        keywords: [
            'mortgage', 'rent', 'hoa', 'homeowners assoc', 'property tax', 'escrow',
            'quicken loans', 'rocket mortgage', 'wells fargo home', 'chase mortgage',
            'pennymac', 'loancare', 'nationstar', 'mr. cooper', 'property mgmt',
            'apartment', 'landlord',
        ],
        weight: 10,
    },

    // --- UTILITIES ---
    {
        category: 'Utilities',
        keywords: [
            'electric', 'electricity', 'water bill', 'water', 'gas bill', 'gas', 'utility', 'utilities', 'sewer',
            'trash', 'garbage', 'waste mgmt', 'republic services', 'xcel energy',
            'okaloosa', 'okaloosa water', 'okaloosa gas',
            'centerpoint', 'atmos', 'pge', 'duke energy', 'dominion energy',
            'con edison', 'pseg', 'entergy', 'vectren', 'nipsco', 'evergy',
            'internet', 'comcast', 'xfinity', 'att internet', 'spectrum', 'cox',
            'centurylink', 'lumen', 'fios', 'earthlink', 'liveoak fiber',
            'phone bill', 'tmobile', 'verizon wireless', 'att wireless', 'visible',
            'cricket', 'metro pcs', 'boost mobile', 'us cellular', 'red pocket',
        ],
        weight: 9,
    },

    // --- GROCERIES ---
    {
        category: 'Groceries',
        keywords: [
            'kroger', 'safeway', 'albertsons', 'heb', 'publix', 'wegmans',
            'whole foods', 'trader joe', 'aldi', 'sprouts', 'meijer', 'giant',
            'stop shop', 'market basket', 'winn dixie', 'food lion', 'harris teeter',
            'smith food', 'harmons', 'natural grocers', 'fresh market', 'dillons',
            'randalls', 'tom thumb', 'brookshire', 'winco', 'stater bros',
            'grocery', 'supermarket', 'food mart', 'costco food', 'sam\'s club food',
            'winn-dixie', 'wholemarket',
        ],
        weight: 9,
    },

    // --- DINING & RESTAURANTS ---
    {
        category: 'Dining & Restaurants',
        keywords: [
            'mcdonald', 'chick-fil-a', 'chickfila', 'burger king', 'wendy', 'taco bell',
            'tacobell', 'subway', 'panera', 'chipotle', 'starbucks', 'dunkin', 'donut',
            'pizza hut', 'domino', 'papa john', 'little caesar', 'sonic drive',
            'jack in the box', 'dairy queen', 'arby', 'popeye', 'kfc', 'five guys',
            'shake shack', "in-n-out", 'whataburger', 'culver', 'hardee', 'carl\'s jr',
            'denny', 'ihop', 'waffle house', 'cracker barrel', 'olive garden',
            'applebee', 'chili\'s', 'ruby tuesday', 'red lobster', 'outback',
            'longhorn steakhouse', 'texas roadhouse', 'restaurant', 'grubhub', 'doordash',
            'uber eats', 'instacart restaurant', 'postmates', 'eatstreet', 'seamless',
            'tst*', 'sq *', 'toast', 'olo*', 'cafe', 'diner', 'grill', 'bistro',
            'sushi', 'ramen', 'pho restaurant', 'pho noodle', 'thai restaurant', 'chinese food', 'mexican food', 'barbecue',
            'panda express', 'zaxby', 'shrimp basket', 'the shack', 'raising cane', 'honeybee ice cream', 'smalls sliders',
            'don cha', 'shack', 'ajs on the bayou', 'ocean buffet', 'the hudson', 'cicis pizza', 'pedros',
            // User-labeled dining merchants
            'buffalo wild', 'buffalo wild wngs', 'bww',
            'the district seville', 'district seville',
            'menchie',                  // frozen yogurt chain
            'ara uwf concessions',     // UWF arena concessions - food
            'ara uwf',
            'wdw churro',              // Disney food carts
            'jp vending',              // Orlando vending/food
            'coca cola fossil',        // stadium vending food
            'truvi',                   // restaurant Dover DE
        ],
        weight: 8,
    },

    // --- FUEL & GAS ---
    {
        category: 'Fuel & Gas',
        keywords: [
            'shell', 'chevron', 'exxon', 'mobil', 'bp oil', 'marathon', 'sunoco',
            'speedway', 'kwik trip', 'casey\'s', 'circle k', 'racetrac', 'pilot',
            'flying j', 'loves travel', 'wawa', 'sheetz', 'bucee', 'valero',
            'conoco', 'holiday station', 'kwikstar', 'gas station', 'fuel',
            'unleaded', 'gasoline', 'raceway', 'cefco', 'love\'s',
        ],
        weight: 9,
    },

    // --- TRANSPORTATION ---
    {
        category: 'Transportation',
        keywords: [
            'uber', 'lyft', 'taxi', 'transit', 'mta', 'cta', 'bart', 'metro',
            'amtrak', 'greyhound', 'car rental', 'hertz', 'enterprise rent', 'avis',
            'budget car', 'national car', 'zipcar', 'turo', 'auto insurance',
            'car wash', 'jiffy lube', 'oil change', 'dealership', 'ford motor',
            'toyota', 'honda', 'auto repair', 'midas', 'pep boys', 'autozone',
            'parking', 'tolls', 'ezpass', 'expressway', 'turnpike',
            'sp ulc-vh',               // SpotHero parking app
            'ctlp*venuplus', 'venuplus', // Venue parking/ticketing pass
        ],
        weight: 8,
    },

    // --- HEALTHCARE ---
    {
        category: 'Healthcare',
        keywords: [
            'cvs pharmacy', 'walgreens', 'rite aid', 'pharmacy', 'rx', 'prescription',
            'hospital', 'clinic', 'urgent care', 'emergency', 'doctor', 'dentist', 'dental',
            'optometrist', 'vision', 'lab corp', 'quest diagnostics', 'medical',
            'health', 'wellcare', 'aetna', 'cigna claim', 'humana', 'blue cross',
            'bcbs', 'united health', 'anthem', 'optum', 'kaiser', 'physical therapy',
            'chiropractic', 'mental health', 'psychiatry', 'therapy', 'wwmc pa',
            'nhc.com', 'nhc.com 920', // National HealthCare Corp (nursing/rehab)
        ],
        weight: 9,
    },

    // --- INSURANCE ---
    {
        category: 'Insurance',
        keywords: [
            'insurance', 'geico', 'progressive', 'state farm', 'allstate', 'liberty mutual',
            'nationwide', 'farmers ins', 'usaa insurance', 'travelers ins', 'hartford ins',
            'life insurance', 'term life', 'whole life', 'disability ins',
        ],
        weight: 9,
    },

    // --- SUBSCRIPTIONS & STREAMING ---
    {
        category: 'Subscriptions & Streaming',
        keywords: [
            'netflix', 'hulu', 'disney+', 'disney plus', 'hbo', 'max', 'peacock',
            'paramount', 'apple tv', 'amazon prime', 'prime video', 'spotify', 'apple music',
            'pandora', 'tidal', 'sirius', 'xm radio', 'youtube premium', 'youtube tv',
            'adobe', 'microsoft 365', 'office 365', 'icloud storage', 'dropbox',
            'google one', 'google storage', 'amazon web', 'aws', 'github',
            'adobe creative', 'canva', 'figma', 'notion', 'slack', 'zoom', 'webex',
            'planet fitness', 'peloton', 'beachbody', 'noom', 'lifesum',
            'duolingo', 'masterclass', 'skillshare', 'coursera', 'linkedin premium',
            'subscription', 'membership', 'poe.com', 'nyt games', 'adaptedmind',
            'wmt plus', 'nzb.su', 'nzbfinder', 'beenverified',
        ],
        weight: 8,
    },

    // --- SHOPPING & RETAIL ---
    {
        category: 'Shopping & Retail',
        keywords: [
            'amazon', 'walmart', 'target', 'costco', 'sam\'s club', 'bj\'s wholesale',
            'best buy', 'home depot', 'lowes', 'menards', 'ikea', 'wayfair',
            'chewy', 'ebay', 'etsy', 'shein', 'temu', 'aliexpress', 'wish',
            'macy', 'nordstrom', 'bloomingdales', 'neiman marcus', 'saks',
            'gap', 'old navy', 'banana republic', 'h&m', 'zara', 'forever 21',
            'ross', 'tjmaxx', 'tj maxx', 'marshalls', 'burlington', 'tuesday morning',
            'dollar general', 'dollar-general', 'dollar-ge', 'dollar ge',  // all DG variants
            'dollar tree', 'dollartree', 'dollartre',                       // Dollar Tree variants
            'five below', 'five belo',                                      // Five Below variants
            'big lots', 'overstock',
            'paypal', 'shopify', 'square', 'retail', 'store', 'marketplace',
            'temu.com', 'ali express', 'wal-mart', 'wm supercenter', 'tgt',
            'family dollar', 'harbor freight', 'jcpenney', 'tailored brands', 'bealls',
            'coral reef gifts', 'sugar planet', 'thrift', 'sams club',
            'mercari', 'poshmark',
            'old time pottery',        // home decor retail
            'tractor supply',          // farm/pet/retail supply store
            'ft walton beach thri',    // Fort Walton Beach Thrift store
            'gbb - valparaiso', 'gbb valparaiso', // GBB clothing store
            'son silver west galler',  // Silver West Gallery (art/gifts retail)
            'son silver',
        ],
        weight: 6,
    },

    // --- ENTERTAINMENT ---
    {
        category: 'Entertainment',
        keywords: [
            'movie', 'cinema', 'amc theater', 'regal cinema', 'cinemark', 'odeon',
            'concert', 'ticketmaster', 'stubhub', 'eventbrite', 'live nation',
            'bowling', 'golf', 'topgolf', 'mini golf', 'arcade', 'dave & buster',
            'escape room', 'museum', 'zoo', 'aquarium', 'theme park', 'six flags',
            'disneyland', 'disneyworld', 'seaworld', 'universal studios',
            'bar tab', 'nightclub', 'comedy club', 'casino', 'lottery',
            'steam games', 'playstation', 'xbox', 'nintendo', 'apple arcade',
            'google play games', 'gamestop', 'game stop', 'surge trampoline', 'gulfarium',
            'busch gardens', 'wdw emporium', 'wdw landscape', 'universal aventura',
            'pink jeep tours', 'ft walton b bowl', 'bowl', 'park',
            'seatgeek',
            // User-labeled entertainment merchants
            'thesquadzone', 'squadzone',    // sports/gambling venue (user labeled gambling)
            'adventures unlimited',         // kids adventure/outdoor entertainment
            'gulf shores ol rec', 'gulf shores rec', // Gulf Shores outdoor recreation
            'urban air',                    // trampoline park for kids
            'dest univ orlando', 'dest univ', // Universal Studios destination tickets
            'huraf itt', 'hurlburt itt',    // Hurlburt ITT (Tickets & Tours military)
            'new orleans saints',           // NFL sports tickets
            'wdw churro', 'wdw ink', 'jp vending', // Disney World experiences
            'universals aventura',          // Universal's Aventura Hotel
            'ctlp*venuplus', 'venuplus',    // Venue ticketing/pass
            'coca cola fossil',             // stadium concession/entertainment
        ],
        weight: 7,
    },

    // --- TRAVEL ---
    {
        category: 'Travel',
        keywords: [
            'airline', 'delta', 'united air', 'american air', 'southwest air',
            'jetblue', 'spirit air', 'frontier air', 'alaska air', 'allegiant',
            'hotel', 'marriott', 'hilton', 'hyatt', 'sheraton', 'holiday inn',
            'best western', 'airbnb', 'vrbo', 'booking.com', 'expedia', 'priceline',
            'travel agency', 'trip advisor', 'seat guru', 'kayak', 'hopper',
            'baggage', 'flight', 'cruise', 'carnival', 'royal caribbean', 'ncl',
            'booking bv', 'sarazona.host',
            'huraf itt', 'hurlburt itt',   // Hurlburt ITT travel desk (also in Entertainment, travel wins at weight 8)
            'universals aventura', 'aventura ho', // Universal's Aventura Hotel
            'dest univ',                    // Universal destination ticket services
        ],
        weight: 8,
    },

    // --- EDUCATION ---
    {
        category: 'Education',
        keywords: [
            'tuition', 'school', 'college', 'university', 'student loan', 'sallie mae',
            'navient', 'great lakes', 'nelnet', 'fedloan', 'mohela',
            'bookstore', 'textbook', 'udemy', 'khan academy', 'chegg', 'college board',
            'sat', 'act test', 'daycare', 'preschool', 'montessori',
            'liza jackson', 'zeffy*', 'treering', 'scholastic education', 'studentreasures',
            'educational products',    // Educational Products company TX
        ],
        weight: 9,
    },

    // --- SAVINGS & INVESTMENTS ---
    {
        category: 'Savings & Investments',
        keywords: [
            'transfer to savings', 'savings account', '401k', 'ira contribution', 'roth ira',
            'fidelity', 'vanguard', 'schwab', 'etrade', 'td ameritrade', 'robinhood',
            'acorns', 'wealthfront', 'betterment', 'sofi invest', 'coinbase',
            'investment', 'brokerage', 'mutual fund', 'etf purchase',
            'swan.com', 'swan btc', 'prime trust', 'voyager', 'natl fin svc', 'sofi securities',
            // User-labeled investment keywords
            'fid bkg svc', 'fid bkg svc llc', 'fidelity bkg', 'moneyline',  // Fidelity MoneyLine = brokerage fund transfers
            'stash capital', 'stash app',   // Stash investing app ACH pulls
            'swan raymond',                 // Swan Bitcoin recurring purchases
            'withdrawal to savings',        // SoFi withdrawal to savings vault
            'idaho first bank newaccdep',   // new savings account deposit
        ],
        weight: 9,
    },

    // --- FEES & INTEREST ---
    {
        category: 'Fees & Interest',
        keywords: [
            'late fee', 'overdraft', 'nsf fee', 'returned item', 'monthly fee',
            'maintenance fee', 'service charge', 'atm fee', 'wire fee', 'foreign transaction',
            'interest charge', 'finance charge', 'annual fee', 'origination fee',
            'plan fee', 'citi flex plan', 'interest',
            // Government fees & legal
            'dmv data', 'dmv.com',          // DMV record purchase
            'hsmv', 'hsmv crash report',    // FL Highway Safety crash reports
            'law firm', 'attorney',         // Legal fees
            'oberliesen',                   // Specific attorney (Oberliesen Law Firm)
        ],
        weight: 9,
    },

    // --- CHILDCARE ---
    {
        category: 'Childcare',
        keywords: [
            'daycare', 'childcare', 'babysitter', 'nanny', 'after school', 'camp',
            'summer camp', 'kids club', 'child support', 'pediatric',
            'our family wizard', 'ofw',     // co-parenting communication app
        ],
        weight: 9,
    },

    // --- PETS ---
    {
        category: 'Pets',
        keywords: [
            'petco', 'petsmart', 'chewy', 'pet food', 'pet store', 'veterinary', 'vet clinic',
            'animal hospital', 'pet insurance', 'dog grooming', 'cat grooming', 'pet boarding',
        ],
        weight: 9,
    },

    // --- PERSONAL CARE ---
    {
        category: 'Personal Care',
        keywords: [
            'salon', 'barber', 'hair cut', 'haircut', 'great clips', 'supercuts', 'sport clips',
            'nail salon', 'spa', 'massage', 'beauty supply', 'ulta', 'sephora',
            'bath body works', 'lush', 'skincare', 'regal nails', 'ubreakifix',
        ],
        weight: 8,
    },

    // --- GIFTS & DONATIONS ---
    {
        category: 'Gifts & Donations',
        keywords: [
            'charity', 'donation', 'nonprofit', 'church', 'tithe', 'offering',
            'goodwill', 'salvation army', 'red cross', 'gofundme', 'patreon',
            'zelle gift', 'venmo gift', 'cashapp gift', '1-800-flowers', 'ftd',
        ],
        weight: 8,
    },

    // --- TRANSFERS (inter-account payments, ATM, peer-to-peer) ---
    {
        category: 'Transfers',
        keywords: [
            'transfer', 'zelle', 'venmo', 'cashapp', 'paypal transfer', 'wire transfer',
            'atm withdrawal', 'cash withdrawal', 'check',
            'payment to', 'online payment', 'autopay', 'auto pay', 'automatic payment',
            'payment thank you', 'payment received',
            'credit card payment', 'card payment',
            'payment - thank you', 'online pymt', 'ach payment', 'citi flex pay',
            // ATM & bank-to-bank transfers
            'atm flfwnb', 'atm fl',         // Fort Walton National Bank ATMs
            'cardmember serv web pymt',     // Citi credit card payment
            'cardmember serv', 'web pymt',
            'withdrawal to other vault',    // SoFi vault transfers
            'usaa fsb trialdebit',          // USAA bank verification micro-deposit
            'usaa fsb trial',
            'natl fin svc llc acctverify',  // Fidelity account verification micro-deposit
            'acctverify',
        ],
        weight: 6,
    },
];

/**
 * Categorizes a single transaction description with confidence score.
 */
export function categorizeTransaction(
    description: string,
    amount: number,
    overrides: Record<string, string> = {}
): { category: BudgetCategory; confidence: 'High' | 'Medium' | 'Low' } {
    const normalized = description.toLowerCase().trim();

    // 0. Manual Override Priority
    if (overrides[normalized]) {
        return { category: overrides[normalized] as BudgetCategory, confidence: 'High' };
    }

    // 1. Keyword Matching (Sign-Agnostic)
    let bestScore = 0;
    let bestCategory: BudgetCategory = 'Other';

    for (const rule of CATEGORY_RULES) {
        // Bonus for correct direction (for non-inverted statements), but allow sign-agnostic matching
        // (For this user's inverted statements, we want sign-agnostic to win)
        const matchesDirection = (rule.category === 'Income' && amount > 0) || (rule.category !== 'Income' && amount < 0);

        for (const keyword of rule.keywords) {
            if (normalized.includes(keyword.toLowerCase())) {
                let score = rule.weight;
                if (matchesDirection) score += 2; // Bonus for traditional direction

                if (score > bestScore) {
                    bestScore = score;
                    bestCategory = rule.category;
                }
            }
        }
    }

    // 2. Fallback for positive amounts (Income/Transfer) vs negative (Other)
    if (bestScore === 0) {
        if (amount > 0) return { category: 'Transfers', confidence: 'Low' };
        return { category: 'Other', confidence: 'Low' };
    }

    const confidence: 'High' | 'Medium' | 'Low' =
        bestScore >= 9 ? 'High' : bestScore >= 7 ? 'Medium' : 'Low';

    return { category: bestCategory, confidence };
}

/**
 * Categorizes an array of raw transactions.
 */
export function categorizeAll(
    transactions: Array<{ date: string; description: string; amount: number; source?: string }>,
    overrides: Record<string, string> = {}
): CategorizedTransaction[] {
    return transactions.map(tx => {
        const { category, confidence } = categorizeTransaction(tx.description, tx.amount, overrides);
        return { ...tx, category, confidence };
    });
}

/**
 * Aggregates categorized transactions into spending totals by category.
 */
export function aggregateByCategory(
    transactions: CategorizedTransaction[]
): Record<BudgetCategory, number> {
    const result = {} as Record<BudgetCategory, number>;

    for (const tx of transactions) {
        if (!result[tx.category]) result[tx.category] = 0;
        // We store expenses as negative; abs value for display
        result[tx.category] += Math.abs(tx.amount);
    }

    return result;
}

/**
 * Returns only expense transactions (excludes income and transfers).
 */
export function getExpenses(transactions: CategorizedTransaction[]): CategorizedTransaction[] {
    return transactions.filter(
        tx => tx.category !== 'Income' && tx.category !== 'Transfers'
    );
}

/**
 * Returns all income transactions.
 */
export function getIncome(transactions: CategorizedTransaction[]): CategorizedTransaction[] {
    return transactions.filter(tx => tx.category === 'Income');
}

/**
 * Calculate total income from categorized transactions.
 */
export function totalIncome(transactions: CategorizedTransaction[]): number {
    return getIncome(transactions).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

/**
 * Calculate total expenses from categorized transactions.
 */
export function totalExpenses(transactions: CategorizedTransaction[]): number {
    return getExpenses(transactions).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

/**
 * Returns all transfer transactions.
 */
export function getTransfers(transactions: CategorizedTransaction[]): CategorizedTransaction[] {
    return transactions.filter(tx => tx.category === 'Transfers');
}

/**
 * Returns all Other (uncategorized) transactions that aren't expenses or income.
 * Usually expenses with low confidence or missed rules.
 */
export function getUncategorized(transactions: CategorizedTransaction[]): CategorizedTransaction[] {
    return transactions.filter(tx => tx.category === 'Other');
}
