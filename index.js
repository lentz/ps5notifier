const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer');

const costco = require('./costco');
const target = require('./target');

require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
let adminNotifyDelay = 0;

const stores = [
  {
    active: false,
    delay: 0,
    inStockXPath: '//span[text() = "Add to cart"]',
    loadedXPath: '//h1[text() = "Sony PlayStation 5, Digital Edition"]',
    name: 'Walmart Digital',
    url: 'https://www.walmart.com/ip/Sony-PlayStation-5-Digital-Edition/493824815',
  },
  {
    active: false,
    delay: 0,
    inStockXPath: '//input[@value="Add to Cart"]',
    loadedXPath: '//span[contains(text(), "PlayStation 5 Digital Edition")]',
    name: 'Amazon Digital',
    url: 'https://www.amazon.com/dp/B08FC6MR62',
  },
  {
    active: false,
    delay: 0,
    inStockXPath: '//img[@title="Out of Stock"]',
    loadedXPath: '//div',
    name: 'Costco Disc',
    url: 'https://www.costco.com/sony-playstation-5-gaming-console-bundle.product.100691489.html',
  },
  {
    active: true,
    delay: 0,
    inStockXPath: '//button[text()="Add to Cart"][@data-sku-id="6430161"]',
    loadedXPath: '//h1[text() = "Sony - PlayStation 5 Digital Edition Console"]',
    name: 'Bestbuy Digital',
    url: 'https://www.bestbuy.com/site/sony-playstation-5-digital-edition-console/6430161.p?skuId=6430161',
  },
  {
    active: true,
    delay: 0,
    inStockXPath: '//button[text()="Pick it up" or text()="Ship it"]',
    loadedXPath: '//span[text() = "PlayStation 5 Digital Edition Console"]',
    name: 'Target Digital',
    url: 'https://www.target.com/p/playstation-5-digital-edition-console/-/A-81114596',
  },
  {
    active: false,
    delay: 0,
    inStockXPath: '//button[text()="Add to Cart"]',
    loadedXPath: '//div',
    name: 'GameStop Digital',
    url: 'https://www.gamestop.com/video-games/playstation-5/consoles/products/playstation-5-digital-edition/11108141.html?condition=New',
  },
  {
    active: true,
    delay: 0,
    inStockXPath: '//div[@id="ProductBuy"]//button[text()="Add to cart "]',
    loadedXPath: '//h1[contains(text(), "PS5 Bundle")]',
    name: 'Newegg Digital',
    url: 'https://www.newegg.com/p/N82E16868110295',
  },
];

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 1280 },
    headless: false,
  });

  await target.login(browser);

  while(true) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');

    for (const store of stores) {
      if (store.active && store.delay < Date.now()) {
        try {
          console.log(new Date().toLocaleString(), 'Checking', store.name);
          await page.goto(store.url, { waitUntil: 'domcontentloaded' });
          try {
            await page.waitForXPath(store.loadedXPath, { timeout: 10000, visible: true });
          } catch (err) {
            console.log('PAGE LOAD FAILED FOR', store.name);
            if (adminNotifyDelay < Date.now()) {
              const screenshot = await page.screenshot({ encoding: 'base64' });
              await sgMail.send({
                attachments: [{
                  filename: 'screenshot.png',
                  type: 'image/png',
                  content_id: 'screenshot',
                  content: screenshot,
                  disposition: 'inline',
                }],
                from: 'PS5 Notifier <fantasynotify@mailinator.com>',
                html: `${store.url}<br /><br /><img src="cid:screenshot" />`,
                subject: `Page load failed for ${store.name}`,
                to: process.env.ADMIN_EMAIL,
              });
              adminNotifyDelay = Date.now() + ONE_HOUR_IN_MS;
            }
            continue;
          }
          const inStock = await page.waitForXPath(store.inStockXPath, { timeout: 10000, visible: true });

          console.log('IN STOCK AT', store.name);

          const screenshot = await page.screenshot({ encoding: 'base64' });

          if (/Target/.test(store.name)) {
            try {
              await target.buy(page, false);
            } catch (err) {
              console.error('Error buying from Target:', err.message);
              await page.screenshot({ path: 'target-purchase-error.png' });
            }
          }

          await sgMail.send({
            attachments: [{
              filename: 'screenshot.png',
              type: 'image/png',
              content_id: 'screenshot',
              content: screenshot,
              disposition: 'inline',
            }],
            from: 'PS5 Notifier <fantasynotify@mailinator.com>',
            html: `${store.url}<br /><br /><img src="cid:screenshot" />`,
            subject: `PS5 in stock at ${store.name}`,
            to: process.env.EMAILS.split(','),
          });

          store.delay = Date.now() + ONE_HOUR_IN_MS;
        } catch (err) {
          if (!/waiting for XPath/i.test(err.message)) {
            console.log('Error checking stock:', err);
          }
        }
      }
    }

    await page.close();
  }
})().catch((err) => console.error(err));
