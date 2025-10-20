const express = require('express');
const app = express();
const cors = require('cors');

// ¡¡¡NO USAMOS DOTENV AQUÍ!!!

app.use(express.json());
app.use(cors());

// Ruta de Diagnóstico
app.post('/api/recommendation', (req, res) => {
    try {
        console.log("--- INICIANDO RUTA DE DIAGNÓSTICO ---");

        const openaiKeyExists = !!process.env.OPENAI_API_KEY;
        const shopifyNameExists = !!process.env.SHOPIFY_SHOP_NAME;
        const shopifyKeyExists = !!process.env.SHOPIFY_API_KEY;

        console.log("Variable OPENAI_API_KEY existe:", openaiKeyExists);
        console.log("Variable SHOPIFY_SHOP_NAME existe:", shopifyNameExists);
        console.log("Variable SHOPIFY_API_KEY existe:", shopifyKeyExists);

        if (!openaiKeyExists || !shopifyNameExists || !shopifyKeyExists) {
            console.error("¡¡¡ALERTA!!! Una o más variables de entorno FALTAN.");
            // Devolvemos un error claro para verlo en la consola del navegador
            return res.status(500).json({ 
                error: 'Error de configuración del servidor.',
                details: {
                    openai: openaiKeyExists,
                    shopifyName: shopifyNameExists,
                    shopifyKey: shopifyKeyExists
                }
            });
        }

        console.log("--- TODAS LAS VARIABLES EXISTEN. El problema es otro. ---");

        // Devolvemos una respuesta de éxito para confirmar que la ruta funciona
        res.json({ reply: '¡Hola! La ruta de diagnóstico funciona y todas las variables de entorno fueron encontradas. El problema está en la lógica de la API.' });

    } catch (error) {
        console.error("ERROR CATASTRÓFICO:", error);
        res.status(500).json({ error: 'Hubo un error muy grave en el servidor.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor de diagnóstico escuchando en el puerto ${PORT}`);
});