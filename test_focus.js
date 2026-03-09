import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
    console.log(err.stack);
  });
  page.on('console', msg => {
    if(msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  // Enable Aircraft
  await page.evaluate(() => {
    // We can just dispatch the action directly to zustand!
    window.__ZUSTAND_STORE__ = true; // Wait, how to access store?
  });
  
  // Let's just click around
  await page.mouse.click(980, 960); // Bottom right
  await page.waitForTimeout(1000);
  await page.mouse.click(207, 167); // Aircraft
  await page.waitForTimeout(2000);
  
  // Focus Mode
  await page.mouse.click(500, 945);
  await page.waitForTimeout(500);
  // Hide Entities
  await page.mouse.click(540, 945);
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
