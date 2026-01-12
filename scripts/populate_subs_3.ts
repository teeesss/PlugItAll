import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const subsPath = path.join(projectRoot, 'src', 'data', 'subs.json');

const existingSubs = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const existingIds = new Set(existingSubs.map((s: any) => s.id));

const newSubs = [
  // --- Dev Tools / Hosting ---
  {
    id: 'vercel',
    name: 'Vercel',
    regex_keywords: ['VERCEL'],
    logo: 'https://logo.clearbit.com/vercel.com',
    cancel_url: 'https://vercel.com/dashboard',
    instructions: 'Settings > Billing > Cancel.',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    regex_keywords: ['NETLIFY'],
    logo: 'https://logo.clearbit.com/netlify.com',
    cancel_url: 'https://app.netlify.com/teams/settings/billing',
    instructions: 'Team Settings > Billing > Cancel Plan.',
  },
  {
    id: 'jetbrains',
    name: 'JetBrains',
    regex_keywords: ['JETBRAINS'],
    logo: 'https://logo.clearbit.com/jetbrains.com',
    cancel_url: 'https://account.jetbrains.com/licenses',
    instructions: 'Licenses > Manage > Cancel Subscription.',
  },
  {
    id: 'render',
    name: 'Render',
    regex_keywords: ['RENDER'],
    logo: 'https://logo.clearbit.com/render.com',
    cancel_url: 'https://dashboard.render.com/billing',
    instructions: 'Billing > Downgrade/Cancel.',
  },
  {
    id: 'fly_io',
    name: 'Fly.io',
    regex_keywords: ['FLY.IO'],
    logo: 'https://logo.clearbit.com/fly.io',
    cancel_url: 'https://fly.io/dashboard',
    instructions: 'Dashboard > Billing > Cancel.',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    regex_keywords: ['SENTRY'],
    logo: 'https://logo.clearbit.com/sentry.io',
    cancel_url: 'https://sentry.io/settings/billing',
    instructions: 'Settings > Billing > Subscription > Cancel.',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    regex_keywords: ['DATADOG'],
    logo: 'https://logo.clearbit.com/datadoghq.com',
    cancel_url: 'https://app.datadoghq.com/billing',
    instructions: 'Plan & Usage > Cancel.',
  },

  // --- Password Managers / Security ---
  {
    id: '1password',
    name: '1Password',
    regex_keywords: ['1PASSWORD'],
    logo: 'https://logo.clearbit.com/1password.com',
    cancel_url: 'https://my.1password.com/billing',
    instructions: 'Billing > Delete Account or Unsubscribe.',
  },
  {
    id: 'lastpass',
    name: 'LastPass',
    regex_keywords: ['LASTPASS'],
    logo: 'https://logo.clearbit.com/lastpass.com',
    cancel_url: 'https://lastpass.com/my.php',
    instructions: 'Account Settings > My Account > Cancel Renewal.',
  },
  {
    id: 'dashlane',
    name: 'Dashlane',
    regex_keywords: ['DASHLANE'],
    logo: 'https://logo.clearbit.com/dashlane.com',
    cancel_url: 'https://www.dashlane.com/account/summary',
    instructions: 'My Account > Subscription > Cancel.',
  },
  {
    id: 'bitwarden',
    name: 'Bitwarden',
    regex_keywords: ['BITWARDEN'],
    logo: 'https://logo.clearbit.com/bitwarden.com',
    cancel_url: 'https://vault.bitwarden.com/#/settings/billing',
    instructions: 'Settings > Billing > Cancel Subscription.',
  },

  // --- Media / News ---
  {
    id: 'new_yorker',
    name: 'The New Yorker',
    regex_keywords: ['NEW YORKER'],
    logo: 'https://logo.clearbit.com/newyorker.com',
    cancel_url: 'https://www.newyorker.com/account/subscription',
    instructions: 'Account > Subscription > Cancel.',
  },
  {
    id: 'the_atlantic',
    name: 'The Atlantic',
    regex_keywords: ['THE ATLANTIC', 'ATLANTIC MONTHLY'],
    logo: 'https://logo.clearbit.com/theatlantic.com',
    cancel_url: 'https://accounts.theatlantic.com/settings',
    instructions: 'Settings > Cancel Subscription.',
  },
  {
    id: 'wired',
    name: 'Wired',
    regex_keywords: ['WIRED MAGAZINE', 'WIRED'],
    logo: 'https://logo.clearbit.com/wired.com',
    cancel_url: 'https://www.wired.com/account',
    instructions: 'Account > Subscription > Cancel.',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    regex_keywords: ['BLOOMBERG'],
    logo: 'https://logo.clearbit.com/bloomberg.com',
    cancel_url: 'https://www.bloomberg.com/account/subscription',
    instructions: 'Account > Subscription > Cancel.',
  },
  {
    id: 'ft',
    name: 'Financial Times',
    regex_keywords: ['FINANCIAL TIMES', 'FT.COM'],
    logo: 'https://logo.clearbit.com/ft.com',
    cancel_url: 'https://www.ft.com/myaccount',
    instructions: 'My Account > Manage Subscription > Cancel.',
  },

  // --- Health / Wellness ---
  {
    id: 'headspace',
    name: 'Headspace',
    regex_keywords: ['HEADSPACE'],
    logo: 'https://logo.clearbit.com/headspace.com',
    cancel_url: 'https://www.headspace.com/subscription/manage',
    instructions: 'Account > Subscription > Turn off auto-renewal.',
  },
  {
    id: 'calm',
    name: 'Calm',
    regex_keywords: ['CALM.COM', 'CALM APP'],
    logo: 'https://logo.clearbit.com/calm.com',
    cancel_url: 'https://www.calm.com/profile',
    instructions: 'Profile > Manage Subscription > Cancel.',
  },
  {
    id: 'noom',
    name: 'Noom',
    regex_keywords: ['NOOM'],
    logo: 'https://logo.clearbit.com/noom.com',
    cancel_url: 'https://www.noom.com/#/settings',
    instructions: 'Settings > Manage Subscription > Cancel.',
  },
  {
    id: 'weightwatchers',
    name: 'WeightWatchers',
    regex_keywords: ['WEIGHT WATCHERS', 'WW INTL'],
    logo: 'https://logo.clearbit.com/weightwatchers.com',
    cancel_url: 'https://cmx.weightwatchers.com/settings',
    instructions: 'Account > Cancel My Account.',
  },
  {
    id: 'whoop',
    name: 'Whoop',
    regex_keywords: ['WHOOP'],
    logo: 'https://logo.clearbit.com/whoop.com',
    cancel_url: 'https://app.whoop.com/membership',
    instructions: 'Membership > Cancel Membership.',
  },

  // --- Social / Dating ---
  {
    id: 'twitter_blue',
    name: 'X Premium (Twitter)',
    regex_keywords: ['TWITTER', 'X PREMIUM'],
    logo: 'https://logo.clearbit.com/twitter.com',
    cancel_url: 'https://twitter.com/settings/monetization',
    instructions: 'Premium > Preferences > Cancel.',
  },
  {
    id: 'feeld',
    name: 'Feeld',
    regex_keywords: ['FEELD'],
    logo: 'https://logo.clearbit.com/feeld.co',
    cancel_url: 'https://feeld.co/',
    instructions: 'Manage via App Store / Google Play.',
  },
  {
    id: 'her',
    name: 'Her',
    regex_keywords: ['HER APP'],
    logo: 'https://logo.clearbit.com/weareher.com',
    cancel_url: 'https://weareher.com/',
    instructions: 'Manage via App Store / Google Play.',
  },

  // --- Donations ---
  {
    id: 'gofundme',
    name: 'GoFundMe',
    regex_keywords: ['GOFUNDME'],
    logo: 'https://logo.clearbit.com/gofundme.com',
    cancel_url: 'https://www.gofundme.com/sign-in',
    instructions: 'Recurring donation management.',
  },
  {
    id: 'actblue',
    name: 'ActBlue',
    regex_keywords: ['ACTBLUE'],
    logo: 'https://logo.clearbit.com/actblue.com',
    cancel_url: 'https://secure.actblue.com/my-express',
    instructions: 'Account > Recurring Donations > Cancel.',
  },
  {
    id: 'winred',
    name: 'WinRed',
    regex_keywords: ['WINRED'],
    logo: 'https://logo.clearbit.com/winred.com',
    cancel_url: 'https://winred.com/profile',
    instructions: 'Profile > Subscriptions > Cancel.',
  },
  {
    id: 'kofi',
    name: 'Ko-fi',
    regex_keywords: ['KO-FI'],
    logo: 'https://logo.clearbit.com/ko-fi.com',
    cancel_url: 'https://ko-fi.com/account/payments',
    instructions: 'More > Account > Payment History > Cancel.',
  },

  // --- Telephony / SIP ---
  {
    id: 'twilio',
    name: 'Twilio',
    regex_keywords: ['TWILIO'],
    logo: 'https://logo.clearbit.com/twilio.com',
    cancel_url: 'https://www.twilio.com/console',
    instructions: 'Release numbers / Close Project.',
  },
  {
    id: 'zoom_phone',
    name: 'Zoom Phone',
    regex_keywords: ['ZOOM PHONE'],
    logo: 'https://logo.clearbit.com/zoom.us',
    cancel_url: 'https://zoom.us/billing',
    instructions: 'Billing > Plans > Cancel.',
  },
  {
    id: 'opencnam',
    name: 'OpenCNAM',
    regex_keywords: ['OPENCNAM'],
    logo: 'https://logo.clearbit.com/opencnam.com',
    cancel_url: 'https://www.opencnam.com/',
    instructions: 'Dashboard > Settings.',
  },

  // --- Cloud Storage ---
  {
    id: 'box',
    name: 'Box',
    regex_keywords: ['BOX.COM', 'BOX *STORAGE'],
    logo: 'https://logo.clearbit.com/box.com',
    cancel_url: 'https://app.box.com/billing',
    instructions: 'Admin Console > Billing > Cancel Account.',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    regex_keywords: ['MICROSOFT*ONEDRIVE', 'ONEDRIVE'],
    logo: 'https://logo.clearbit.com/microsoft.com',
    cancel_url: 'https://onedrive.live.com/options',
    instructions: 'Options > Plans and upgrades > Manage.',
  },

  // --- Misc ---
  {
    id: 'classpass',
    name: 'ClassPass',
    regex_keywords: ['CLASSPASS'],
    logo: 'https://logo.clearbit.com/classpass.com',
    cancel_url: 'https://classpass.com/account/settings',
    instructions: 'Account > Manage Plan > Cancel.',
  },
  {
    id: 'carbonite',
    name: 'Carbonite',
    regex_keywords: ['CARBONITE'],
    logo: 'https://logo.clearbit.com/carbonite.com',
    cancel_url: 'https://my.carbonite.com/billing',
    instructions: 'Account > Billing > Turn off auto-renew.',
  },
  {
    id: 'backblaze',
    name: 'Backblaze',
    regex_keywords: ['BACKBLAZE'],
    logo: 'https://logo.clearbit.com/backblaze.com',
    cancel_url: 'https://secure.backblaze.com/user_signin.htm',
    instructions: 'Preferences > Billing > Cancel.',
  },
  {
    id: 'protonmail',
    name: 'ProtonMail',
    regex_keywords: ['PROTONMAIL'],
    logo: 'https://logo.clearbit.com/proton.me',
    cancel_url: 'https://account.proton.me/u/0/dashboard',
    instructions: 'Dashboard > Downgrade.',
  },
  {
    id: 'fastmail',
    name: 'Fastmail',
    regex_keywords: ['FASTMAIL'],
    logo: 'https://logo.clearbit.com/fastmail.com',
    cancel_url: 'https://www.fastmail.com/settings/billing',
    instructions: 'Settings > Billing > Cancel.',
  },
  {
    id: 'name_com',
    name: 'Name.com',
    regex_keywords: ['NAME.COM'],
    logo: 'https://logo.clearbit.com/name.com',
    cancel_url: 'https://www.name.com/account/settings',
    instructions: 'Account > Billing > Cancel.',
  },
];

let added = 0;
for (const sub of newSubs) {
  if (!existingIds.has(sub.id)) {
    existingSubs.push(sub);
    added++;
  }
}

if (added > 0) {
  fs.writeFileSync(subsPath, JSON.stringify(existingSubs, null, 2));
  console.log(`Added ${added} new subscriptions to database.`);
} else {
  console.log('No new subscriptions added (all known).');
}
