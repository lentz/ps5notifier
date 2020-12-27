const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer');

require('dotenv').config();

const timeout = 10000;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function checkStock(store, url, xpath, page) {
  try {
    console.log('Checking', store);
    await page.goto(url);
    const inStock = await page.waitForXPath(xpath, { visible: true });
  } catch (err) {
    console.log(err);
    console.log('IN STOCK AT', store);
    await page.screenshot({ path: store + '-instock.png' });
    await page.browser().close();

    await sgMail.send({
      to: process.env.EMAIL,
      from: 'PS5 Notifier <noreply@ps5notifier.herokuapp.com>',
      subject: `PS5 in stock at ${store}`,
      html: `${url}`,
    });

    process.exit();
  }
}

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1366, height: 1024 } });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');

  while(true) {
    await checkStock(
      'Costco',
      'https://www.costco.com/sony-playstation-5-gaming-console-bundle.product.100691489.html',
      '//img[@title="Out of Stock"]',
      page,
    );

    await checkStock(
      'Bestbuy',
      'https://www.bestbuy.com/site/sony-playstation-5-console/6426149.p?skuId=6426149',
      '//button[text() = "Sold Out"]',
      page,
    );

    await checkStock(
      'Target',
      'https://www.target.com/p/playstation-5-console/-/A-81114595',
      '//div[@data-test="outOfStockNearbyMessage"]',
      page,
    );

    await checkStock(
      'Amazon',
      'https://www.amazon.com/dp/B08FC5L3RG/ref=olp_product_details/145-5336814-9080741',
      '//div[@id="outOfStock"]',
      page,
    );

    await page.waitForTimeout(30000);
  }
})().catch(console.error);
