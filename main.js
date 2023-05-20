//@ts-check
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

let titles = [];

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html', req.url);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.statusCode = 404;
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
        res.end(JSON.stringify({ titles: titles }));
    }
});

server.listen(8080, 'localhost', () => {
    console.log('Le serveur est en cours d\'exécution sur http://localhost:8080/');
});

(async () => {
    try {
        const browser = await puppeteer.launch({headless: false, defaultViewport: null, devtools: false});
        const page = await browser.newPage();

        page.on('error', console.error);
        page.on('pageerror', console.error);

        await page.goto('https://www.crunchyroll.com/fr');
        await page.waitForSelector('.erc-anonymous-user-menu');
        await page.click('.erc-anonymous-user-menu');

        const sendMovement = async (titles) => {
            try {
                await axios.post('http://localhost:8080/movements', { titles });
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
        await page.waitForSelector('#submit_button');
        await page.evaluate(() => {
            const btn = document.querySelector('#submit_button');
            btn.click();
        });

        console.log("exists");

        await page.waitForTimeout(1000);
        await page.waitForSelector('a[class^="browse-card-static__link"]');

        const targetElements = await page.$$('a[class^="browse-card-static__link"]');

        for (const element of targetElements) {
            const title = await page.evaluate((elem) => elem.getAttribute('title'), element);
            titles.push(title);
        }

        console.log('Tous les titres:', titles);

        // Envoyer les titres au serveur local
        await sendMovement(titles);

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

function getAnimeTitles(callback) {
    const url = 'https://www.crunchyroll.com/videos/anime';

    request(url, (error, response, body) => {
        if (error) {
            callback(error, null);
            return;
        }

        const $ = cheerio.load(body);
        const titles = [];

        $('h1.series-title').each((index, element) => {
            titles.push($(element).text().trim());
        });

        callback(null, titles);
    });
}

// Appel de la fonction pour récupérer les titres des animés
getAnimeTitles((error, titles) => {
    if (error) {
        console.error('Une erreur s\'est produite :', error);
        return;
    }
    console.log('Titres des animés sur Crunchyroll :');
    titles.forEach((title, index) => {
        console.log(`${index + 1}. ${title}`);
    });
});