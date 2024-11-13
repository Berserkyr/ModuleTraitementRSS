from transformers import pipeline
from flask import Flask, request, jsonify
from newspaper import Article 

app = Flask(__name__)

# modèles de reformulation
models = {
    "t5-small": pipeline("text2text-generation", model="t5-small"),
    "bart-large": pipeline("text2text-generation", model="facebook/bart-large-cnn"),
    "flan-t5": pipeline("text2text-generation", model="google/flan-t5-small")
}

def extract_article_content(url):
    """Extrait le contenu principal de l'article à partir de l'URL."""
    try:
        article = Article(url)
        article.download()
        article.parse()
        return article.text
    except Exception as e:
        print(f"Erreur d'extraction de l'article : {e}")
        return None

@app.route('/paraphrase', methods=['POST'])
def paraphrase():
    data = request.get_json()
    url = data.get("url", "")
    model_name = data.get("model", "bart-large")
    max_length = data.get("max_length", 600)
    do_sample = data.get("do_sample", True)
    temperature = data.get("temperature", 0.9)
    style = data.get("style", "professionnel")

    if url:
        
        text = extract_article_content(url)
        if text:
            try:
                # Choisir le modèle de reformulation
                if model_name not in models:
                    return jsonify({"error": "Modèle non supporté."}), 400
                paraphraser = models[model_name]

                # Prompt explicite pour reformuler en français
                prompt = f"Reformule intégralement ce texte en français dans un style {style} : {text}"

                # Reformulation
                result = paraphraser(prompt, max_length=max_length, do_sample=do_sample, temperature=temperature)
                reformulated_text = result[0]['generated_text']

                return jsonify({"paraphrased_text": reformulated_text})

            except Exception as e:
                print("Erreur pendant la reformulation :", str(e))
                return jsonify({"error": f"Erreur pendant la reformulation : {str(e)}"}), 500
        else:
            return jsonify({"error": "Impossible d'extraire le contenu de l'article."}), 400
    else:
        return jsonify({"error": "Aucune URL fournie"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
