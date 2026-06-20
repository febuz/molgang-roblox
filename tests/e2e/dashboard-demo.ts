import { Builder, By, until } from 'selenium-webdriver';
import Chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

const BASE = process.env.DEMO_BASE_URL || 'http://localhost:3100';
const CHROMEDRIVER_PATH = path.join(__dirname, '..', '..', 'node_modules', 'chromedriver', 'bin', 'chromedriver');
const OUT = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function snap(driver: any, name: string) {
  const file = path.join(OUT, name);
  const b64 = await driver.takeScreenshot();
  fs.writeFileSync(file, b64, 'base64');
  console.log('📸', file);
  return file;
}

(async () => {
  const opts = new Chrome.Options();
  // headless so it works in any shell; set HEADLESS=false to see the browser
  if (process.env.HEADLESS !== 'false') {
    opts.addArguments('--headless=new');
  }
  opts.addArguments('--window-size=1440,900', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  const service = new Chrome.ServiceBuilder(CHROMEDRIVER_PATH);
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).setChromeService(service).build();
  try {
    console.log('Loading dashboard…');
    await driver.get(`${BASE}/dashboard.html`);
    await driver.sleep(3000);
    await snap(driver, '01-dashboard-overview.png');

    console.log('Clicking backlog…');
    await driver.findElement(By.css('.nav-item[data-page="backlog"]')).click();
    await driver.sleep(2000);
    await snap(driver, '02-dashboard-backlog.png');

    console.log('Clicking an agent card…');
    await driver.findElement(By.css('.nav-item[data-page="overview"]')).click();
    await driver.sleep(1000);
    const cards = await driver.findElements(By.css('#team-overview .agent-card'));
    if (cards.length) {
      await cards[0].click();
      await driver.sleep(2000);
      await snap(driver, '03-dashboard-agent-detail.png');
    }

    console.log('Loading demo page…');
    await driver.get(`${BASE}/demo.html`);
    await driver.sleep(2500);
    await snap(driver, '04-demo-fundamentals.png');

    await driver.findElement(By.css('.tab[data-tab="news"]')).click();
    await driver.sleep(1500);
    await snap(driver, '05-demo-news.png');

    await driver.findElement(By.css('.tab[data-tab="p2p"]')).click();
    await driver.sleep(1500);
    await snap(driver, '06-demo-p2p.png');
  } finally {
    await driver.quit();
  }
})().catch(e => { console.error(e); process.exit(1); });
