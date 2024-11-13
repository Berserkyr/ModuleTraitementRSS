require('dotenv').config();
const RSSParser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');

const parser = new RSSParser();

// Fonction pour envoyer l'URL de l'article au service Python
async function rebrandArticle(url, model = "bart-large", style = "professionnel") {
    try {
        const response = await axios.post(
            'http://127.0.0.1:5000/paraphrase',  
            {
                url: url,                    
                model: model,
                max_length: 600,
                do_sample: true,
                temperature: 0.8,
                style: style
            }
        );
        console.log('Réponse du service Python:', response.data); 
        return response.data.paraphrased_text; 
    } catch (error) {
        console.error('Erreur avec le service de reformulation :', error.response ? error.response.data : error.message);
        return null;
    }
}

// Fonction pour récupérer et reformuler les articles depuis le flux RSS
async function fetchAndRebrandRSS(url) {
    try {
        const feed = await parser.parseURL(url);
        const maxArticles = 1; 
        const rebrandedArticles = []; 

        for (let i = 0; i < Math.min(feed.items.length, maxArticles); i++) {
            const item = feed.items[i];
            console.log(`Traitement de l'article : ${item.title}`);
            
            // Envoyer l'URL de l'article pour extraire et reformuler
            const rebrandedContent = await rebrandArticle(item.link, "bart-large", "professionnel");

            if (rebrandedContent) {
                rebrandedArticles.push({
                    title: item.title,
                    link: item.link,
                    rebrandedContent: rebrandedContent
                });
                console.log(`Contenu rebrandé : ${rebrandedContent}\n`);
            } else {
                console.log("La reformulation a échoué pour cet article.\n");
            }
        }

        
        fs.writeFileSync('rebranded_articles.json', JSON.stringify(rebrandedArticles, null, 2));
        console.log('Articles reformulés enregistrés dans rebranded_articles.json');
        
    } catch (error) {
        console.error('Erreur de récupération ou de rebranding :', error);
    }
}


fetchAndRebrandRSS('https://feeds.bbci.co.uk/news/business/rss.xml');
