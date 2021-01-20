async function login(page) {
  console.log('Logging into Costco');
  await page.goto('https://www.costco.com', { waitUntil: 'domcontentloaded' });
  const signIn = await page.waitForSelector('#header_sign_in');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    signIn.click(),
  ]);

  await page.waitForSelector('#logonId', { visible: true });
  await page.type('#logonId', process.env.COSTCO_USER);
  await page.type('#logonPassword', process.env.COSTCO_PASS);
  const signInBtn = await page.waitForXPath('//input[@value="Sign In"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    signInBtn.click(),
  ]);
  await page.waitForSelector('#myaccount-d', { visible: true });
}

module.exports = { login };
