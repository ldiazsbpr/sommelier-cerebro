// Cargar las herramientas que instalamos
const express = require('express');
const Shopify = require('shopify-api-node');
const OpenAI = require('openai');
const cors = require('cors');
require('dotenv').config();

// Configurar nuestras herramientas
const app = express();
app.use(express.json());
app.use(cors());

// Inicializar el cliente de OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Inicializar el cliente de Shopify
const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_API_KEY
});

// Definir la ruta principal de nuestra API
app.post('/api/recommendation', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún mensaje.' });
        }
        
        const products = await shopify.product.list({ status: 'active', limit: 100 });
        
        // Modificado para incluir la URL de la imagen (p.image?.src)
        const formattedProducts = products.map(p => 
            `Nombre: ${p.title}, Handle: ${p.handle}, Imagen: ${p.image?.src}, Precio: ${p.variants[0].price}, Descripción: ${p.body_html.replace(/<[^>]*>/g, '').substring(0, 150)}..., Tags: ${p.tags}`
        ).join('\n- ');

        // Modificado para pedir la "imagen" en la respuesta JSON
        const systemPrompt = `
            Eres un sommelier virtual experto, amigable y apasionado llamado "Xavier".
            Tu tarea es analizar la petición de un cliente y recomendar entre 2 y 3 de los MEJORES vinos de la lista de productos disponibles.
            Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional antes o después. NUNCA respondas con texto plano.
            El objeto JSON debe tener una clave "recomendaciones" que contenga un array de objetos.
            Cada objeto debe tener cuatro claves: "nombre", "handle", "imagen" (la URL de la imagen del producto), y "explicacion".
            
            Ejemplo de formato de respuesta:
            {
              "recomendaciones": [
                {
                  "nombre": "Cloudy Bay Sauvignon Blanc 2022",
                  "handle": "cloudy-bay-sauvignon-blanc-2022",
                  "imagen": "https://cdn.shopify.com/..../imagen.jpg",
                  "explicacion": "Este vino es perfecto para tu ensalada..."
                }
              ]
            }
        `;
        
        const userPrompt = `
            **Lista de Vinos Disponibles en nuestra tienda:**
            - ${formattedProducts}

            ---

            **Petición del Cliente:**
            "${userMessage}"
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        });

        const aiJsonResponse = JSON.parse(completion.choices[0].message.content);

        const recomendacionesConUrl = aiJsonResponse.recomendaciones.map(rec => {
          return {
            ...rec,
            url: `https://be716a-ba.myshopify.com/products/${rec.handle}`
          };
        });

        console.log("Respuesta final enviada al frontend:", recomendacionesConUrl);

        res.json({ recomendaciones: recomendacionesConUrl });

    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        res.status(500).json({ error: 'Hubo un problema al procesar tu solicitud.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`El servidor del Sommelier Cerebro está escuchando en el puerto ${PORT}`);
});