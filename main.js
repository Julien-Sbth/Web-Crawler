const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

let lastClickedTitle = '';

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html', req.url);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.end('404 Not Found');
        } else {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('500 Internal Server Error');
                } else {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end(data);
                }
            });
        }
    });
});

server.on('request', (req, res) => {
    if (req.url === '/movements' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ title: lastClickedTitle }));
    }
});

server.listen(8080, 'localhost', () => {
    console.log('Le serveur est en cours d\'exécution sur http://localhost:8080/');
});

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
        const page = await browser.newPage();

        page.on('error', console.error);
        page.on('pageerror', console.error);

        await page.goto('https://www.crunchyroll.com/fr');
        await page.waitForSelector('.erc-anonymous-user-menu');
        await page.click('.erc-anonymous-user-menu');

        const sendMovement = async (title) => {
            try {
                await axios.post('http://localhost:8080/movements', { title });
            } catch (err) {
                console.error(err);
            }
        };

        const userMenuNavItems = await page.$$('.erc-user-menu-nav-item');
        await userMenuNavItems[1].click();

        await page.waitForTimeout(1000);

        await page.waitForSelector('#username_input');
        await page.type('#username_input', 'test2743753@gmail.com');

        await page.waitForTimeout(1000);

        await page.waitForSelector('#password_input');
        await page.type('#password_input', 'votre_mot_de_passe');

        await Promise.all([
            page.waitForNavigation(),
            page.click('#submit_button')
        ]);

        page.on('click', 'a.browse-card-static__link--VtufN', () => {
            page.evaluate(() => {
                const titleElement = document.querySelector('a.browse-card-static__link--VtufN');
                const title = titleElement.textContent.trim();
                console.log('Titre cliqué:', title);
                lastClickedTitle = title;
            });
            sendMovement(lastClickedTitle);
        });

        console.log('Connecté!');

        await page.waitForTimeout(50000000);

        await browser.close();

        server.close(() => {
            console.log('Le serveur local a été arrêté.');
        });
    } catch (err) {
        console.error(err);
    }
})();
