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
        console.log("Recibida una nueva petición...");
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún mensaje.' });
        }
        console.log("Mensaje del usuario:", userMessage);
        console.log("Obteniendo productos de Shopify...");
        const products = await shopify.product.list({ status: 'active', limit: 100 });
        const formattedProducts = products.map(p => 
            `Nombre: ${p.title}, Precio: ${p.variants[0].price}, Descripción: ${p.body_html.replace(/<[^>]*>/g, '').substring(0, 150)}..., Tags: ${p.tags}`
        ).join('\n- ');
        console.log("Productos formateados para la IA.");
        const systemPrompt = `
            Eres un sommelier virtual experto, amigable y apasionado llamado "VinoBot".
            Tu única tarea es analizar la petición de un cliente y recomendar el MEJOR vino de la lista de productos disponibles que te proporciono.
            - NUNCA inventes un vino ni recomiendes algo que no esté en la lista.
            - Tu respuesta debe ser concisa, en un solo párrafo, y en un tono cálido y profesional.
            - Explica brevemente por qué tu recomendación es una buena elección para el cliente.
            - Al final de tu recomendación, menciona claramente el nombre del vino y su precio.
            - Responde siempre en español.
        `;
        const userPrompt = `
            **Lista de Vinos Disponibles en nuestra tienda:**
            - ${formattedProducts}

            ---

            **Petición del Cliente:**
            "${userMessage}"
        `;
        console.log("Enviando petición a OpenAI...");
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        });
        const aiResponse = completion.choices[0].message.content;
        console.log("Respuesta recibida de OpenAI:", aiResponse);
        res.json({ reply: aiResponse });
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        res.status(500).json({ error: 'Hubo un problema al procesar tu solicitud.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`El servidor del Sommelier Cerebro está escuchando en el puerto ${PORT}`);
});