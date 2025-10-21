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
        
        // ¡Línea crucial! Obtenemos los productos de Shopify.
        const products = await shopify.product.list({ status: 'active', limit: 100 });
        
        const formattedProducts = products.map(p => 
            `Nombre: ${p.title}, Handle: ${p.handle}, Precio: ${p.variants[0].price}, Descripción: ${p.body_html.replace(/<[^>]*>/g, '').substring(0, 150)}..., Tags: ${p.tags}`
        ).join('\n- ');

        const systemPrompt = `
            Eres un sommelier virtual experto, amigable y apasionado llamado "Xavier".
            Tu tarea es analizar la petición de un cliente y recomendar entre 2 y 3 de los MEJORES vinos de la lista de productos disponibles.
            Tu respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional antes o después. NUNCA respondas con texto plano.
            El objeto JSON debe tener una clave "recomendaciones" que contenga un array de objetos.
            Cada objeto debe tener tres claves: "nombre" (el nombre del vino), "handle" (el handle del producto correspondiente de la lista), y "explicacion" (un párrafo corto, cálido y profesional explicando por qué es una buena elección).
            
            Ejemplo de formato de respuesta:
            {
              "recomendaciones": [
                {
                  "nombre": "Cloudy Bay Sauvignon Blanc 2022",
                  "handle": "cloudy-bay-sauvignon-blanc-2022",
                  "explicacion": "Este vino es perfecto para tu ensalada por sus notas cítricas y frescas que complementarán los mariscos..."
                },
                {
                  "nombre": "Whispering Angel Rosé 2022",
                  "handle": "whispering-angel-rose-2022",
                  "explicacion": "Una alternativa refrescante sería este rosado, que con sus notas a fresa y melocotón ofrece un contrapunto delicioso..."
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
            model: "gpt-3.5-turbo-1106", // Usamos un modelo que soporta JSON mode
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        });

        // Parseamos la respuesta JSON de la IA
        const aiJsonResponse = JSON.parse(completion.choices[0].message.content);

        // Creamos los URLs completos para cada recomendación
        const recomendacionesConUrl = aiJsonResponse.recomendaciones.map(rec => {
          return {
            ...rec, // Mantenemos nombre, handle, y explicacion
            url: `https://be716a-ba.myshopify.com/products/${rec.handle}` // Construimos la URL
          };
        });

        console.log("Respuesta final enviada al frontend:", recomendacionesConUrl);

        // Enviamos el array de recomendaciones con URLs al frontend
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